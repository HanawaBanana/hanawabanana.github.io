import { describe, expect, it } from "vitest";
import { dedupeRawItems, isRelevantToModel, qualityScore, selectTopReputation } from "@/lib/crawler/filter";
import type { RawCrawlItem } from "@/lib/crawler/types";
import { rankedModelsData } from "@/lib/data";

const qwen = rankedModelsData.find((model) => model.id === "qwen-max")!;

function item(partial: Partial<RawCrawlItem>): RawCrawlItem {
  return {
    platform: "zhihu",
    modelId: "qwen-max",
    sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNENY",
    title: "通义千问 Qwen 评测",
    text: "通义千问 Qwen 在代码和中文问答里表现稳定，工具调用也好用。",
    authorLabel: "用户",
    publishedAt: "2026-05-16",
    engagement: 100,
    engagementMetrics: [{ key: "zhihu_upvote", label: "赞同", value: 100, unit: "次", positive: true }],
    positiveSignals: ["高赞回答"],
    ...partial
  };
}

describe("crawler filter", () => {
  it("checks relevance by aliases", () => {
    expect(isRelevantToModel(item({}), qwen)).toBe(true);
    expect(isRelevantToModel(item({ title: "无关内容", text: "这个内容不提模型" }), qwen)).toBe(false);
  });

  it("dedupes by source url", () => {
    expect(dedupeRawItems([item({}), item({ title: "duplicate" })])).toHaveLength(1);
  });

  it("selects top two reputation items per model", () => {
    const selected = selectTopReputation({
      models: [qwen],
      items: [
        item({ sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNEN1", engagement: 10 }),
        item({ sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNEN2", engagement: 2000, engagementMetrics: [{ key: "like", label: "赞同", value: 2000, unit: "次", positive: true }] }),
        item({ sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNEN3", text: "太短" })
      ],
      perModel: 2
    });

    expect(selected).toHaveLength(2);
    expect(selected[0]?.sourceUrl).toBe("https://www.bilibili.com/video/BV1a8AnzNEN2");
  });

  it("selects reputation items per model and platform when requested", () => {
    const selected = selectTopReputation({
      models: [qwen],
      items: [
        item({ sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNEN1", platform: "bilibili", engagement: 10 }),
        item({ sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNEN2", platform: "bilibili", engagement: 20 }),
        item({ sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNEN3", platform: "bilibili", engagement: 30 }),
        item({ sourceUrl: "https://bbs.hupu.com/630460500.html", platform: "hupu", engagement: 40 }),
        item({ sourceUrl: "https://bbs.hupu.com/630624980.html", platform: "hupu", engagement: 50 })
      ],
      perModelPlatform: 2
    });

    expect(selected.filter((review) => review.platform === "bilibili")).toHaveLength(2);
    expect(selected.filter((review) => review.platform === "hupu")).toHaveLength(2);
  });

  it("excludes search result pages from selected reputation", () => {
    const selected = selectTopReputation({
      models: [qwen],
      items: [
        item({
          sourceUrl: "https://www.zhihu.com/search?type=content&q=%E9%80%9A%E4%B9%89",
          engagement: 5000,
          engagementMetrics: [{ key: "like", label: "赞同", value: 5000, unit: "次", positive: true }]
        }),
        item({
          sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNEN4",
          engagement: 20,
          engagementMetrics: [{ key: "like", label: "赞同", value: 20, unit: "次", positive: true }]
        })
      ],
      perModel: 2
    });

    expect(selected.map((review) => review.sourceUrl)).toEqual(["https://www.bilibili.com/video/BV1a8AnzNEN4"]);
  });

  it("scores higher quality items higher", () => {
    expect(qualityScore(item({ engagement: 1000 }))).toBeGreaterThan(qualityScore(item({ engagement: 1, engagementMetrics: [] })));
  });
});
