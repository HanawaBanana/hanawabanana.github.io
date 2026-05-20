import type {
  EvidenceSource,
  Model,
  NormalizedReview,
  OfficialUseCase,
  PlatformKey,
  PlatformReputationSummary,
  ReviewScoreDetail,
  ScoreBreakdown,
  ScoreCategoryKey,
  ScoreContribution,
  ScoreFormula,
  ScoreSnapshot,
  ScoreWeights
} from "@/lib/types";

export const defaultWeights: ScoreWeights = {
  capability: 0.4,
  userReputation: 0.3,
  priceAccess: 0.15,
  coding: 0.06,
  dataAnalysis: 0.04,
  ecosystem: 0.05
};

export const scoreLabels: Record<ScoreCategoryKey, string> = {
  capability: "能力评测",
  priceAccess: "成本与可用性",
  coding: "代码能力",
  dataAnalysis: "数据分析",
  ecosystem: "生态开放度",
  userReputation: "用户口碑"
};

export const scoreCategoryOrder: ScoreCategoryKey[] = [
  "capability",
  "userReputation",
  "priceAccess",
  "coding",
  "dataAnalysis",
  "ecosystem"
];

export const scoreFormulas: ScoreFormula[] = [
  {
    category: "total",
    label: "综合评分",
    expression: "综合分 = Σ(有来源分项得分 × 该分项原始权重 / 有来源分项权重总和)",
    description: "缺少真实来源的分项不补假分，综合分只在已补源分项之间重归一。",
    sourcePolicy: "所有计入分项必须有来源链接、采集日期和可解释输入。"
  },
  {
    category: "capability",
    label: scoreLabels.capability,
    expression: "能力 = Σ(外部评测归一分 × 来源置信度) / Σ来源置信度",
    description: "优先使用 Artificial Analysis、LiveBench、OpenCompass、SuperCLUE、LMArena 等可追溯能力来源。",
    sourcePolicy: "外部来源必须能打开到榜单、模型页、数据仓库或方法论页。"
  },
  {
    category: "userReputation",
    label: scoreLabels.userReputation,
    expression: "口碑 = 合格平台分等权平均；平台分 = 该平台真实原文评价单条分均值；单条 = 场景匹配45% + 用户态度30% + 互动质量15% + 来源时效10%",
    description: "口碑只使用真实内容页或评论页的原文短摘录，先按平台聚合，再按平台等权计入。",
    sourcePolicy: "固定展示知乎、小红书、抖音、微博、虎扑、贴吧、B站；每个平台至少 3 条真实原文才计入口碑分。"
  },
  {
    category: "priceAccess",
    label: scoreLabels.priceAccess,
    expression: "成本可用性 = API 价格倒排60% + 免费入口20% + 开源部署20%",
    description: "API 价格按输入 30%、输出 70%折算为百万 tokens 成本，并在同批模型内做 min-max 反向归一。",
    sourcePolicy: "价格、免费入口和开源地址都必须来自官方文档或官方模型仓库链接。"
  },
  {
    category: "coding",
    label: scoreLabels.coding,
    expression: "代码能力 = LiveBench coding 分项70% + Artificial Analysis 代码类公开信号30%；缺源时按可用来源重归一",
    description: "优先使用 LiveBench coding、Artificial Analysis 能力 API 中的代码相关指标，避免用主观印象替代开发任务表现。",
    sourcePolicy: "必须能追溯到公开榜单、官方 API 返回、数据集或可复现导入文件。"
  },
  {
    category: "dataAnalysis",
    label: scoreLabels.dataAnalysis,
    expression: "数据分析 = LiveBench data_analysis 分项80% + 数据/表格/知识任务公开评测20%；缺源时按可用来源重归一",
    description: "关注表格理解、数据归纳、长文档抽取和分析类任务，来源不足时不编造分数。",
    sourcePolicy: "必须能追溯到 LiveBench、OpenCompass/SuperCLUE 等公开分项或可复现导入文件。"
  },
  {
    category: "ecosystem",
    label: scoreLabels.ecosystem,
    expression: "生态开放度 = API/文档25% + SDK/工具链25% + 开源仓库30% + 集成案例20%",
    description: "从产品入口、官方文档、开源仓库和可验证集成资料判断生态可用性。",
    sourcePolicy: "只使用官方链接、开源仓库或可追溯开发者资料。"
  }
];

export function normalizeWeights(weights: ScoreWeights): ScoreWeights {
  const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
  if (total <= 0) {
    return defaultWeights;
  }

  return Object.fromEntries(
    Object.entries(weights).map(([key, value]) => [key, value / total])
  ) as ScoreWeights;
}

