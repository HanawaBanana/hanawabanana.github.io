import { mkdir, readFile, writeFile } from "fs/promises";
import { chromium, type Page } from "playwright";
import { buildCrawlTargets } from "@/lib/crawler/keyword-plan";
import { normalizeRawItem } from "@/lib/crawler/normalize";
import { selectTopReputation } from "@/lib/crawler/filter";
import { isActualContentUrl } from "@/lib/content-source";
import type { CrawlTarget, RawCrawlItem } from "@/lib/crawler/types";
import type { NormalizedReview, PlatformKey } from "@/lib/types";
import { rankedModelsData, vendors } from "@/lib/data";
import existingReputationExcerpts from "@/data/reputation-excerpts.json";

const targetPlatforms = (process.env.BROWSER_CRAWL_PLATFORMS?.split(",").filter(Boolean) as PlatformKey[] | undefined)
  ?? ["hupu"];
const maxTargetsPerPlatform = Number(process.env.BROWSER_CRAWL_MAX_TARGETS_PER_PLATFORM ?? 1);
const maxTargetsPerRun = Number(process.env.BROWSER_CRAWL_MAX_TARGETS_PER_RUN ?? 3);
const maxCandidatesPerTarget = Number(process.env.BROWSER_CRAWL_MAX_CANDIDATES_PER_TARGET ?? 2);
const minDelayMs = Number(process.env.BROWSER_CRAWL_MIN_DELAY_MS ?? 20_000);
const maxDelayMs = Number(process.env.BROWSER_CRAWL_MAX_DELAY_MS ?? 55_000);
const minReviewsPerModelPlatform = Number(process.env.CRAWLER_MIN_REVIEWS_PER_MODEL_PLATFORM ?? 3);
const authDir = ".auth/browser-reputation";

type Candidate = {
  url: string;
  title: string;
};

type ExistingReview = Pick<NormalizedReview, "modelId" | "platform" | "sourceUrl">;

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

function normalizeSpace(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function platformCoverage(reviews: ExistingReview[]) {
  const coverage = new Map<string, number>();
  for (const review of reviews) {
    const key = `${review.modelId}:${review.platform}`;
    coverage.set(key, (coverage.get(key) ?? 0) + 1);
  }

  return coverage;
}

function capTargets(targets: CrawlTarget[], existing: ExistingReview[]) {
  const coverage = platformCoverage(existing);
  const groups = new Map<string, CrawlTarget[]>();

  for (const target of targets) {
    const key = `${target.modelId}:${target.platform}`;
    if ((coverage.get(key) ?? 0) >= minReviewsPerModelPlatform) {
      continue;
    }
    groups.set(key, [...(groups.get(key) ?? []), target]);
  }

  return [...groups.values()]
    .flatMap((items) => items.slice(0, maxTargetsPerPlatform))
    .slice(0, maxTargetsPerRun);
}

async function maybeWaitForLogin(page: Page, platform: PlatformKey) {
  const loginText = /登录|验证码|安全验证|扫码|注册/;
  const text = normalizeSpace(await page.locator("body").innerText({ timeout: 5000 }).catch(() => ""));
  if (!loginText.test(text)) {
    return;
  }

  console.log(`[${platform}] 检测到登录或验证页面，请在打开的浏览器中完成登录/验证。完成后脚本会继续。`);
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await sleep(3000);
    const currentText = normalizeSpace(await page.locator("body").innerText({ timeout: 3000 }).catch(() => ""));
    if (!loginText.test(currentText) || currentText.length > text.length + 500) {
      return;
    }
  }

  throw new Error(`${platform} 等待登录超时`);
}

