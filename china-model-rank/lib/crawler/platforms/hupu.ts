import * as cheerio from "cheerio";
import type { CrawlTarget, RawCrawlItem, SourceAdapter } from "@/lib/crawler/types";

type HupuSearchItem = {
  id?: string;
  title?: string;
  content?: string;
  username?: string;
  addTimeDisplay?: string;
  addtime?: string;
  replies?: string;
  lights?: string;
  recNum?: string;
  forum_name?: string;
};

type HupuSearchData = {
  searchRes?: {
    data?: HupuSearchItem[];
  };
};

function stripHtml(text: string) {
  return cheerio.load(text).text().replace(/\s+/g, " ").trim();
}

function parseNumber(value: string | undefined) {
  return Number(value ?? 0) || 0;
}

function parsePublishedAt(item: HupuSearchItem) {
  if (item.addtime) {
    return new Date(Number(item.addtime) * 1000).toISOString();
  }

  if (item.addTimeDisplay) {
    return new Date(`${item.addTimeDisplay}T00:00:00+08:00`).toISOString();
  }

  return new Date().toISOString();
}

function extractSearchData(html: string): HupuSearchData | null {
  const marker = "window.$$data=";
  const start = html.indexOf(marker);
  if (start < 0) {
    return null;
  }

  const body = html.slice(start + marker.length);
  const end = body.indexOf("</script>");
  if (end < 0) {
    return null;
  }

  try {
    return JSON.parse(body.slice(0, end));
  } catch {
    return null;
  }
}

function toRawItem(target: CrawlTarget, item: HupuSearchItem): RawCrawlItem | null {
  if (!item.id || !item.title) {
    return null;
  }

  const title = stripHtml(item.title);
  const content = stripHtml(item.content ?? "");
  const text = content ? `${title} ${content}` : title;
  const replies = parseNumber(item.replies);
  const lights = parseNumber(item.lights);
  const recNum = parseNumber(item.recNum);
  const engagementMetrics = [
    { key: "hupu_recommend", label: "推荐", value: recNum, unit: "次", positive: true },
    { key: "hupu_light", label: "亮评", value: lights, unit: "条", positive: true },
    { key: "hupu_reply", label: "回复", value: replies, unit: "条", positive: false }
  ];

  return {
    platform: "hupu",
    modelId: target.modelId,
    sourceUrl: `https://bbs.hupu.com/${item.id}.html`,
    sourceTitle: `虎扑帖子：${title}`,
    title,
    text,
    authorLabel: item.username ? `虎扑用户：${item.username}` : "虎扑用户",
    publishedAt: parsePublishedAt(item),
    engagement: engagementMetrics.reduce((sum, metric) => sum + metric.value, 0),
    engagementMetrics,
    positiveSignals: [
      `推荐 ${recNum.toLocaleString("zh-CN")}`,
      `亮评 ${lights.toLocaleString("zh-CN")}`,
      `回复 ${replies.toLocaleString("zh-CN")}`
    ]
  };
}

export const hupuAdapter: SourceAdapter = {
  platform: "hupu",
  async fetchItems(target: CrawlTarget) {
    const response = await fetch(target.url, {
      headers: {
        "user-agent": process.env.CRAWLER_USER_AGENT ?? "Mozilla/5.0 ChinaModelRankBot/0.1",
        referer: "https://bbs.hupu.com/"
      }
    });

    if (!response.ok) {
      throw new Error(`hupu search failed: ${response.status}`);
    }

    const html = await response.text();
    const searchData = extractSearchData(html);
    const items = searchData?.searchRes?.data ?? [];

    return items
      .map((item) => toRawItem(target, item))
      .filter((item): item is RawCrawlItem => Boolean(item))
      .slice(0, 20);
  }
};
