import type { EngagementMetric, NormalizedReview, PlatformKey, ScoreCategoryKey } from "@/lib/types";

export type RichCrawlTarget = {
  platform: PlatformKey;
  keyword: string;
  modelId: string;
  modelName: string;
  aliases: string[];
  url: string;
};

export type CrawlAuthor = {
  label: string;
  profileUrl?: string;
};

export type CrawledReply = {
  id: string;
  author: CrawlAuthor;
  content: string;
  sourceUrl: string;
  publishedAt?: string;
  engagementMetrics: EngagementMetric[];
};

export type CrawledComment = {
  id: string;
  author: CrawlAuthor;
  content: string;
  sourceUrl: string;
  publishedAt?: string;
  engagementMetrics: EngagementMetric[];
  replies: CrawledReply[];
};

export type CrawledPostWarning = {
  scope: "comments" | "post" | "search";
  reason: "login" | "captcha" | "rate_limit" | "blocked" | "unknown";
  message: string;
};

export type CrawledPost = {
  id: string;
  platform: PlatformKey;
  modelId: string;
  keyword: string;
  title: string;
  content: string;
  sourceUrl: string;
  sourceTitle: string;
  author: CrawlAuthor;
  publishedAt: string;
  collectedAt: string;
  engagementMetrics: EngagementMetric[];
  comments: CrawledComment[];
  warnings?: CrawledPostWarning[];
};

export type RichPlatformAdapter = {
  platform: PlatformKey;
  searchPosts(target: RichCrawlTarget): Promise<CrawledPost[]>;
  close?: () => Promise<void>;
};

export type AiReputationJudgement = {
  postId: string;
  modelId: string;
  platform: PlatformKey;
  sourceUrl: string;
  relevant: boolean;
  relevance: number;
  sentiment: NormalizedReview["sentiment"];
  confidence: number;
  score: number;
  evidenceQuote: string;
  summary: string;
  positivePoints: string[];
  negativePoints: string[];
  topics: ScoreCategoryKey[];
};

export type RichCrawlerActionRequired = {
  platform: PlatformKey;
  target: RichCrawlTarget;
  reason: "login" | "captcha" | "rate_limit" | "adapter_missing" | "blocked" | "unknown";
  message: string;
  detectedAt: string;
};

export type RichCrawlerRunReport = {
  runId: string;
  collectedAt: string;
  targets: RichCrawlTarget[];
  posts: CrawledPost[];
  judgements: AiReputationJudgement[];
  selectedReviews: NormalizedReview[];
  actionRequired: RichCrawlerActionRequired[];
};