async function collectCandidates(page: Page, target: CrawlTarget): Promise<Candidate[]> {
  await humanPause(`[${target.platform}] 打开搜索页前`);
  await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await maybeWaitForLogin(page, target.platform);
  await page.waitForTimeout(randomBetween(4000, 9000));
  for (let step = 0; step < randomBetween(1, 4); step += 1) {
    await page.mouse.wheel(0, randomBetween(260, 900)).catch(() => undefined);
    await page.waitForTimeout(randomBetween(2500, 7000));
  }

  return page.evaluate((platform) => {
    const anchors = [...document.querySelectorAll("a")];
    const urls = anchors.map((anchor) => ({
      url: anchor.href,
      title: (anchor.textContent || document.title || "").replace(/\s+/g, " ").trim()
    }));

    const patterns: Record<string, RegExp[]> = {
      zhihu: [/^https:\/\/www\.zhihu\.com\/question\/\d+/i, /^https:\/\/zhuanlan\.zhihu\.com\/p\/\d+/i],
      xiaohongshu: [/^https:\/\/www\.xiaohongshu\.com\/explore\//i],
      weibo: [/^https:\/\/www\.weibo\.com\/\d+\/[A-Za-z0-9]+/i, /^https:\/\/m\.weibo\.cn\/detail\/\d+/i],
      douyin: [/^https:\/\/www\.douyin\.com\/video\//i, /^https:\/\/www\.douyin\.com\/note\//i],
      hupu: [/^https:\/\/bbs\.hupu\.com\/\d+\.html/i],
      tieba: [/^https:\/\/tieba\.baidu\.com\/p\/\d+/i]
    };

    return urls.filter((item) => (patterns[platform] ?? []).some((pattern) => pattern.test(item.url))).slice(0, 12);
  }, target.platform);
}

async function extractContent(page: Page, target: CrawlTarget, candidate: Candidate): Promise<RawCrawlItem | null> {
  await humanPause(`[${target.platform}] 打开内容页前`);
  await page.goto(candidate.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
  await maybeWaitForLogin(page, target.platform);
  await page.waitForTimeout(randomBetween(5000, 12_000));
  await page.mouse.wheel(0, randomBetween(220, 650)).catch(() => undefined);
  await page.waitForTimeout(randomBetween(2500, 6000));

  const result = await page.evaluate(() => {
    const text = (document.body?.innerText ?? "").replace(/\s+/g, " ").trim();
    const title = (document.querySelector("h1")?.textContent || document.title || "").replace(/\s+/g, " ").trim();
    const positiveMetrics = [...text.matchAll(/(赞同|点赞|收藏|推荐|亮了|亮评|播放|转发|评论|回复|浏览)\s*[:：()]?\s*([0-9,.万wW]+)/g)]
      .slice(0, 6)
      .map((match) => ({ label: match[1], value: match[2] }));

    return { title, text: text.slice(0, 800), positiveMetrics };
  });

  const excerpt = normalizeSpace(result.text);
  if (excerpt.length < 20 || !isActualContentUrl(candidate.url)) {
    return null;
  }

  const metrics = result.positiveMetrics.length > 0
    ? result.positiveMetrics.map((metric, index) => ({
        key: `${target.platform}_browser_${index}`,
        label: metric.label,
        value: parseMetricValue(metric.value),
        unit: metric.value.includes("万") ? "" : "次",
        positive: metric.label !== "评论" && metric.label !== "回复"
      }))
    : [{ key: `${target.platform}_browser_seen`, label: "内容页", value: 1, unit: "页", positive: true }];
  const positiveSignals = metrics
    .filter((metric) => metric.positive && metric.value > 0)
    .slice(0, 3)
    .map((metric) => `${metric.label} ${metric.value.toLocaleString("zh-CN")}${metric.unit}`);

  if (positiveSignals.length === 0) {
    return null;
  }

  return {
    platform: target.platform,
    modelId: target.modelId,
    sourceUrl: candidate.url,
    sourceTitle: `${platformName(target.platform)}内容：${result.title || candidate.title || target.keyword}`,
    title: result.title || candidate.title || target.keyword,
    text: excerpt,
    authorLabel: `${platformName(target.platform)}用户`,
    publishedAt: new Date().toISOString(),
    collectedAt: new Date().toISOString(),
    engagement: metrics.reduce((sum, metric) => sum + metric.value, 0),
    engagementMetrics: metrics,
    positiveSignals
  };
}

function parseMetricValue(value: string) {
  const normalized = value.replace(/,/g, "").toLowerCase();
  const number = Number(normalized.replace(/[万w]/g, ""));
  if (!Number.isFinite(number)) {
    return 1;
  }
  return normalized.includes("万") || normalized.includes("w") ? Math.round(number * 10_000) : number;
}

function platformName(platform: PlatformKey) {
  const names: Record<PlatformKey, string> = {
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

  return names[platform];
}

function mergeReviews(reviews: NormalizedReview[]) {
  const seen = new Set<string>();
  const merged: NormalizedReview[] = [];

  for (const review of reviews) {
    const key = `${review.platform}:${review.modelId}:${review.sourceUrl}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(review);
  }

  return merged;
}

async function readDrafts() {
  try {
    return JSON.parse(await readFile("data/browser-crawl-drafts.json", "utf8")) as RawCrawlItem[];
  } catch {
    return [];
  }
}

async function main() {
  await mkdir(authDir, { recursive: true });
  const browser = await chromium.launchPersistentContext(authDir, {
    channel: process.env.BROWSER_CHANNEL ?? "chrome",
    headless: process.env.BROWSER_HEADLESS === "1" ? true : false,
    viewport: { width: 1440, height: 1000 }
  });
  const page = await browser.newPage();
  const existing = existingReputationExcerpts as NormalizedReview[];
  const targets = capTargets(
    buildCrawlTargets({ models: rankedModelsData, vendors, platforms: targetPlatforms }),
    existing
  );
  const rawItems: RawCrawlItem[] = await readDrafts();

  for (const target of targets) {
    console.log(`[${target.platform}] ${target.modelId} ${target.keyword}`);
    try {
      const candidates = await collectCandidates(page, target);
      for (const candidate of candidates.slice(0, maxCandidatesPerTarget)) {
        if (rawItems.some((item) => item.sourceUrl === candidate.url && item.modelId === target.modelId)) {
          continue;
        }
        const item = await extractContent(page, target, candidate);
        if (item) {
          rawItems.push(item);
          await writeFile("data/browser-crawl-drafts.json", `${JSON.stringify(rawItems, null, 2)}\n`, "utf8");
        }
      }
    } catch (error) {
      console.log(`[${target.platform}] ${target.keyword} 失败：${error instanceof Error ? error.message : "未知错误"}`);
    }
  }

  await browser.close();

  const selected = selectTopReputation({ items: rawItems, models: rankedModelsData, perModelPlatform: minReviewsPerModelPlatform });
  const merged = mergeReviews([...existing, ...selected.map((review) => ({ ...review, auditStatus: "approved" as const }))]);
  await writeFile("data/reputation-excerpts.json", `${JSON.stringify(merged, null, 2)}\n`, "utf8");

  console.log(JSON.stringify({ rawCount: rawItems.length, selectedCount: selected.length, mergedCount: merged.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
