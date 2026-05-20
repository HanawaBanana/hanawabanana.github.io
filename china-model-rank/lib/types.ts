export type PlatformKey =
  | "zhihu"
  | "weibo"
  | "bilibili"
  | "xiaohongshu"
  | "douyin"
  | "hupu"
  | "tieba"
  | "wechat"
  | "media";

export type EngagementMetric = {
  key: string;
  label: string;
  value: number;
  unit: string;
  positive: boolean;
};

export type ScoreBreakdown = {
  capability: number;
  priceAccess: number;
  coding: number;
  dataAnalysis: number;
  ecosystem: number;
  userReputation: number;
};

export type ScoreCategoryKey = keyof ScoreBreakdown;

export type ScoreWeights = Record<ScoreCategoryKey, number>;

export type EvidenceSource = {
  id: string;
  modelId: string;
  sourceName: string;
  sourceUrl: string;
  retrievedAt: string;
  metricName: string;
  rawValue: string;
  normalizedValue: number | null;
  confidence: number;
  category: ScoreCategoryKey;
  note: string;
};

export type ScoreFormula = {
  category: ScoreCategoryKey | "total";
  label: string;
  expression: string;
  description: string;
  sourcePolicy: string;
};

export type ScoreContribution = {
  category: ScoreCategoryKey;
  label: string;
  score: number | null;
  baseWeight: number;
  effectiveWeight: number;
  contribution: number;
  hasEvidence: boolean;
  formula: string;
  evidenceIds: string[];
  sourceCount: number;
  inputSummary: string[];
  missingReason?: string;
};

export type ReviewScoreDetail = {
  reviewId: string;
  total: number;
  scenario: number;
  sentiment: number;
  engagement: number;
  sourceFreshness: number;
  matchedUseCases: string[];
  formula: string;
};

export type PlatformReputationSummary = {
  platform: PlatformKey;
  label: string;
  status: "scored" | "insufficient";
  score: number | null;
  sampleCount: number;
  requiredSampleCount: number;
  summary: string;
  reviewIds: string[];
};

export type Vendor = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  homepage: string;
};

export type SourceLink = {
  label: string;
  url: string;
  note?: string;
};

export type ApiPricing = {
  model: string;
  unit: "1M tokens";
  currency: "CNY" | "USD";
  input: number | null;
  output: number | null;
  cacheHitInput?: number | null;
  note?: string;
  sourceUrl: string;
  retrievedAt: string;
};

export type SubscriptionPricing = {
  label: string;
  price: string;
  cycle: "month" | "year" | "usage" | "unknown";
  sourceUrl: string;
  retrievedAt: string;
  note?: string;
};

export type PricingInfo = {
  display: string;
  api: ApiPricing;
  subscriptions?: SubscriptionPricing[];
};

export type FreeAccessInfo = {
  display: string;
  web?: SourceLink[];
  openSourceModels?: SourceLink[];
};

export type ProductVariant = {
  type: "software_app" | "api_model" | "open_source_model";
  name: string;
  description: string;
  links: SourceLink[];
  pricing?: PricingInfo;
};

export type OfficialUseCase = {
  id: string;
  label: string;
  description: string;
  keywords: string[];
  weight: number;
  sourceUrl: string;
};

export type Model = {
  id: string;
  slug: string;
  name: string;
  rankName: string;
  detailName: string;
  vendorId: string;
  family: string;
  aliases: string[];
  tags: string[];
  releaseType: "open" | "proprietary" | "hybrid";
  access: string;
  freeAccess: string;
  paidCost: string;
  freeAccessInfo: FreeAccessInfo;
  pricing: PricingInfo;
  productVariants: ProductVariant[];
  officialUseCases: OfficialUseCase[];
  summary: string;
  updatedAt: string;
};

export type BaseModel = Omit<Model, "rankName" | "detailName" | "productVariants" | "officialUseCases">;

export type NormalizedReview = {
  id: string;
  modelId: string;
  platform: PlatformKey;
  authorLabel: string;
  title: string;
  excerpt: string;
  quote: string;
  quoteType: "excerpt" | "summary";
  sourceTitle: string;
  url: string;
  sourceUrl: string;
  publishedAt: string;
  collectedAt: string;
  isExample: boolean;
  sentiment: "positive" | "neutral" | "negative";
  confidence: number;
  topics: ScoreCategoryKey[];
  useCaseMatches?: string[];
  engagement: number;
  engagementMetrics: EngagementMetric[];
  positiveSignals: string[];
  auditStatus: "pending" | "approved" | "rejected";
};

export type PublicReviewInput = Omit<
  NormalizedReview,
  "quote" | "quoteType" | "sourceUrl" | "collectedAt" | "isExample" | "engagement" | "auditStatus"
> & {
  collectedAt?: string;
  auditStatus?: NormalizedReview["auditStatus"];
};

export type ScoreSnapshot = {
  modelId: string;
  total: number;
  rank: number;
  previousRank: number;
  breakdown: ScoreBreakdown;
  contributions: ScoreContribution[];
  formulas: ScoreFormula[];
  reviewScoreDetails: ReviewScoreDetail[];
  platformReputation: PlatformReputationSummary[];
  effectiveWeights: Partial<Record<ScoreCategoryKey, number>>;
  explanation: string;
  sourceCount: number;
  reviewCount: number;
  dataCompleteness: number;
  missingCategories: ScoreCategoryKey[];
  generatedAt: string;
};

export type RankedModel = Model & {
  vendor: Vendor;
  score: ScoreSnapshot;
  reviews: NormalizedReview[];
  evidenceSources: EvidenceSource[];
};

export type DashboardMetric = {
  label: string;
  value: string;
  detail: string;
};
