import { describe, expect, it } from "vitest";
import { normalizeRawItem } from "@/lib/crawler/normalize";

describe("crawler normalization", () => {
  it("normalizes raw items into pending reviews", () => {
    const review = normalizeRawItem({
      platform: "media",
      modelId: "qwen-max",
      sourceUrl: "https://example.com/qwen",
      title: "Qwen 很强",
      text: "中文任务稳定，生态好用。",
      authorLabel: "公开页面",
      publishedAt: "2026-05-15",
      engagement: 0,
      engagementMetrics: [
        { key: "media_like", label: "点赞", value: 12, unit: "次", positive: true }
      ],
      positiveSignals: ["公开页面正向"]
    });

    expect(review.auditStatus).toBe("pending");
    expect(review.sentiment).toBe("positive");
    expect(review.modelId).toBe("qwen-max");
    expect(review.isExample).toBe(false);
    expect(review.sourceUrl).toBe("https://example.com/qwen");
    expect(review.engagementMetrics[0]?.label).toBe("点赞");
    expect(review.positiveSignals).toContain("公开页面正向");
  });
});