export function calculateTotalScore(breakdown: ScoreBreakdown, weights: ScoreWeights = defaultWeights): number {
  const normalized = normalizeWeights(weights);
  const weighted = Object.entries(breakdown).reduce((sum, [key, value]) => {
    return sum + value * normalized[key as ScoreCategoryKey];
  }, 0);

  return Number(weighted.toFixed(1));
}

export function calculateAvailableWeightedScore(
  breakdown: Partial<ScoreBreakdown>,
  weights: ScoreWeights = defaultWeights
): { total: number; missingCategories: ScoreCategoryKey[]; dataCompleteness: number } {
  const entries = Object.entries(weights) as Array<[ScoreCategoryKey, number]>;
  const available = entries.filter(([key]) => typeof breakdown[key] === "number");
  const missingCategories = entries.filter(([key]) => typeof breakdown[key] !== "number").map(([key]) => key);
  const availableWeight = available.reduce((sum, [, weight]) => sum + weight, 0);

  if (availableWeight <= 0) {
    return { total: 0, missingCategories, dataCompleteness: 0 };
  }

  const total = available.reduce((sum, [key, weight]) => {
    return sum + (breakdown[key] ?? 0) * (weight / availableWeight);
  }, 0);

  return {
    total: Number(total.toFixed(1)),
    missingCategories,
    dataCompleteness: Number((availableWeight * 100).toFixed(0))
  };
}

export function deriveCapabilityFromEvidence(evidenceSources: EvidenceSource[]): number | undefined {
  const capabilitySources = evidenceSources.filter((source) => source.category === "capability" && source.normalizedValue !== null);
  if (capabilitySources.length === 0) {
    return undefined;
  }

  const weightedTotal = capabilitySources.reduce((sum, source) => sum + (source.normalizedValue ?? 0) * source.confidence, 0);
  const confidenceTotal = capabilitySources.reduce((sum, source) => sum + source.confidence, 0);
  return Number((weightedTotal / confidenceTotal).toFixed(1));
}

export function sentimentScore(review: NormalizedReview): number {
  const base = review.sentiment === "positive" ? 86 : review.sentiment === "negative" ? 38 : 62;
  const confidenceBoost = (review.confidence - 0.5) * 16;
  const engagementBoost = Math.min(review.engagement / 1000, 1) * 6;
  return Math.max(0, Math.min(100, Number((base + confidenceBoost + engagementBoost).toFixed(1))));
}

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

export function matchOfficialUseCases(review: NormalizedReview, useCases: OfficialUseCase[]): string[] {
  const haystack = normalizeText(`${review.title} ${review.excerpt} ${review.quote}`);
  return useCases
    .filter((useCase) => useCase.keywords.some((keyword) => haystack.includes(normalizeText(keyword))))
    .map((useCase) => useCase.id);
}

export function scenarioMatchScore(review: NormalizedReview, useCases: OfficialUseCase[]): number {
  const matched = new Set(review.useCaseMatches ?? matchOfficialUseCases(review, useCases));
  if (matched.size === 0) {
    return 35;
  }

  const totalWeight = useCases.reduce((sum, useCase) => sum + useCase.weight, 0) || 1;
  const matchedWeight = useCases
    .filter((useCase) => matched.has(useCase.id))
    .reduce((sum, useCase) => sum + useCase.weight, 0);
  return Number(Math.min(100, 55 + (matchedWeight / totalWeight) * 45).toFixed(1));
}

export function engagementQualityScore(review: NormalizedReview): number {
  const positive = review.engagementMetrics
    .filter((metric) => metric.positive)
    .reduce((sum, metric) => sum + metric.value, 0);
  return Number(Math.min(100, 40 + Math.log10(Math.max(positive, 1)) * 15).toFixed(1));
}

export function sourceFreshnessScore(review: NormalizedReview, now = new Date()): number {
  const ageDays = Math.max(0, (now.getTime() - new Date(review.publishedAt).getTime()) / 86_400_000);
  const freshness = ageDays <= 30 ? 100 : ageDays <= 180 ? 82 : ageDays <= 730 ? 66 : 52;
  const confidence = Math.max(0, Math.min(100, review.confidence * 100));
  return Number((freshness * 0.45 + confidence * 0.55).toFixed(1));
}

export function reviewReputationScore(review: NormalizedReview, useCases: OfficialUseCase[], now = new Date()): number {
  const scenario = scenarioMatchScore(review, useCases);
  const sentiment = sentimentScore(review);
  const engagement = engagementQualityScore(review);
  const source = sourceFreshnessScore(review, now);
  return Number((scenario * 0.45 + sentiment * 0.3 + engagement * 0.15 + source * 0.1).toFixed(1));
}

export const reputationPlatforms: PlatformKey[] = ["zhihu", "xiaohongshu", "douyin", "weibo", "hupu", "tieba", "bilibili"];

