import { mkdir } from "fs/promises";
import { chromium, type BrowserContext, type Page } from "playwright";
import { isActualContentUrl } from "@/lib/content-source";
import {
  metric,
  normalizeSpace,
  parseMetricValue,
  platformLabel,
  RichCrawlerBlockedError,
  stableHash,
  topByEngagement
} from "@/lib/crawler/rich-utils";
import type {
  CrawledComment,
  CrawledPost,
  CrawledReply,
  RichCrawlTarget,
  RichPlatformAdapter
} from "@/lib/crawler/rich-types";
import type { EngagementMetric, PlatformKey } from "@/lib/types";

type BrowserPlatform = Extract<PlatformKey, "zhihu" | "xiaohongshu" | "weibo" | "douyin" | "tieba">;

type Candidate = {
  url: string;
  title: string;
};

type RawBrowserMetric = {
  label: string;
  value: string;
};

type RawBrowserReply = {
  content: string;
  authorLabel?: string;
  metrics: RawBrowserMetric[];
};

type RawBrowserComment = {
  content: string;
  authorLabel?: string;
  metrics: RawBrowserMetric[];
  replies: RawBrowserReply[];
};

type BrowserExtraction = {
  title: string;
  content: string;
  authorLabel?: string;
  publishedAt?: string;
  metrics: RawBrowserMetric[];
  comments: RawBrowserComment[];
};

const browserPlatforms: BrowserPlatform[] = ["zhihu", "xiaohongshu", "weibo", "douyin", "tieba"];
const candidatePatterns: Record<BrowserPlatform, string[]> = {
  zhihu: [
    "^https://www\\.zhihu\\.com/question/\\d+",
    "^https://www\\.zhihu\\.com/answer/\\d+",
    "^https://www\\.zhihu\\.com/pin/\\d+",
    "^https://www\\.zhihu\\.com/zvideo/\\d+",
    "^https://zhuanlan\\.zhihu\\.com/p/\\d+"
  ],
  xiaohongshu: ["^https://www\\.xiaohongshu\\.com/explore/"],
  weibo: [
    "^https://www\\.weibo\\.com/\\d+/[A-Za-z0-9]+",
    "^https://weibo\\.com/\\d+/[A-Za-z0-9]+",
    "^https://m\\.weibo\\.cn/detail/\\d+"
  ],
  douyin: ["^https://www\\.douyin\\.com/video/", "^https://www\\.douyin\\.com/note/"],
  tieba: ["^https://tieba\\.baidu\\.com/p/\\d+"]
};

const authDir = process.env.RICH_CRAWL_AUTH_DIR ?? ".auth/rich-reputation";
const minDelayMs = Number(process.env.RICH_CRAWL_MIN_DELAY_MS ?? 45_000);
const maxDelayMs = Number(process.env.RICH_CRAWL_MAX_DELAY_MS ?? 120_000);
const maxCandidatesPerTarget = Number(process.env.RICH_CRAWL_MAX_POSTS_PER_KEYWORD ?? 3);
const maxComments = Number(process.env.RICH_CRAWL_MAX_COMMENTS ?? 10);
const maxReplies = Number(process.env.RICH_CRAWL_MAX_REPLIES ?? 3);

let sharedContext: BrowserContext | null = null;
let sharedPage: Page | null = null;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomBetween(min: number, max: number) {
  return Math.floor(min + Math.random() * Math.max(0, max - min));
}

async function humanPause(label: string) {
  const waitMs = randomBetween(minDelayMs, maxDelayMs);
  console.log(`${label}，暂停 ${Math.round(waitMs / 1000)} 秒`);
  await sleep(waitMs);
}

async function getPage() {
  if (sharedPage && !sharedPage.isClosed()) {
    return sharedPage;
  }

  await mkdir(authDir, { recursive: true });
  const options = {
    headless: process.env.RICH_CRAWL_HEADLESS === "1",
    viewport: { width: 1440, height: 1000 },
    userAgent: process.env.CRAWLER_USER_AGENT
  };

  try {
    sharedContext = await chromium.launchPersistentContext(authDir, {
      ...options,
      channel: process.env.RICH_CRAWL_BROWSER_CHANNEL ?? "chrome"
    });
  } catch {
    sharedContext = await chromium.launchPersistentContext(authDir, options);
  }

  sharedPage = await sharedContext.newPage();
  sharedPage.setDefaultTimeout(30_000);
  return sharedPage;
}

