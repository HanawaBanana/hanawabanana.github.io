import type { EvidenceSource, Model, ScoreBreakdown, ScoreCategoryKey } from "@/lib/types";

const USD_TO_CNY_FOR_SCORING = 7.2;

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function currencySymbol(currency: "CNY" | "USD") {
  return currency === "CNY" ? "¥" : "$";
}

function priceToCny(model: Model) {
  const { input, output, currency } = model.pricing.api;
  const inputPrice = input ?? output ?? 0;
  const outputPrice = output ?? inputPrice;
  const blended = inputPrice * 0.3 + outputPrice * 0.7;
  return currency === "USD" ? blended * USD_TO_CNY_FOR_SCORING : blended;
}

function inverseMinMax(value: number, min: number, max: number) {
  if (max <= min) {
    return 82;
  }

  return round(100 - ((value - min) / (max - min)) * 45);
}

function hasOpenSourceDeployment(model: Model) {
  return (model.freeAccessInfo.openSourceModels?.length ?? 0) > 0;
}

function hasFreeWebAccess(model: Model) {
  return (model.freeAccessInfo.web?.length ?? 0) > 0;
}

function buildPriceAccessScore(model: Model, minPrice: number, maxPrice: number) {
  const apiCostScore = inverseMinMax(priceToCny(model), minPrice, maxPrice);
  const freeEntryScore = hasFreeWebAccess(model) ? 100 : 62;
  const openDeploymentScore = hasOpenSourceDeployment(model) ? 100 : 45;
  const total = apiCostScore * 0.6 + freeEntryScore * 0.2 + openDeploymentScore * 0.2;

  return {
    total: round(total),
    apiCostScore,
    freeEntryScore,
    openDeploymentScore
  };
}

function buildEcosystemScore(model: Model) {
  const apiDocScore = model.pricing.api.sourceUrl ? 88 : 45;
  const productCoverageScore = model.productVariants.length >= 3 ? 95 : model.productVariants.length >= 2 ? 84 : 70;
  const openRepoScore = hasOpenSourceDeployment(model) ? Math.min(100, 76 + (model.freeAccessInfo.openSourceModels?.length ?? 0) * 8) : 55;
  const officialScenarioScore = model.officialUseCases.length >= 3 ? 90 : model.officialUseCases.length >= 2 ? 82 : 68;
  const total = apiDocScore * 0.25 + productCoverageScore * 0.25 + openRepoScore * 0.3 + officialScenarioScore * 0.2;

  return {
    total: round(total),
    apiDocScore,
    productCoverageScore,
    openRepoScore,
    officialScenarioScore
  };
}

function sourceForModel(model: Model) {
  return model.pricing.api.sourceUrl || model.freeAccessInfo.web?.[0]?.url || model.freeAccessInfo.openSourceModels?.[0]?.url || "https://example.com";
}

export function buildDerivedEvidenceSources(models: Model[]): EvidenceSource[] {
  const prices = models.map(priceToCny);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);

  return models.flatMap((model) => {
    const priceScore = buildPriceAccessScore(model, minPrice, maxPrice);
    const ecosystemScore = buildEcosystemScore(model);
    const api = model.pricing.api;
    const blended = priceToCny(model);
    const openSourceLinks = model.freeAccessInfo.openSourceModels ?? [];
    const webLinks = model.freeAccessInfo.web ?? [];

    return [
      {
        id: `ev-${model.id}-price-access`,
        modelId: model.id,
        sourceName: "官方价格与访问入口",
        sourceUrl: sourceForModel(model),
        retrievedAt: api.retrievedAt,
        metricName: "成本可用性公式",
        rawValue: [
          `API ${api.model}：输入 ${api.input === null ? "未列明" : `${currencySymbol(api.currency)}${api.input}`}/百万 tokens，输出 ${api.output === null ? "未列明" : `${currencySymbol(api.currency)}${api.output}`}/百万 tokens`,
          `折算价格：¥${round(blended, 2)}/百万 tokens（输入30% + 输出70%；USD 按固定 7.2 折算）`,
          `免费入口：${webLinks.length > 0 ? webLinks.map((link) => link.label).join("、") : "未找到官方免费入口"}`,
          `开源部署：${openSourceLinks.length > 0 ? openSourceLinks.map((link) => link.label).join("、") : "未找到主力模型官方开源权重"}`
        ].join("；"),
        normalizedValue: priceScore.total,
        confidence: 0.92,
        category: "priceAccess" as const,
        note: `成本可用性 = API价格倒排60%(${priceScore.apiCostScore}) + 免费入口20%(${priceScore.freeEntryScore}) + 开源部署20%(${priceScore.openDeploymentScore})。`
      },
      {
        id: `ev-${model.id}-ecosystem`,
        modelId: model.id,
        sourceName: "官方文档、产品入口与开源仓库",
        sourceUrl: model.productVariants[0]?.links[0]?.url ?? sourceForModel(model),
        retrievedAt: api.retrievedAt,
        metricName: "生态开放度公式",
        rawValue: [
          `API/文档：${api.sourceUrl}`,
          `产品形态：${model.productVariants.map((variant) => variant.name).join("、")}`,
          `开源仓库：${openSourceLinks.length > 0 ? openSourceLinks.map((link) => link.url).join("、") : "未找到主力模型官方开源权重"}`,
          `官方场景：${model.officialUseCases.map((useCase) => useCase.label).join("、")}`
        ].join("；"),
        normalizedValue: ecosystemScore.total,
        confidence: 0.86,
        category: "ecosystem" as const,
        note: `生态开放度 = API/文档25%(${ecosystemScore.apiDocScore}) + 产品/工具链25%(${ecosystemScore.productCoverageScore}) + 开源仓库30%(${ecosystemScore.openRepoScore}) + 官方场景20%(${ecosystemScore.officialScenarioScore})。`
      }
    ];
  });
}

export function deriveCategoryScore(evidenceSources: EvidenceSource[], category: ScoreCategoryKey): number | undefined {
  const sources = evidenceSources.filter((source) => source.category === category && source.normalizedValue !== null);
  if (sources.length === 0) {
    return undefined;
  }

  const weightedTotal = sources.reduce((sum, source) => sum + (source.normalizedValue ?? 0) * source.confidence, 0);
  const confidenceTotal = sources.reduce((sum, source) => sum + source.confidence, 0);
  return round(weightedTotal / confidenceTotal);
}

export function buildSourcedBreakdowns(models: Model[], evidenceSources: EvidenceSource[]): Record<string, Partial<ScoreBreakdown>> {
  return Object.fromEntries(
    models.map((model) => {
      const modelEvidence = evidenceSources.filter((source) => source.modelId === model.id);
      const breakdown: Partial<ScoreBreakdown> = {};

      for (const category of ["capability", "priceAccess", "coding", "dataAnalysis", "ecosystem"] as ScoreCategoryKey[]) {
        const score = deriveCategoryScore(modelEvidence, category);
        if (typeof score === "number") {
          breakdown[category] = score;
        }
      }

      return [model.id, breakdown];
    })
  );
}
