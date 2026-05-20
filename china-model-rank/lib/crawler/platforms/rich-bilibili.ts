import { metric, normalizeSpace, stableHash, topByEngagement } from "@/lib/crawler/rich-utils";
import type { CrawledComment, CrawledPost, CrawledPostWarning, CrawledReply, RichCrawlTarget, RichPlatformAdapter } from "@/lib/crawler/rich-types";

type SearchPayload = {
  code: number;
  message?: string;
  data?: {
    result?: Array<{ bvid?: string; title?: string; description?: string; author?: string }>;
  };
};

type ViewPayload = {
  code: number;
  message?: string;
  data?: {
    aid: number;
    bvid: string;
    title: string;
    desc?: string;
    pubdate: number;
    owner?: { name?: string; mid?: number };
    stat?: { view?: number; like?: number; favorite?: number; coin?: number; reply?: number; share?: number };
  };
};

type ReplyPayload = {
  code: number;
  message?: string;
  data?: {
    replies?: BilibiliReply[];
  };
};

type BilibiliReply = {
  rpid: number;
  ctime: number;
  like?: number;
  content?: { message?: string };
  member?: { uname?: string; mid?: string };
  replies?: BilibiliReply[];
};

const bvidPattern = /BV[0-9A-Za-z]{10}/g;
const browserUserAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

function uniqueBvids(text: string) {
  return [...new Set(text.match(bvidPattern) ?? [])];
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      "user-agent": process.env.CRAWLER_USER_AGENT ?? browserUserAgent,
      referer: "https://www.bilibili.com/",
      "accept-language": "zh-CN,zh;q=0.9"
    }
  });

  if (!response.ok) {
    throw new Error(`bilibili API failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      "user-agent": process.env.CRAWLER_USER_AGENT ?? browserUserAgent,
      referer: "https://search.bilibili.com/",
      "accept-language": "zh-CN,zh;q=0.9"
    }
  });

  if (!response.ok) {
    throw new Error(`bilibili page failed: ${response.status}`);
  }

  return response.text();
}

async function searchBvidsFromPage(keyword: string) {
  const url = new URL("https://search.bilibili.com/all");
  url.searchParams.set("keyword", keyword);
  const html = await fetchText(url.toString());
  return uniqueBvids(html).slice(0, 5);
}

async function searchBvids(keyword: string) {
  const url = new URL("https://api.bilibili.com/x/web-interface/search/type");
  url.searchParams.set("search_type", "video");
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("page", "1");
  try {
    const payload = await fetchJson<SearchPayload>(url.toString());
    if (payload.code !== 0) {
      throw new Error(`bilibili search invalid response: ${payload.message ?? payload.code}`);
    }

    const ids = [...new Set((payload.data?.result ?? []).flatMap((item) => [
      ...(item.bvid ? [item.bvid] : []),
      ...uniqueBvids(`${item.title ?? ""} ${item.description ?? ""}`)
    ]))].slice(0, 5);
    if (ids.length > 0) {
      return ids;
    }
  } catch {
    // B站搜索 API 偶发返回 412；普通搜索页里仍能提取真实内容页 BV 号。
  }

  return searchBvidsFromPage(keyword);
}

function replyToComment(videoUrl: string, reply: BilibiliReply): CrawledComment {
  const content = normalizeSpace(reply.content?.message ?? "");
  const replies = topByEngagement(
    (reply.replies ?? []).map((item): CrawledReply => ({
      id: `bilibili-reply-${item.rpid}`,
      author: { label: item.member?.uname ? `B站用户：${item.member.uname}` : "B站用户" },
      content: normalizeSpace(item.content?.message ?? ""),
      sourceUrl: `${videoUrl}#reply${item.rpid}`,
      publishedAt: item.ctime ? new Date(item.ctime * 1000).toISOString() : undefined,
      engagementMetrics: [metric("bilibili_reply_like", "点赞", item.like ?? 0, true)]
    })).filter((item) => item.content.length > 0),
    3
  );

  return {
    id: `bilibili-comment-${reply.rpid}`,
    author: { label: reply.member?.uname ? `B站用户：${reply.member.uname}` : "B站用户" },
    content,
    sourceUrl: `${videoUrl}#reply${reply.rpid}`,
    publishedAt: reply.ctime ? new Date(reply.ctime * 1000).toISOString() : undefined,
    engagementMetrics: [metric("bilibili_comment_like", "点赞", reply.like ?? 0, true)],
    replies
  };
}

