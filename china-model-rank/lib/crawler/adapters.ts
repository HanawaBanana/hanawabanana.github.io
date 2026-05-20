import * as cheerio from "cheerio";
import type { CrawlTarget, RawCrawlItem, SourceAdapter } from "@/lib/crawler/types";
import { bilibiliAdapter } from "@/lib/crawler/platforms/bilibili";
import { hupuAdapter } from "@/lib/crawler/platforms/hupu";
import { weiboAdapter } from "@/lib/crawler/platforms/weibo";
import { zhihuAdapter } from "@/lib/crawler/platforms/zhihu";

function excerpt(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 180);
}

export const publicPageAdapter: SourceAdapter = {
  platform: "media",
  async fetchItems(target: CrawlTarget): Promise<RawCrawlItem[]> {
    const response = await fetch(target.url, {
      headers: {
        "user-agent": process.env.CRAWLER_USER_AGENT ?? "ChinaModelRankBot/0.1"
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${target.url}: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const title = $("title").first().text() || target.keyword;
    const bodyText = excerpt($("body").text());

    return [
      {
        platform: target.platform,
        modelId: target.modelId,
        sourceUrl: target.url,
        title,
        text: bodyText,
        authorLabel: "公开页面",
        publishedAt: new Date().toISOString(),
        engagement: 0
      }
    ];
  }
};

export const adapterRegistry: Partial<Record<CrawlTarget["platform"], SourceAdapter>> = {
  media: publicPageAdapter,
  zhihu: zhihuAdapter,
  bilibili: bilibiliAdapter,
  hupu: hupuAdapter,
  weibo: weiboAdapter
};
