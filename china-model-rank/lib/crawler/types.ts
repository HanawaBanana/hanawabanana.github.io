import type { PlatformKey } from "@/lib/types";
import type { EngagementMetric } from "@/lib/types";

export type CrawlTarget = {
  platform: PlatformKey;
  keyword: string;
  modelId: string;
  url: string;
  modelName?: string;
  aliases?: string[];
};

export type RawCrawlItem = {
  platform: PlatformKey;
  modelId: string;
  sourceUrl: string;
  sourceTitle?: string;
  title: string;
  text: string;
  authorLabel: string;
  publishedAt: string;
  collectedAt?: string;
  engagement: number;
  engagementMetrics?: EngagementMetric[];
  positiveSignals?: string[];
};

export type SourceAdapter = {
  platform: PlatformKey;
  fetchItems(target: CrawlTarget): Promise<RawCrawlItem[]>;
};

export type PendingMcpTask = {
  platform: PlatformKey;
  modelId: string;
  keyword: string;
  searchUrl: string;
  reason: string;
  requiredMetrics?: string[];
};

export type DailyCrawlResult = {
  collectedAt: string;
  rawItems: RawCrawlItem[];
  pendingMcpTasks: PendingMcpTask[];
};
