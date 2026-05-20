import type { EngagementMetric, NormalizedReview, PlatformKey, PublicReviewInput } from "@/lib/types";

export const platformLabel: Record<PlatformKey, string> = {
  zhihu: "知乎",
  weibo: "微博",
  bilibili: "B站",
  xiaohongshu: "小红书",
  douyin: "抖音",
  hupu: "虎扑",
  tieba: "贴吧",
  wechat: "公众号",
  media: "媒体"
};

export const sentimentLabel: Record<NormalizedReview["sentiment"], string> = {
  positive: "正向",
  neutral: "中性",
  negative: "负向"
};

export function clampQuote(text: string, maxLength = 80): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

export function totalEngagement(metrics: EngagementMetric[]): number {
  return metrics.reduce((sum, metric) => sum + metric.value, 0);
}

export function formatMetric(metric: EngagementMetric): string {
  return `${metric.label} ${metric.value.toLocaleString("zh-CN")}${metric.unit}`;
}

export function topEngagementMetric(review: NormalizedReview): EngagementMetric | undefined {
  return review.engagementMetrics
    .filter((metric) => metric.positive)
    .sort((a, b) => b.value - a.value)[0];
}

export function createPublicReview(input: PublicReviewInput): NormalizedReview {
  return {
    ...input,
    quote: clampQuote(input.excerpt),
    quoteType: "summary",
    sourceUrl: input.url,
    collectedAt: input.collectedAt ?? "2026-05-16T10:30:00.000+08:00",
    isExample: false,
    engagement: totalEngagement(input.engagementMetrics),
    auditStatus: input.auditStatus ?? "approved"
  };
}

export function createExcerptReview(input: PublicReviewInput & { quote: string }): NormalizedReview {
  return {
    ...input,
    quote: clampQuote(input.quote),
    quoteType: "excerpt",
    sourceUrl: input.url,
    collectedAt: input.collectedAt ?? "2026-05-16T10:30:00.000+08:00",
    isExample: false,
    engagement: totalEngagement(input.engagementMetrics),
    auditStatus: input.auditStatus ?? "approved"
  };
}
