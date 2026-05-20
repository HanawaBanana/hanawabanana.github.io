import type { RawCrawlItem } from "@/lib/crawler/types";
import { clampQuote } from "@/lib/review-evidence";
import type { NormalizedReview } from "@/lib/types";

function detectSentiment(text: string): NormalizedReview["sentiment"] {
  const positiveWords = ["强", "稳定", "好用", "优秀", "便宜", "开源", "顺手"];
  const negativeWords = ["慢", "不稳", "贵", "失败", "幻觉", "难用"];
  const positive = positiveWords.some((word) => text.includes(word));
  const negative = negativeWords.some((word) => text.includes(word));

  if (positive && !negative) return "positive";
  if (negative && !positive) return "negative";
  return "neutral";
}

function stableHash(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function normalizeRawItem(item: RawCrawlItem): NormalizedReview {
  const engagementMetrics = item.engagementMetrics ?? [
    {
      key: `${item.platform}_engagement`,
      label: "互动",
      value: item.engagement,
      unit: "次",
      positive: true
    }
  ];

  return {
    id: `${item.platform}-${item.modelId}-${stableHash(item.sourceUrl)}`,
    modelId: item.modelId,
    platform: item.platform,
    authorLabel: item.authorLabel,
    title: item.title.slice(0, 80),
    excerpt: item.text.slice(0, 180),
    quote: clampQuote(item.text),
    quoteType: "excerpt",
    sourceTitle: item.sourceTitle ?? item.title.slice(0, 80),
    url: item.sourceUrl,
    sourceUrl: item.sourceUrl,
    publishedAt: item.publishedAt,
    collectedAt: item.collectedAt ?? new Date().toISOString(),
    isExample: false,
    sentiment: detectSentiment(`${item.title} ${item.text}`),
    confidence: 0.62,
    topics: ["userReputation"],
    useCaseMatches: [],
    engagement: engagementMetrics.reduce((sum, metric) => sum + metric.value, 0),
    engagementMetrics,
    positiveSignals: item.positiveSignals ?? [],
    auditStatus: "pending"
  };
}
