import { describe, expect, it } from "vitest";
import { clampQuote, createPublicReview, formatMetric, totalEngagement } from "@/lib/review-evidence";

describe("review evidence", () => {
  it("limits short quotes to the configured length", () => {
    expect(clampQuote("一".repeat(100), 80)).toHaveLength(80);
    expect(clampQuote("一".repeat(100), 80).endsWith("…")).toBe(true);
  });

  it("keeps platform metric names transparent", () => {
    const metric = { key: "zhihu_upvote", label: "赞同", value: 1234, unit: "次", positive: true };
    expect(formatMetric(metric)).toBe("赞同 1,234次");
  });

  it("marks public source reviews as non-example and computes engagement", () => {
    const review = createPublicReview({
      id: "rv",
      modelId: "m",
      platform: "zhihu",
      authorLabel: "用户",
      title: "标题",
      sourceTitle: "来源标题",
      excerpt: "公开来源中的短摘录",
      url: "https://example.com",
      publishedAt: "2026-05-01",
      sentiment: "positive",
      confidence: 0.8,
      topics: ["userReputation"],
      engagementMetrics: [
        { key: "a", label: "赞同", value: 10, unit: "次", positive: true },
        { key: "b", label: "收藏", value: 5, unit: "次", positive: true }
      ],
      positiveSignals: ["高赞"],
      auditStatus: "approved"
    });

    expect(review.isExample).toBe(false);
    expect(review.sourceUrl).toBe("https://example.com");
    expect(review.engagement).toBe(totalEngagement(review.engagementMetrics));
  });
});
