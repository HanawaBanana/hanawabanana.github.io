import * as cheerio from "cheerio";
import { clampQuote, totalEngagement } from "@/lib/review-evidence";
import { isActualContentUrl } from "@/lib/content-source";
import { normalizeRawItem } from "@/lib/crawler/normalize";
import type { RawCrawlItem } from "@/lib/crawler/types";
import type { AiReputationJudgement, CrawledComment, CrawledPost, RichCrawlTarget } from "@/lib/crawler/rich-types";
import type { EngagementMetric, Model, NormalizedReview, PlatformKey } from "@/lib/types";

export class RichCrawlerBlockedError extends Error {
  reason: "login" | "captcha" | "rate_limit" | "blocked" | "unknown";

  constructor(reason: RichCrawlerBlockedError["reason"], message: string) {
    super(message);
    this.name = "RichCrawlerBlockedError";
    this.reason = reason;
  }
}

export function stableHash(text: string) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(36);
}

export function normalizeSpace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function stripHtml(text: string) {
  return normalizeSpace(cheerio.load(text).text());
}

export function parseMetricValue(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const text = String(value ?? "").replace(/,/g, "").trim().toLowerCase();
  const numeric = Number(text.replace(/[万w]/g, ""));
  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return text.includes("万") || text.includes("w") ? Math.round(numeric * 10_000) : numeric;
}

export function metric(key: string, label: string, value: unknown, positive = true, unit = "次"): EngagementMetric {
  return {
    key,
    label,
    value: parseMetricValue(value),
    unit,
    positive
  };
}

export function platformLabel(platform: PlatformKey) {
  const labels: Record<PlatformKey, string> = {
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

  return labels[platform];
}

export function topByEngagement<T extends { engagementMetrics: EngagementMetric[] }>(items: T[], limit: number) {
  return [...items]
    .sort((a, b) => totalEngagement(b.engagementMetrics) - totalEngagement(a.engagementMetrics))
    .slice(0, limit);
}

export function flattenEvidenceText(post: CrawledPost) {
  const commentText = post.comments
    .map((comment, index) => {
      const replies = comment.replies.map((reply) => `回复${reply.content}`).join(" ");
      return `热评${index + 1}：${comment.content} ${replies}`;
    })
    .join(" ");
  return normalizeSpace(`${post.title} ${post.content} ${commentText}`);
}

export function postToRawItem(post: CrawledPost, judgement?: AiReputationJudgement): RawCrawlItem {
  const metrics = post.engagementMetrics.length > 0
    ? post.engagementMetrics
    : [metric(`${post.platform}_content`, "内容页", 1, true, "页")];
  const commentMetrics = post.comments
    .flatMap((comment) => [
      ...comment.engagementMetrics,
      ...comment.replies.flatMap((reply) => reply.engagementMetrics)
    ]);
  const evidenceMetrics = [...metrics, ...commentMetrics]
    .filter((item) => item.value > 0)
    .sort((a, b) => Number(b.positive) - Number(a.positive) || b.value - a.value)
    .slice(0, 8);
  const positiveSignals = evidenceMetrics
    .filter((item) => item.positive && item.value > 0)
    .slice(0, 3)
    .map((item) => `${item.label} ${item.value.toLocaleString("zh-CN")}${item.unit}`);
  const evidence = judgement?.evidenceQuote || flattenEvidenceText(post);

  return {
    platform: post.platform,
    modelId: post.modelId,
    sourceUrl: post.sourceUrl,
    sourceTitle: post.sourceTitle,
    title: post.title,
    text: evidence,
    authorLabel: post.author.label,
    publishedAt: post.publishedAt,
    collectedAt: post.collectedAt,
    engagement: totalEngagement(evidenceMetrics),
    engagementMetrics: evidenceMetrics,
    positiveSignals
  };
}

export function judgementToReview(post: CrawledPost, judgement: AiReputationJudgement, model: Model): NormalizedReview | null {
  if (!judgement.relevant || judgement.relevance < 0.45 || judgement.confidence < 0.45 || !isActualContentUrl(post.sourceUrl)) {
    return null;
  }
  if (post.warnings?.some((warning) => warning.scope === "comments")) {
    return null;
  }
  if (post.comments.length === 0) {
    return null;
  }

  const raw = postToRawItem(post, judgement);
  const review = normalizeRawItem(raw);
  const positiveSignals = raw.positiveSignals ?? [];
  if (positiveSignals.length === 0) {
    return null;
  }

  return {
    ...review,
    id: `${post.platform}-${model.id}-${stableHash(`${post.sourceUrl}:${judgement.evidenceQuote}`)}`,
    quote: clampQuote(judgement.evidenceQuote),
    excerpt: clampQuote(judgement.summary, 180),
    sentiment: judgement.sentiment,
    confidence: judgement.confidence,
    topics: judgement.topics,
    positiveSignals,
    auditStatus: "approved"
  };
}

export function createActionUrl(platform: PlatformKey, keyword: string) {
  const encoded = encodeURIComponent(keyword);
  const urls: Record<PlatformKey, string> = {
    zhihu: `https://www.zhihu.com/search?q=${encoded}`,
    bilibili: `https://search.bilibili.com/all?keyword=${encoded}`,
    weibo: `https://s.weibo.com/weibo?q=${encoded}`,
    xiaohongshu: `https://www.xiaohongshu.com/search_result?keyword=${encoded}`,
    douyin: `https://www.douyin.com/search/${encoded}?type=general`,
    hupu: `https://bbs.hupu.com/search?q=${encoded}`,
    tieba: `https://tieba.baidu.com/f/search/res?ie=utf-8&qw=${encoded}`,
    wechat: `https://weixin.sogou.com/weixin?query=${encoded}`,
    media: `https://www.baidu.com/s?wd=${encoded}`
  };
  return urls[platform];
}

export function commentsToContent(comments: CrawledComment[]) {
  return comments
    .map((comment) => `${comment.content} ${comment.replies.map((reply) => reply.content).join(" ")}`)
    .join(" ");
}

export function dedupePosts(posts: CrawledPost[]) {
  const seen = new Set<string>();
  const deduped: CrawledPost[] = [];

  for (const post of posts) {
    const key = `${post.platform}:${post.modelId}:${post.sourceUrl}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(post);
  }

  return deduped;
}

export function createRunId(now = new Date()) {
  return now.toISOString().replace(/[:.]/g, "-");
}

export function isLikelyVerificationText(text: string) {
  return /登录|验证码|安全验证|滑块|扫码|访问频繁|请稍后|验证/.test(text);
}

export function buildPostSourceTitle(post: Pick<CrawledPost, "platform" | "title">) {
  return `${platformLabel(post.platform)}内容：${post.title}`;
}

export function modelMatchesPost(post: CrawledPost, model: Model) {
  const haystack = normalizeSpace(`${post.title} ${post.content} ${commentsToContent(post.comments)}`).toLowerCase();
  return [model.rankName, model.detailName, model.name, model.family, ...model.aliases]
    .filter(Boolean)
    .some((term) => haystack.includes(normalizeSpace(term).toLowerCase()));
}

export function createTargetFromModel(input: { platform: PlatformKey; keyword: string; model: Model }): RichCrawlTarget {
  return {
    platform: input.platform,
    keyword: input.keyword,
    modelId: input.model.id,
    modelName: input.model.rankName,
    aliases: input.model.aliases,
    url: createActionUrl(input.platform, input.keyword)
  };
}
