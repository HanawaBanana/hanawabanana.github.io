import { describe, expect, it } from "vitest";
import { calculateReputationScore } from "@/lib/reputation-score";
import { buildPlatformReputation, reviewReputationScore } from "@/lib/scoring";
import type { NormalizedReview } from "@/lib/types";

function review(partial: Partial<NormalizedReview>): NormalizedReview {
  return {
    id: "r",
    modelId: "m",
    platform: "zhihu",
    authorLabel: "用户",
    title: "标题",
    excerpt: "这个模型很好用，稳定，适合写代码。",
    quote: "这个模型很好用，稳定，适合写代码。",
    quoteType: "excerpt",
    sourceTitle: "来源",
    url: "https://example.com",
    sourceUrl: "https://example.com",
    publishedAt: "2026-05-16",
    collectedAt: "2026-05-16",
    isExample: false,
    sentiment: "positive",
    confidence: 0.8,
    topics: ["userReputation"],
    useCaseMatches: ["coding"],
    engagement: 1000,
    engagementMetrics: [{ key: "like", label: "赞同", value: 1000, unit: "次", positive: true }],
    positiveSignals: ["高赞"],
    auditStatus: "approved",
    ...partial
  };
}

describe("reputation score", () => {
  it("scores reputation by equal-weighted qualified platform aggregates", () => {
    const reviews = [
      review({ id: "zhihu-a", platform: "zhihu", sourceUrl: "https://example.com/zhihu-a" }),
      review({ id: "zhihu-b", platform: "zhihu", sourceUrl: "https://example.com/zhihu-b" }),
      review({ id: "zhihu-c", platform: "zhihu", sourceUrl: "https://example.com/zhihu-c" }),
      review({ id: "bilibili-a", platform: "bilibili", sourceUrl: "https://example.com/bilibili-a", engagement: 100, engagementMetrics: [{ key: "view", label: "播放", value: 100, unit: "次", positive: true }] }),
      review({ id: "bilibili-b", platform: "bilibili", sourceUrl: "https://example.com/bilibili-b", engagement: 100, engagementMetrics: [{ key: "view", label: "播放", value: 100, unit: "次", positive: true }] }),
      review({ id: "bilibili-c", platform: "bilibili", sourceUrl: "https://example.com/bilibili-c", engagement: 100, engagementMetrics: [{ key: "view", label: "播放", value: 100, unit: "次", positive: true }] })
    ];
    const platformScores = buildPlatformReputation(reviews, undefined, new Date("2026-05-16"))
      .map((platform) => platform.score)
      .filter((score): score is number => typeof score === "number");
    const expected = Number((platformScores.reduce((sum, score) => sum + score, 0) / platformScores.length).toFixed(1));
    const score = calculateReputationScore(reviews, new Date("2026-05-16"));

    expect(platformScores).toHaveLength(2);
    expect(score).toBe(expected);
  });

  it("returns zero when no platform reaches three real excerpts", () => {
    expect(calculateReputationScore([review({ id: "a" }), review({ id: "b" })])).toBe(0);
  });

  it("excludes summary quotes from platform aggregation", () => {
    const reviews = [
      review({ id: "a", quoteType: "summary" }),
      review({ id: "b", quoteType: "summary" }),
      review({ id: "c", quoteType: "summary" })
    ];

    const platforms = buildPlatformReputation(reviews, undefined, new Date("2026-05-16"));
    expect(platforms.find((platform) => platform.platform === "zhihu")?.score).toBeNull();
    expect(calculateReputationScore(reviews, new Date("2026-05-16"))).toBe(0);
  });

  it("rewards feedback that matches official use cases", () => {
    const useCases = [
      {
        id: "coding",
        label: "代码与开发",
        description: "代码场景",
        keywords: ["代码", "编程"],
        weight: 1,
        sourceUrl: "https://example.com"
      }
    ];
    const matched = review({ useCaseMatches: ["coding"], excerpt: "代码能力很好，适合编程和调试。" });
    const generic = review({ id: "g", useCaseMatches: [], excerpt: "这个产品挺火，很多人讨论。" });

    expect(reviewReputationScore(matched, useCases, new Date("2026-05-16"))).toBeGreaterThan(
      reviewReputationScore(generic, useCases, new Date("2026-05-16"))
    );
  });
});
