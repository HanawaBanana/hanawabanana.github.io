import type { CrawlTarget, SourceAdapter } from "@/lib/crawler/types";
import { fetchThirdPartyApi } from "@/lib/crawler/platforms/shared";

type BilibiliVideoPayload = {
  code: number;
  message?: string;
  data?: {
    bvid: string;
    title: string;
    pubdate: number;
    desc?: string;
    owner?: { name?: string };
    stat?: {
      view?: number;
      like?: number;
      favorite?: number;
      coin?: number;
      reply?: number;
      danmaku?: number;
      share?: number;
    };
  };
};

type BilibiliSearchPayload = {
  code: number;
  message?: string;
  data?: {
    result?: Array<{
      bvid?: string;
      title?: string;
      description?: string;
      author?: string;
    }>;
  };
};

const bvidPattern = /BV[0-9A-Za-z]{10}/g;

function uniqueBvids(text: string): string[] {
  return [...new Set(text.match(bvidPattern) ?? [])];
}

function stripHtml(text: string) {
  return text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function positiveSignals(stat: NonNullable<NonNullable<BilibiliVideoPayload["data"]>["stat"]>): string[] {
  const signals = [];
  if (stat.view) signals.push(`播放 ${stat.view.toLocaleString("zh-CN")}`);
  if (stat.like) signals.push(`点赞 ${stat.like.toLocaleString("zh-CN")}`);
  if (stat.favorite) signals.push(`收藏 ${stat.favorite.toLocaleString("zh-CN")}`);
  return signals.slice(0, 3);
}

export async function fetchBilibiliVideoByBvid(target: CrawlTarget, bvid: string) {
  const response = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
    headers: {
      "user-agent": process.env.CRAWLER_USER_AGENT ?? "Mozilla/5.0 ChinaModelRankBot/0.1",
      referer: "https://www.bilibili.com/"
    }
  });

  if (!response.ok) {
    throw new Error(`bilibili view API failed: ${response.status}`);
  }

  const payload = (await response.json()) as BilibiliVideoPayload;
  if (payload.code !== 0 || !payload.data?.stat) {
    throw new Error(`bilibili view API invalid response: ${payload.message ?? payload.code}`);
  }

  const data = payload.data;
  const stat = data.stat;
  if (!stat) {
    throw new Error("bilibili view API missing stat");
  }
  const engagementMetrics = [
    { key: "bilibili_view", label: "播放", value: stat.view ?? 0, unit: "次", positive: true },
    { key: "bilibili_like", label: "点赞", value: stat.like ?? 0, unit: "次", positive: true },
    { key: "bilibili_favorite", label: "收藏", value: stat.favorite ?? 0, unit: "次", positive: true },
    { key: "bilibili_coin", label: "投币", value: stat.coin ?? 0, unit: "次", positive: true },
    { key: "bilibili_reply", label: "评论", value: stat.reply ?? 0, unit: "条", positive: false }
  ];

  return {
    platform: "bilibili" as const,
    modelId: target.modelId,
    sourceUrl: `https://www.bilibili.com/video/${data.bvid}`,
    sourceTitle: `B站视频：${data.title}`,
    title: data.title,
    text: data.desc || data.title,
    authorLabel: data.owner?.name ? `B站创作者：${data.owner.name}` : "B站创作者",
    publishedAt: new Date(data.pubdate * 1000).toISOString(),
    engagement: engagementMetrics.reduce((sum, metric) => sum + metric.value, 0),
    engagementMetrics,
    positiveSignals: positiveSignals(stat)
  };
}

async function searchBilibiliBvids(keyword: string): Promise<string[]> {
  const url = new URL("https://api.bilibili.com/x/web-interface/search/type");
  url.searchParams.set("search_type", "video");
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("page", "1");

  const response = await fetch(url, {
    headers: {
      "user-agent": process.env.CRAWLER_USER_AGENT ?? "Mozilla/5.0 ChinaModelRankBot/0.1",
      referer: "https://search.bilibili.com/"
    }
  });

  if (!response.ok) {
    throw new Error(`bilibili search API failed: ${response.status}`);
  }

  const payload = (await response.json()) as BilibiliSearchPayload;
  if (payload.code !== 0) {
    throw new Error(`bilibili search API invalid response: ${payload.message ?? payload.code}`);
  }

  return [
    ...new Set(
      (payload.data?.result ?? [])
        .flatMap((item) => [
          ...(item.bvid ? [item.bvid] : []),
          ...uniqueBvids(`${item.title ?? ""} ${item.description ?? ""}`)
        ])
        .slice(0, 8)
    )
  ];
}

export const bilibiliAdapter: SourceAdapter = {
  platform: "bilibili",
  async fetchItems(target: CrawlTarget) {
    const bvids = uniqueBvids(`${target.keyword} ${target.url}`);
    if (bvids.length > 0) {
      return Promise.all(bvids.map((bvid) => fetchBilibiliVideoByBvid(target, bvid)));
    }

    const searchedBvids = await searchBilibiliBvids(target.keyword);
    if (searchedBvids.length > 0) {
      const items = await Promise.all(searchedBvids.map((bvid) => fetchBilibiliVideoByBvid(target, bvid)));
      return items.map((item) => ({
        ...item,
        text: stripHtml(`${item.title} ${item.text}`)
      }));
    }

    return (
      (await fetchThirdPartyApi({
        endpoint: process.env.CRAWLER_DATA_API_ENDPOINT,
        apiKey: process.env.CRAWLER_DATA_API_KEY,
        platform: "bilibili",
        target
      })) ?? []
    );
  }
};
