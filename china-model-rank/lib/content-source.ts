import type { NormalizedReview } from "@/lib/types";

const searchUrlPatterns = [
  /^https:\/\/www\.zhihu\.com\/search\b/i,
  /^https:\/\/search\.bilibili\.com\//i,
  /^https:\/\/s\.weibo\.com\/weibo\b/i,
  /^https:\/\/www\.xiaohongshu\.com\/search_result\b/i,
  /^https:\/\/www\.douyin\.com\/search\//i,
  /^https:\/\/bbs\.hupu\.com\/search\b/i,
  /^https:\/\/tieba\.baidu\.com\/f\/search\/res\b/i,
  /^https:\/\/www\.baidu\.com\/s\b/i
];

const actualContentPatterns = [
  /^https:\/\/www\.zhihu\.com\/(question|answer|pin|zvideo)\//i,
  /^https:\/\/zhuanlan\.zhihu\.com\/p\//i,
  /^https:\/\/www\.bilibili\.com\/video\/BV/i,
  /^https:\/\/www\.weibo\.com\/\d+\/[A-Za-z0-9]+/i,
  /^https:\/\/m\.weibo\.cn\/detail\/\d+/i,
  /^https:\/\/www\.xiaohongshu\.com\/explore\//i,
  /^https:\/\/www\.douyin\.com\/video\//i,
  /^https:\/\/www\.douyin\.com\/note\//i,
  /^https:\/\/bbs\.hupu\.com\/\d+\.html/i,
  /^https:\/\/tieba\.baidu\.com\/p\/\d+/i
];

export function isSearchResultUrl(url: string): boolean {
  return searchUrlPatterns.some((pattern) => pattern.test(url));
}

export function isActualContentUrl(url: string): boolean {
  return !isSearchResultUrl(url) && actualContentPatterns.some((pattern) => pattern.test(url));
}

export function hasVerifiedEngagement(review: Pick<NormalizedReview, "engagementMetrics" | "positiveSignals">): boolean {
  return review.engagementMetrics.some((metric) => !metric.key.includes("public_search") && metric.value > 0)
    && !review.positiveSignals.some((signal) => signal.includes("公开搜索结果"));
}

export function isVerifiedReview(review: NormalizedReview): boolean {
  return isActualContentUrl(review.sourceUrl) && hasVerifiedEngagement(review);
}