export const minimumPlatformReputationSamples = 3;

export const reputationPlatformLabels: Record<PlatformKey, string> = {
  zhihu: "知乎",
  xiaohongshu: "小红书",
  douyin: "抖音",
  weibo: "微博",
  hupu: "虎扑",
  tieba: "贴吧",
  bilibili: "B站",
  wechat: "公众号",
  media: "媒体"
};

export function isScorableReputationReview(review: NormalizedReview): boolean {
  return review.auditStatus === "approved"
    && review.quoteType === "excerpt"
    && review.isExample === false
    && review.sourceUrl.startsWith("https://")
    && review.positiveSignals.length > 0
    && !review.positiveSignals.some((signal) => signal.includes("公开搜索结果"))
    && !review.engagementMetrics.some((metric) => metric.key.includes("public_search"));
}

export function explainReviewScore(review: NormalizedReview, useCases: OfficialUseCase[], now = new Date()): ReviewScoreDetail {
  const matchedUseCases = review.useCaseMatches ?? matchOfficialUseCases(review, useCases);
  const detail = {
    reviewId: review.id,
    scenario: scenarioMatchScore({ ...review, useCaseMatches: matchedUseCases }, useCases),
    sentiment: sentimentScore(review),
    engagement: engagementQualityScore(review),
    sourceFreshness: sourceFreshnessScore(review, now)
  };

  return {
    ...detail,
    total: Number((detail.scenario * 0.45 + detail.sentiment * 0.3 + detail.engagement * 0.15 + detail.sourceFreshness * 0.1).toFixed(1)),
    matchedUseCases,
    formula: "场景匹配45% + 用户态度30% + 互动质量15% + 来源时效10%"
  };
}

function platformSummaryText(platform: PlatformKey, reviews: NormalizedReview[], score: number | null) {
  if (score === null) {
    return `${reputationPlatformLabels[platform]}真实原文样本不足，暂不计入口碑分。`;
  }

  const positiveCount = reviews.filter((review) => review.sentiment === "positive").length;
  const topSignals = reviews
    .flatMap((review) => review.positiveSignals)
    .slice(0, 3)
    .join("、");
  const tone = positiveCount >= Math.ceil(reviews.length * 0.6) ? "正向反馈占主导" : "反馈偏中性";
  return `${reputationPlatformLabels[platform]}聚合分 ${score.toFixed(1)}，${tone}，主要正向标识：${topSignals || "已核验原文链接"}。`;
}

export function buildPlatformReputation(
  reviews: NormalizedReview[],
  model?: Pick<Model, "officialUseCases">,
  now = new Date()
): PlatformReputationSummary[] {
  const useCases = model?.officialUseCases ?? [];

  return reputationPlatforms.map((platform) => {
    const platformReviews = reviews
      .filter((review) => review.platform === platform && isScorableReputationReview(review))
      .sort((a, b) => b.engagement - a.engagement);
    const qualified = platformReviews.length >= minimumPlatformReputationSamples;
    const score = qualified
      ? Number((platformReviews.reduce((sum, review) => sum + reviewReputationScore(review, useCases, now), 0) / platformReviews.length).toFixed(1))
      : null;

    return {
      platform,
      label: reputationPlatformLabels[platform],
      status: qualified ? "scored" : "insufficient",
      score,
      sampleCount: platformReviews.length,
      requiredSampleCount: minimumPlatformReputationSamples,
      summary: platformSummaryText(platform, platformReviews, score),
      reviewIds: platformReviews.map((review) => review.id)
    };
  });
}

export function deriveUserReputation(reviews: NormalizedReview[], model?: Pick<Model, "officialUseCases">, now = new Date()): number | undefined {
  const platformScores = buildPlatformReputation(reviews, model, now)
    .map((platform) => platform.score)
    .filter((score): score is number => typeof score === "number");

  if (platformScores.length === 0) {
    return undefined;
  }

  return Number((platformScores.reduce((sum, score) => sum + score, 0) / platformScores.length).toFixed(1));
}

