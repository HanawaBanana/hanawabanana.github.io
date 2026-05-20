import type { CrawlTarget, PendingMcpTask, RawCrawlItem } from "@/lib/crawler/types";
import type { PlatformKey } from "@/lib/types";

type ApiItem = {
  sourceUrl?: string;
  sourceTitle?: string;
  title?: string;
  text?: string;
  authorLabel?: string;
  publishedAt?: string;
  engagementMetrics?: Array<{ key: string; label: string; value: number; unit?: string; positive?: boolean }>;
  positiveSignals?: string[];
};

export function createPendingMcpTask(platform: PlatformKey, target: CrawlTarget, reason: string): PendingMcpTask {
  const requiredMetrics: Partial<Record<PlatformKey, string[]>> = {
    zhihu: ["赞同", "收藏", "评论"],
    xiaohongshu: ["点赞", "收藏", "评论"],
    weibo: ["点赞", "转发", "评论"],
    douyin: ["点赞", "收藏", "评论"],
    hupu: ["亮了", "回复", "浏览"],
    tieba: ["回复", "点赞", "浏览"],
    bilibili: ["播放", "点赞", "收藏", "投币"]
  };

  return {
    platform,
    modelId: target.modelId,
    keyword: target.keyword,
    searchUrl: target.url,
    reason,
    requiredMetrics: requiredMetrics[platform]
  };
}

export async function fetchThirdPartyApi(input: {
  endpoint?: string;
  apiKey?: string;
  platform: PlatformKey;
  target: CrawlTarget;
}): Promise<RawCrawlItem[] | null> {
  if (!input.endpoint || !input.apiKey) {
    return null;
  }

  const url = new URL(input.endpoint);
  url.searchParams.set("platform", input.platform);
  url.searchParams.set("keyword", input.target.keyword);
  url.searchParams.set("url", input.target.url);

  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${input.apiKey}`,
      "user-agent": process.env.CRAWLER_USER_AGENT ?? "ChinaModelRankBot/0.1"
    }
  });

  if (!response.ok) {
    throw new Error(`${input.platform} API failed: ${response.status}`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload.items) ? (payload.items as ApiItem[]) : [];

  return items
    .filter((item) => item.sourceUrl && item.text)
    .map((item) => {
      const engagementMetrics = (item.engagementMetrics ?? []).map((metric) => ({
        key: metric.key,
        label: metric.label,
        value: Number(metric.value) || 0,
        unit: metric.unit ?? "次",
        positive: metric.positive ?? true
      }));

      return {
        platform: input.platform,
        modelId: input.target.modelId,
        sourceUrl: item.sourceUrl ?? input.target.url,
        sourceTitle: item.sourceTitle ?? item.title ?? input.target.keyword,
        title: item.title ?? input.target.keyword,
        text: item.text ?? "",
        authorLabel: item.authorLabel ?? "公开用户",
        publishedAt: item.publishedAt ?? new Date().toISOString(),
        engagement: engagementMetrics.reduce((sum, metric) => sum + metric.value, 0),
        engagementMetrics,
        positiveSignals: item.positiveSignals ?? []
      };
    });
}
