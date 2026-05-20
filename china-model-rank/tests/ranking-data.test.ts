import { describe, expect, it } from "vitest";
import { getRankedModels } from "@/lib/data";
import { isActualContentUrl } from "@/lib/content-source";

describe("ranking data", () => {
  it("provides clear homepage ranking fields", () => {
    const first = getRankedModels()[0];

    expect(first?.score.rank).toBe(1);
    expect(first?.rankName).toBeTruthy();
    expect(first?.vendor.name).toBeTruthy();
    expect(first?.score.total).toBeGreaterThan(0);
    expect(first?.score.breakdown.capability).toBeGreaterThan(0);
    expect(first?.score.dataCompleteness).toBeGreaterThan(0);
    expect(first?.score.dataCompleteness).toBeLessThanOrEqual(100);
  });

  it("attaches traceable external evidence sources", () => {
    const models = getRankedModels();
    const withEvidence = models.filter((model) => model.evidenceSources.length > 0);

    expect(withEvidence.length).toBe(models.length);
    expect(withEvidence[0]?.evidenceSources[0]?.sourceUrl).toMatch(/^https:\/\//);
    expect(withEvidence[0]?.evidenceSources[0]?.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("exposes formulas and sourced score contributions", () => {
    const models = getRankedModels();

    for (const model of models) {
      expect(model.score.formulas.length).toBeGreaterThan(0);
      expect(model.score.contributions.length).toBe(6);

      for (const contribution of model.score.contributions) {
        expect(contribution.formula).toBeTruthy();
        if (contribution.score !== null) {
          expect(contribution.hasEvidence).toBe(true);
          expect(contribution.inputSummary.length).toBeGreaterThan(0);
        } else {
          expect(contribution.missingReason).toContain("缺少真实来源");
          expect(contribution.effectiveWeight).toBe(0);
        }
      }
    }
  });

  it("connects code and data-analysis scores to benchmark evidence", () => {
    const first = getRankedModels()[0];
    const coding = first.score.contributions.find((item) => item.category === "coding");
    const dataAnalysis = first.score.contributions.find((item) => item.category === "dataAnalysis");

    expect(first.score.missingCategories).not.toContain("coding");
    expect(first.score.missingCategories).not.toContain("dataAnalysis");
    expect(coding?.score).toBeGreaterThan(0);
    expect(dataAnalysis?.score).toBeGreaterThan(0);
    expect(coding?.evidenceIds.some((id) => id.includes("livebench") || id.includes("aa"))).toBe(true);
    expect(dataAnalysis?.evidenceIds.some((id) => id.includes("livebench"))).toBe(true);
  });

  it("exposes seven fixed platform reputation aggregates", () => {
    const first = getRankedModels()[0];

    expect(first.score.platformReputation.map((platform) => platform.platform)).toEqual([
      "zhihu",
      "xiaohongshu",
      "douyin",
      "weibo",
      "hupu",
      "tieba",
      "bilibili"
    ]);
    expect(first.score.platformReputation.every((platform) => platform.requiredSampleCount === 3)).toBe(true);
    expect(first.score.platformReputation.every((platform) => platform.summary.length > 0)).toBe(true);
  });

  it("shows explicit pricing and traceable free access links", () => {
    const models = getRankedModels();

    for (const model of models) {
      expect(model.pricing.display).toMatch(/API：/);
      expect(model.pricing.display).toMatch(/百万 tokens/);
      expect(model.pricing.api.sourceUrl).toMatch(/^https:\/\//);
      expect(model.pricing.api.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof model.pricing.api.input === "number" || model.pricing.api.input === null).toBe(true);
      expect(typeof model.pricing.api.output === "number" || model.pricing.api.output === null).toBe(true);

      for (const link of model.freeAccessInfo.web ?? []) {
        expect(link.url).toMatch(/^https:\/\//);
      }
      for (const link of model.freeAccessInfo.openSourceModels ?? []) {
        expect(link.url).toMatch(/^https:\/\//);
      }
      expect(model.productVariants.length).toBeGreaterThanOrEqual(2);
      expect(model.officialUseCases.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("provides diverse public reputation sources per model", () => {
    const models = getRankedModels();

    for (const model of models) {
      expect(model.reviews.length).toBeGreaterThanOrEqual(2);

      for (const review of model.reviews) {
        expect(review.sourceUrl).toMatch(/^https:\/\//);
        expect(isActualContentUrl(review.sourceUrl)).toBe(true);
        expect(review.positiveSignals.length).toBeGreaterThan(0);
        expect(review.engagementMetrics.length).toBeGreaterThan(0);
        expect(review.positiveSignals.join(" ")).not.toContain("公开搜索结果");
        expect(review.engagementMetrics.every((metric) => !metric.key.includes("public_search"))).toBe(true);
      }
    }
  });

  it("uses brand names on the ranking instead of concrete model SKUs", () => {
    const rankNames = getRankedModels().map((model) => model.rankName);

    expect(rankNames).toContain("千问");
    expect(rankNames).toContain("Kimi");
    expect(rankNames).toContain("豆包");
    expect(rankNames).not.toContain("通义千问 Qwen Max");
    expect(rankNames).not.toContain("Kimi K2");
    expect(rankNames).not.toContain("豆包 Pro");
  });
});