export function createScoreSnapshot(input: {
  modelId: string;
  rank: number;
  previousRank: number;
  breakdown: Partial<ScoreBreakdown>;
  reviews: NormalizedReview[];
  model?: Pick<Model, "officialUseCases">;
  evidenceSources?: EvidenceSource[];
  generatedAt: string;
  weights?: ScoreWeights;
}): ScoreSnapshot {
  const weights = input.weights ?? defaultWeights;
  const evidenceSources = input.evidenceSources ?? [];
  const formulaByCategory = Object.fromEntries(scoreFormulas.map((formula) => [formula.category, formula])) as Record<ScoreCategoryKey | "total", ScoreFormula>;
  const generatedAt = new Date(input.generatedAt);
  const platformReputation = buildPlatformReputation(input.reviews, input.model, generatedAt);
  const userReputation = deriveUserReputation(input.reviews, input.model, generatedAt);
  const capability = deriveCapabilityFromEvidence(evidenceSources) ?? input.breakdown.capability;
  const partialBreakdown: Partial<ScoreBreakdown> = {
    ...input.breakdown,
    capability,
    ...(typeof userReputation === "number" ? { userReputation } : {})
  };
  const scoreResult = calculateAvailableWeightedScore(partialBreakdown, weights);
  const normalizedWeights = effectiveWeightsFor(partialBreakdown, weights);
  const contributions = scoreCategoryOrder.map((category) =>
    buildContribution({
      category,
      score: partialBreakdown[category],
      baseWeight: weights[category],
      effectiveWeight: normalizedWeights[category] ?? 0,
      evidenceSources,
      formula: formulaByCategory[category].expression,
      reviews: input.reviews
    })
  );
  const breakdown = Object.fromEntries(
    scoreCategoryOrder.map((category) => [category, partialBreakdown[category] ?? 0])
  ) as ScoreBreakdown;
  const platforms = new Set(input.reviews.map((review) => review.platform));
  const reviewScoreDetails = input.reviews.map((review) => explainReviewScore(review, input.model?.officialUseCases ?? [], generatedAt));

  return {
    modelId: input.modelId,
    total: scoreResult.total,
    rank: input.rank,
    previousRank: input.previousRank,
    breakdown,
    contributions,
    formulas: scoreFormulas,
    reviewScoreDetails,
    platformReputation,
    effectiveWeights: normalizedWeights,
    explanation: buildExplanation(contributions),
    sourceCount: platforms.size,
    reviewCount: input.reviews.length,
    dataCompleteness: scoreResult.dataCompleteness,
    missingCategories: scoreResult.missingCategories,
    generatedAt: input.generatedAt
  };
}

function effectiveWeightsFor(breakdown: Partial<ScoreBreakdown>, weights: ScoreWeights): Partial<Record<ScoreCategoryKey, number>> {
  const available = scoreCategoryOrder.filter((category) => typeof breakdown[category] === "number");
  const availableWeight = available.reduce((sum, category) => sum + weights[category], 0);
  if (availableWeight <= 0) {
    return {};
  }

  return Object.fromEntries(available.map((category) => [category, Number((weights[category] / availableWeight).toFixed(4))]));
}

function buildContribution(input: {
  category: ScoreCategoryKey;
  score: number | undefined;
  baseWeight: number;
  effectiveWeight: number;
  evidenceSources: EvidenceSource[];
  formula: string;
  reviews: NormalizedReview[];
}): ScoreContribution {
  const categoryEvidence = input.evidenceSources.filter((source) => source.category === input.category);
  const platformReputation = input.category === "userReputation" ? buildPlatformReputation(input.reviews) : [];
  const scoredPlatforms = platformReputation.filter((platform) => platform.score !== null);
  const hasEvidence = input.category === "userReputation" ? scoredPlatforms.length > 0 : categoryEvidence.length > 0;
  const inputSummary = input.category === "userReputation"
    ? [
        `${scoredPlatforms.length} 个合格平台等权计分`,
        `每个平台至少 ${minimumPlatformReputationSamples} 条真实原文短摘录`,
        scoredPlatforms.length ? scoredPlatforms.map((platform) => `${platform.label} ${platform.score?.toFixed(1)}`).join("、") : "暂无平台达到样本门槛"
      ]
    : categoryEvidence.slice(0, 4).map((source) => `${source.sourceName}：${source.rawValue}`);

  return {
    category: input.category,
    label: scoreLabels[input.category],
    score: typeof input.score === "number" ? Number(input.score.toFixed(1)) : null,
    baseWeight: input.baseWeight,
    effectiveWeight: input.effectiveWeight,
    contribution: typeof input.score === "number" ? Number((input.score * input.effectiveWeight).toFixed(1)) : 0,
    hasEvidence,
    formula: input.formula,
    evidenceIds: categoryEvidence.map((source) => source.id),
    sourceCount: input.category === "userReputation" ? input.reviews.length : categoryEvidence.length,
    inputSummary,
    missingReason: hasEvidence ? undefined : "缺少真实来源，暂不计入综合分。"
  };
}

export function buildExplanation(contributions: ScoreContribution[]): string {
  const available = contributions.filter((item) => item.score !== null && item.effectiveWeight > 0);
  const topDrivers = available
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 2)
    .map((item) => item.label);
  const missing = contributions.filter((item) => item.score === null).map((item) => item.label);

  return `综合分由${topDrivers.join("、")}拉动；${missing.length ? `${missing.join("、")}待补源未计入。` : "全部计入分项均有来源。"} `;
}
