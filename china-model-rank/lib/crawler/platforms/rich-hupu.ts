import * as cheerio from "cheerio";
import { metric, normalizeSpace, stableHash, stripHtml, topByEngagement } from "@/lib/crawler/rich-utils";
import type { CrawledComment, CrawledPost, CrawledReply, RichCrawlTarget, RichPlatformAdapter } from "@/lib/crawler/rich-types";

type SearchData = {
  searchRes?: {
    data?: Array<{
      id?: string;
      title?: string;
      content?: string;
      username?: string;
      addtime?: string;
      addTimeDisplay?: string;
      replies?: string;
      lights?: string;
      recNum?: string;
    }>;
  };
};

type HupuDetail = {
  thread?: {
    tid: string;
    title: string;
    content?: string;
    read?: number;
    recommend?: number;
    replies?: number;
    lights?: number;
    createdAt?: number;
    createdAtFormat?: string;
    author?: { puname?: string; url?: string };
    url?: string;
  };
  lights?: HupuReply[];
  replies?: {
    list?: HupuReply[];
  };
};

type HupuReply = {
  pid: string;
  content?: string;
  count?: number;
  allLightCount?: number;
  replyNum?: number;
  createdAt?: number;
  createdAtFormat?: string;
  author?: { puname?: string; url?: string };
  replies?: HupuReply[];
};

function extractJsonMarker<T>(html: string, marker: string): T | null {
  const start = html.indexOf(marker);
  if (start < 0) return null;
  const body = html.slice(start + marker.length);
  const end = body.indexOf("</script>");
  if (end < 0) return null;

  try {
    return JSON.parse(body.slice(0, end)) as T;
  } catch {
    return null;
  }
}

function extractNextData(html: string): HupuDetail | null {
  const $ = cheerio.load(html);
  const text = $("#__NEXT_DATA__").text();
  if (!text) return null;

  try {
    return JSON.parse(text).props?.pageProps?.detail ?? null;
  } catch {
    return null;
  }
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": process.env.CRAWLER_USER_AGENT ?? "Mozilla/5.0 ChinaModelRankBot/0.1",
      referer: "https://bbs.hupu.com/"
    }
  });

  if (!response.ok) {
    throw new Error(`hupu fetch failed: ${response.status}`);
  }

  return response.text();
}

function publishedAt(value?: number, fallback?: string) {
  if (value) return new Date(value).toISOString();
  if (fallback) return new Date(`${fallback}T00:00:00+08:00`).toISOString();
  return new Date().toISOString();
}

function replyToComment(sourceUrl: string, reply: HupuReply): CrawledComment {
  const content = stripHtml(reply.content ?? "");
  const replies = topByEngagement(
    (reply.replies ?? []).map((item): CrawledReply => ({
      id: `hupu-reply-${item.pid}`,
      author: { label: item.author?.puname ? `虎扑用户：${item.author.puname}` : "虎扑用户", profileUrl: item.author?.url },
      content: stripHtml(item.content ?? ""),
      sourceUrl: `${sourceUrl}#${item.pid}`,
      publishedAt: publishedAt(item.createdAt, item.createdAtFormat),
      engagementMetrics: [metric("hupu_reply_light", "亮了", item.allLightCount ?? item.count ?? 0, true)]
    })).filter((item) => item.content.length > 0),
    3
  );

  return {
    id: `hupu-comment-${reply.pid}`,
    author: { label: reply.author?.puname ? `虎扑用户：${reply.author.puname}` : "虎扑用户", profileUrl: reply.author?.url },
    content,
    sourceUrl: `${sourceUrl}#${reply.pid}`,
    publishedAt: publishedAt(reply.createdAt, reply.createdAtFormat),
    engagementMetrics: [
      metric("hupu_comment_light", "亮了", reply.allLightCount ?? reply.count ?? 0, true),
      metric("hupu_comment_reply", "回复", reply.replyNum ?? 0, false, "条")
    ],
    replies
  };
}

async function fetchPostDetail(target: RichCrawlTarget, postId: string): Promise<CrawledPost | null> {
  const sourceUrl = `https://bbs.hupu.com/${postId}.html`;
  const html = await fetchHtml(sourceUrl);
  const detail = extractNextData(html);
  const thread = detail?.thread;
  if (!thread) {
    return null;
  }

  const comments = topByEngagement(
    [...(detail?.lights ?? []), ...(detail?.replies?.list ?? [])]
      .map((reply) => replyToComment(sourceUrl, reply))
      .filter((comment) => comment.content.length > 0),
    10
  );

  return {
    id: `hupu-${thread.tid}-${stableHash(target.modelId)}`,
    platform: "hupu",
    modelId: target.modelId,
    keyword: target.keyword,
    title: normalizeSpace(thread.title),
    content: stripHtml(thread.content ?? thread.title),
    sourceUrl,
    sourceTitle: `虎扑帖子：${thread.title}`,
    author: { label: thread.author?.puname ? `虎扑用户：${thread.author.puname}` : "虎扑用户", profileUrl: thread.author?.url },
    publishedAt: publishedAt(thread.createdAt, thread.createdAtFormat),
    collectedAt: new Date().toISOString(),
    engagementMetrics: [
      metric("hupu_read", "浏览", thread.read ?? 0, true),
      metric("hupu_recommend", "推荐", thread.recommend ?? 0, true),
      metric("hupu_light", "亮了", thread.lights ?? 0, true),
      metric("hupu_reply", "回复", thread.replies ?? 0, false, "条")
    ],
    comments
  };
}

export const richHupuAdapter: RichPlatformAdapter = {
  platform: "hupu",
  async searchPosts(target) {
    const html = await fetchHtml(target.url);
    const searchData = extractJsonMarker<SearchData>(html, "window.$$data=");
    const ids = [...new Set((searchData?.searchRes?.data ?? []).map((item) => item.id).filter((id): id is string => Boolean(id)))].slice(0, 5);
    const posts = await Promise.allSettled(ids.map((id) => fetchPostDetail(target, id)));

    return posts
      .filter((result): result is PromiseFulfilledResult<CrawledPost | null> => result.status === "fulfilled")
      .map((result) => result.value)
      .filter((post): post is CrawledPost => Boolean(post));
  }
};
