import { describe, expect, it } from "vitest";
import { buildCrawlTargets, buildModelKeywords } from "@/lib/crawler/keyword-plan";
import { rankedModelsData, vendors } from "@/lib/data";

describe("crawler keyword plan", () => {
  it("expands aliases and scenario terms", () => {
    const model = rankedModelsData.find((item) => item.id === "deepseek-r1");
    expect(model).toBeTruthy();

    const keywords = buildModelKeywords(model!, vendors.find((vendor) => vendor.id === model!.vendorId));
    expect(keywords).toContain("DeepSeek");
    expect(keywords).toContain("DeepSeek 推理");
    expect(keywords.some((keyword) => keyword.includes("价格"))).toBe(true);
    expect(keywords.some((keyword) => keyword.includes("使用感受"))).toBe(true);
    expect(keywords.some((keyword) => keyword.includes("实际使用"))).toBe(true);
    expect(keywords.some((keyword) => keyword.includes("解决问题"))).toBe(true);
  });

  it("builds targets for major domestic social platforms", () => {
    const targets = buildCrawlTargets({
      models: rankedModelsData.slice(0, 1),
      vendors,
      platforms: ["zhihu", "xiaohongshu", "weibo", "douyin", "hupu", "tieba", "bilibili"]
    });
    expect(new Set(targets.map((target) => target.platform))).toEqual(
      new Set(["zhihu", "xiaohongshu", "weibo", "douyin", "hupu", "tieba", "bilibili"])
    );
    expect(targets[0]?.url).toMatch(/^https:\/\//);
  });
});