async function closeSharedBrowser() {
  await sharedContext?.close().catch(() => undefined);
  sharedContext = null;
  sharedPage = null;
}

async function humanScroll(page: Page, minSteps = 2, maxSteps = 5) {
  const steps = randomBetween(minSteps, maxSteps);
  for (let step = 0; step < steps; step += 1) {
    await page.mouse.move(randomBetween(120, 1100), randomBetween(120, 850), { steps: randomBetween(8, 22) }).catch(() => undefined);
    await page.mouse.wheel(0, randomBetween(260, 920)).catch(() => undefined);
    await page.waitForTimeout(randomBetween(1800, 5200));
  }
}

function blockingReason(text: string): RichCrawlerBlockedError["reason"] | null {
  if (/滑块|验证码|安全验证|人机验证|verify|captcha/i.test(text)) {
    return "captcha";
  }
  if (/访问频繁|请求过于频繁|操作频繁|请稍后|rate limit/i.test(text)) {
    return "rate_limit";
  }
  if (/环境异常|账号异常|访问受限|暂时无法访问|blocked/i.test(text)) {
    return "blocked";
  }
  if (/请先登录|登录后查看|登录后可见|扫码登录|登录即可查看/.test(text) || (text.length < 240 && /登录|注册/.test(text))) {
    return "login";
  }
  return null;
}

async function assertPageAvailable(page: Page, platform: PlatformKey) {
  const text = normalizeSpace(await page.locator("body").innerText({ timeout: 5000 }).catch(() => ""));
  const reason = blockingReason(text);
  if (reason) {
    throw new RichCrawlerBlockedError(reason, `${platformLabel(platform)} 需要人工登录/验证或降低频率：${text.slice(0, 80)}`);
  }
}

function normalizeCandidateUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "link.zhihu.com" && parsed.searchParams.get("target")) {
      return parsed.searchParams.get("target") ?? url;
    }
    if (parsed.hostname === "weibo.com") {
      parsed.hostname = "www.weibo.com";
      return parsed.toString();
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

async function collectCandidates(page: Page, target: RichCrawlTarget): Promise<Candidate[]> {
  await humanPause(`[${platformLabel(target.platform)}] 打开搜索页前`);
  await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await assertPageAvailable(page, target.platform);
  await page.waitForTimeout(randomBetween(3500, 9000));
  await humanScroll(page, 1, 4);

  const patterns = candidatePatterns[target.platform as BrowserPlatform] ?? [];
  const candidates = await page.evaluate((patternSources) => {
    const patterns = patternSources.map((source) => new RegExp(source, "i"));
    const anchors = [...document.querySelectorAll<HTMLAnchorElement>("a[href]")];
    return anchors
      .map((anchor) => ({
        url: anchor.href,
        title: (anchor.textContent || document.title || "").replace(/\s+/g, " ").trim()
      }))
      .filter((item) => patterns.some((pattern) => pattern.test(item.url)))
      .slice(0, 30);
  }, patterns);

  const seen = new Set<string>();
  return candidates
    .map((item) => ({ ...item, url: normalizeCandidateUrl(item.url) }))
    .filter((item) => isActualContentUrl(item.url))
    .filter((item) => {
      const key = item.url.split("#")[0];
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxCandidatesPerTarget * 2);
}

function metricKey(label: string) {
  const key = label
    .replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, "")
    .replace(/赞同|点赞|赞/g, "like")
    .replace(/收藏/g, "favorite")
    .replace(/推荐/g, "recommend")
    .replace(/喜欢/g, "like")
    .replace(/亮了/g, "light")
    .replace(/播放/g, "view")
    .replace(/浏览/g, "view")
    .replace(/转发/g, "share")
    .replace(/评论/g, "comment")
    .replace(/回复/g, "reply");
  return key || "metric";
}

function browserMetric(platform: PlatformKey, scope: string, raw: RawBrowserMetric, index: number): EngagementMetric {
  const positive = !/评论|回复/.test(raw.label);
  return metric(`${platform}_${scope}_${metricKey(raw.label)}_${index}`, raw.label, raw.value, positive, "次");
}

function normalizePublishedAt(value?: string) {
  if (!value) {
    return new Date().toISOString();
  }

  const direct = new Date(value);
  if (Number.isFinite(direct.getTime())) {
    return direct.toISOString();
  }

  const dateMatch = value.match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/);
  if (dateMatch) {
    const normalized = dateMatch[0].replace(/[年月/.]/g, "-").replace(/日/g, "");
    const parsed = new Date(`${normalized}T00:00:00+08:00`);
    if (Number.isFinite(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return new Date().toISOString();
}

function commentFromRaw(platform: PlatformKey, sourceUrl: string, raw: RawBrowserComment, index: number): CrawledComment {
  const id = `${platform}-comment-${stableHash(`${sourceUrl}:${raw.content}:${index}`)}`;
  const replies = topByEngagement(
    raw.replies
      .map((reply, replyIndex): CrawledReply => ({
        id: `${id}-reply-${replyIndex}`,
        author: { label: reply.authorLabel || `${platformLabel(platform)}用户` },
        content: normalizeSpace(reply.content),
        sourceUrl: `${sourceUrl}#reply-${stableHash(reply.content)}`,
        publishedAt: undefined,
        engagementMetrics: reply.metrics.map((item, metricIndex) => browserMetric(platform, "reply", item, metricIndex))
      }))
      .filter((reply) => reply.content.length >= 4),
    maxReplies
  );

  return {
    id,
    author: { label: raw.authorLabel || `${platformLabel(platform)}用户` },
    content: normalizeSpace(raw.content),
    sourceUrl: `${sourceUrl}#comment-${stableHash(raw.content)}`,
    publishedAt: undefined,
    engagementMetrics: raw.metrics.map((item, metricIndex) => browserMetric(platform, "comment", item, metricIndex)),
    replies
  };
}

function fallbackMetrics(platform: PlatformKey, metrics: EngagementMetric[]) {
  if (metrics.length > 0) {
    return metrics;
  }

  return [metric(`${platform}_content_page`, "内容页", 1, true, "页")];
}

async function extractPost(page: Page, target: RichCrawlTarget, candidate: Candidate): Promise<CrawledPost | null> {
  await humanPause(`[${platformLabel(target.platform)}] 打开内容页前`);
  await page.goto(candidate.url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await assertPageAvailable(page, target.platform);
  await page.waitForTimeout(randomBetween(3500, 8500));
  await humanScroll(page, 2, 6);

  const currentUrl = normalizeCandidateUrl(page.url());
  const sourceUrl = isActualContentUrl(currentUrl) ? currentUrl : candidate.url;
  if (!isActualContentUrl(sourceUrl)) {
    return null;
  }

  const extraction = await page.evaluate((): BrowserExtraction => {
    const normalize = (value: string | null | undefined) => (value ?? "").replace(/\s+/g, " ").trim();
    const firstText = (selectors: string[]) => {
      for (const selector of selectors) {
        const text = normalize(document.querySelector(selector)?.textContent);
        if (text) return text;
      }
      return "";
    };
    const meta = (name: string) =>
      normalize(document.querySelector(`meta[property="${name}"],meta[name="${name}"]`)?.getAttribute("content"));
    const extractMetrics = (text: string): RawBrowserMetric[] => {
      const metrics: RawBrowserMetric[] = [];
      const labelFirst = /(赞同|点赞|赞|收藏|推荐|喜欢|亮了|播放|浏览|转发|评论|回复)\s*[:：()]?\s*([0-9][0-9,.]*\s*[万wW]?)/g;
      const valueFirst = /([0-9][0-9,.]*\s*[万wW]?)\s*(赞同|点赞|赞|收藏|推荐|喜欢|亮了|播放|浏览|转发|评论|回复)/g;
      for (const match of text.matchAll(labelFirst)) {
        metrics.push({ label: match[1] ?? "互动", value: match[2] ?? "0" });
      }
      for (const match of text.matchAll(valueFirst)) {
        metrics.push({ label: match[2] ?? "互动", value: match[1] ?? "0" });
      }
      const seen = new Set<string>();
      return metrics.filter((item) => {
        const key = `${item.label}:${item.value}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 10);
    };

    const title = firstText(["h1", "article h1", "[class*='title']", "[class*='Title']"]) || meta("og:title") || document.title;
    const description = meta("description") || meta("og:description");
    const contentBlocks = [
      description,
      firstText(["article", "[class*='content']", "[class*='Content']", "[class*='desc']", "[class*='Desc']", "[class*='note']", "[class*='Note']"])
    ].filter(Boolean);
    const bodyText = normalize(document.body?.innerText);
    const content = normalize(contentBlocks.join(" ")) || bodyText.slice(0, 1600);
    const authorLabel = firstText(["[class*='author']", "[class*='Author']", "[class*='user']", "[class*='User']", "a[rel='author']"]);
    const publishedAt = document.querySelector("time")?.getAttribute("datetime")
      || meta("article:published_time")
      || bodyText.match(/20\d{2}[-/.年]\d{1,2}[-/.月]\d{1,2}/)?.[0];

    const commentNodes = [
      ...document.querySelectorAll<HTMLElement>("[class*='comment'],[class*='Comment'],[class*='reply'],[class*='Reply'],[data-testid*='comment'],[data-e2e*='comment']")
    ];
    const seenComments = new Set<string>();
    const comments = commentNodes
      .map((node): RawBrowserComment | null => {
        const rect = node.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return null;
        const text = normalize(node.innerText || node.textContent);
        if (text.length < 8 || text.length > 700) return null;
        if (/登录|验证码|查看更多|展开全部|发表评论|发布评论/.test(text) && text.length < 40) return null;
        const key = text.slice(0, 120);
        if (seenComments.has(key)) return null;
        seenComments.add(key);

        const author = normalize(node.querySelector("[class*='author'],[class*='Author'],[class*='user'],[class*='User'],a")?.textContent);
        const replyTexts = [
          ...node.querySelectorAll<HTMLElement>("[class*='reply'],[class*='Reply']")
        ]
          .map((replyNode) => normalize(replyNode.innerText || replyNode.textContent))
          .filter((replyText) => replyText.length >= 6 && replyText.length < text.length && replyText !== text)
          .slice(0, 6);

        return {
          content: text.slice(0, 420),
          authorLabel: author,
          metrics: extractMetrics(text).slice(0, 4),
          replies: replyTexts.map((replyText) => ({
            content: replyText.slice(0, 260),
            authorLabel: "",
            metrics: extractMetrics(replyText).slice(0, 3)
          }))
        };
      })
      .filter((item): item is RawBrowserComment => Boolean(item))
      .slice(0, 30);

    return {
      title: normalize(title).slice(0, 160),
      content: normalize(content).slice(0, 1800),
      authorLabel: normalize(authorLabel).slice(0, 60),
      publishedAt: publishedAt || undefined,
      metrics: extractMetrics(bodyText).slice(0, 10),
      comments
    };
  });

  const title = normalizeSpace(extraction.title || candidate.title || target.keyword);
  const content = normalizeSpace(extraction.content || title);
  if (content.length < 20 && title.length < 12) {
    return null;
  }

  const postMetrics = fallbackMetrics(
    target.platform,
    extraction.metrics
      .filter((item) => parseMetricValue(item.value) > 0)
      .map((item, index) => browserMetric(target.platform, "post", item, index))
  );
  const comments = topByEngagement(
    extraction.comments
      .map((item, index) => commentFromRaw(target.platform, sourceUrl, item, index))
      .filter((comment) => comment.content.length >= 8),
    maxComments
  );

  return {
    id: `${target.platform}-${stableHash(`${target.modelId}:${sourceUrl}`)}`,
    platform: target.platform,
    modelId: target.modelId,
    keyword: target.keyword,
    title,
    content,
    sourceUrl,
    sourceTitle: `${platformLabel(target.platform)}内容：${title}`,
    author: { label: extraction.authorLabel ? `${platformLabel(target.platform)}用户：${extraction.authorLabel}` : `${platformLabel(target.platform)}用户` },
    publishedAt: normalizePublishedAt(extraction.publishedAt),
    collectedAt: new Date().toISOString(),
    engagementMetrics: postMetrics,
    comments
  };
}

export function createRichBrowserAdapter(platform: BrowserPlatform): RichPlatformAdapter {
  if (!browserPlatforms.includes(platform)) {
    throw new Error(`Unsupported browser platform: ${platform}`);
  }

  return {
    platform,
    async searchPosts(target) {
      const page = await getPage();
      const candidates = await collectCandidates(page, target);
      const posts: CrawledPost[] = [];
      for (const candidate of candidates.slice(0, maxCandidatesPerTarget)) {
        const post = await extractPost(page, target, candidate);
        if (post) {
          posts.push(post);
        }
      }
      return posts;
    },
    close: closeSharedBrowser
  };
}
