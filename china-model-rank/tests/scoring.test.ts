import { describe, expect, it } from "vitest";
import { buildPlatformReputation, calculateAvailableWeightedScore, calculateTotalScore, createScoreSnapshot, deriveUserReputation, normalizeWeights } from "@/lib/scoring";
import type { EvidenceSource, NormalizedReview } from "@/lib/types";

describe("scoring", () => {
  it("normalizes weights to one", () => {
    const weights = normalizeWeights({
      capability: 2,
      priceAccess: 2,
      coding: 2,
      dataAnalysis: 2,
      ecosystem: 1,
      userReputation: 1
    });

    const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
    expect(total).toBeCloseTo(1);
  });

  it("calculates weighted total score", () => {
    const score = calculateTotalScore(
      {
        capability: 90,
        priceAccess: 80,
        coding: 70,
        dataAnalysis: 60,
        ecosystem: 50,
        userReputation: 40
      },
      {
        capability: 1,
        priceAccess: 0,
        coding: 0,
        dataAnalysis: 0,
        ecosystem: 0,
        userReputation: 0
      }
    );

    expect(score).toBe(90);
  });

  it("renormalizes available weights when a data category is missing", () => {
    const result = calculateAvailableWeightedScore(
      {
        capability: 90,
        userReputation: 80
      },
      {
        capability: 0.5,
        userReputation: 0.5,
        priceAccess: 0,
        coding: 0,
        dataAnalysis: 0,
        ecosystem: 0
      }
    );

    expect(result.total).toBe(85);
    expect(result.missingCategories).toContain("priceAccess");
    expect(result.dataCompleteness).toBe(100);
  });

  it("derives reputation only from qualified platform aggregates", () => {
    const baseReview: NormalizedReview =
      {
        id: "approved",
        modelId: "m",
        platform: "zhihu",
        authorLabel: "a",
        title: "好用稳定",
        excerpt: "好用稳定",
        quote: "好用稳定",
        quoteType: "excerpt",
        sourceTitle: "source a",
        url: "https://example.com/a",
        sourceUrl: "https://example.com/a",
        publishedAt: "2026-05-01",
        collectedAt: "2026-05-02",
        isExample: false,
        sentiment: "positive",
        confidence: 0.8,
        topics: ["userReputation"],
        engagement: 100,
        engagementMetrics: [{ key: "like", label: "点赞", value: 100, unit: "次", positive: true }],
        positiveSignals: ["点赞较多"],
        auditStatus: "rejected"
      };
    const reviews: NormalizedReview[] = [
      { ...baseReview, id: "a", auditStatus: "approved", sourceUrl: "https://example.com/a", url: "https://example.com/a" },
      { ...baseReview, id: "b", auditStatus: "approved", sourceUrl: "https://example.com/b", url: "https://example.com/b" },
      { ...baseReview, id: "c", auditStatus: "approved", sourceUrl: "https://example.com/c", url: "https://example.com/c" },
      { ...baseReview, id: "summary", quoteType: "summary", auditStatus: "approved", sourceUrl: "https://example.com/s", url: "https://example.com/s" },
      { ...baseReview, id: "rejected", auditStatus: "rejected", sourceUrl: "https://example.com/r", url: "https://example.com/r" }
    ];

    const platform = buildPlatformReputation(reviews).find((item) => item.platform === "zhihu");
    expect(platform?.sampleCount).toBe(3);
    expect(deriveUserReputation(reviews)).toBeGreaterThan(0);
  });

  it("excludes missing-source categories from score contributions", () => {
    const evidenceSources: EvidenceSource[] = [
      {
        id: "ev-capability",
        modelId: "m",
        sourceName: "LiveBench",
        sourceUrl: "https://github.com/LiveBench/LiveBench",
        retrievedAt: "2026-05-16",
        metricName: "global score",
        rawValue: "90",
        normalizedValue: 90,
        confidence: 1,
        category: "capability",
        note: "test"
      }
    ];

    const snapshot = createScoreSnapshot({
      modelId: "m",
      rank: 1,
      previousRank: 2,
      breakdown: { capability: 90 },
      reviews: [],
      evidenceSources,
      generatedAt: "2026-05-16T00:00:00.000Z",
      weights: {
        capability: 0.4,
        userReputation: 0,
        priceAccess: 0.15,
        coding: 0.06,
        dataAnalysis: 0.04,
        ecosystem: 0.05
      }
    });

    expect(snapshot.contributions.find((item) => item.category === "priceAccess")?.score).toBeNull();
    expect(snapshot.missingCategories).toContain("priceAccess");
    expect(snapshot.total).toBe(90);
  });
});