async function fetchComments(aid: number, videoUrl: string): Promise<{ comments: CrawledComment[]; warnings: CrawledPostWarning[] }> {
  const url = new URL("https://api.bilibili.com/x/v2/reply/main");
  url.searchParams.set("type", "1");
  url.searchParams.set("oid", String(aid));
  url.searchParams.set("mode", "3");
  url.searchParams.set("ps", "20");
  let payload: ReplyPayload;
  try {
    payload = await fetchJson<ReplyPayload>(url.toString());
  } catch (error) {
    return {
      comments: [],
      warnings: [{
        scope: "comments",
        reason: "unknown",
        message: error instanceof Error ? error.message : "B站评论接口抓取失败"
      }]
    };
  }

  if (payload.code !== 0) {
    return {
      comments: [],
      warnings: [{
        scope: "comments",
        reason: ["-352", "-412", "412"].includes(String(payload.code)) ? "rate_limit" : "unknown",
        message: `B站评论接口未返回热评：${payload.message ?? payload.code}`
      }]
    };
  }

  return {
    comments: topByEngagement(
      (payload.data?.replies ?? [])
        .map((reply) => replyToComment(videoUrl, reply))
        .filter((comment) => comment.content.length > 0),
      10
    ),
    warnings: []
  };
}

async function fetchPost(target: RichCrawlTarget, bvid: string): Promise<CrawledPost> {
  const payload = await fetchJson<ViewPayload>(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`);
  if (payload.code !== 0 || !payload.data?.stat) {
    throw new Error(`bilibili view invalid response: ${payload.message ?? payload.code}`);
  }

  const data = payload.data;
  const stat = data.stat ?? {};
  const sourceUrl = `https://www.bilibili.com/video/${data.bvid}`;
  const commentResult = await fetchComments(data.aid, sourceUrl);

  return {
    id: `bilibili-${data.bvid}`,
    platform: "bilibili",
    modelId: target.modelId,
    keyword: target.keyword,
    title: normalizeSpace(data.title),
    content: normalizeSpace(data.desc || data.title),
    sourceUrl,
    sourceTitle: `B站视频：${data.title}`,
    author: { label: data.owner?.name ? `B站创作者：${data.owner.name}` : "B站创作者" },
    publishedAt: new Date(data.pubdate * 1000).toISOString(),
    collectedAt: new Date().toISOString(),
    engagementMetrics: [
      metric("bilibili_view", "播放", stat.view ?? 0, true),
      metric("bilibili_like", "点赞", stat.like ?? 0, true),
      metric("bilibili_favorite", "收藏", stat.favorite ?? 0, true),
      metric("bilibili_coin", "投币", stat.coin ?? 0, true),
      metric("bilibili_reply", "评论", stat.reply ?? 0, false, "条")
    ],
    comments: commentResult.comments,
    warnings: commentResult.warnings
  };
}

export const richBilibiliAdapter: RichPlatformAdapter = {
  platform: "bilibili",
  async searchPosts(target) {
    const bvids = uniqueBvids(`${target.keyword} ${target.url}`);
    const ids = bvids.length > 0 ? bvids : await searchBvids(target.keyword);
    const posts = await Promise.allSettled(ids.map((bvid) => fetchPost(target, bvid)));
    return posts
      .filter((result): result is PromiseFulfilledResult<CrawledPost> => result.status === "fulfilled")
      .map((result) => ({ ...result.value, id: `${result.value.id}-${stableHash(`${target.modelId}:${result.value.sourceUrl}`)}` }));
  }
};
