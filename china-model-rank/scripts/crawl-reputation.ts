import { mkdir, readFile, writeFile } from "fs/promises";
import existingReputationExcerpts from "@/data/reputation-excerpts.json";
import { buildModelKeywords, getSearchUrl } from "@/lib/crawler/keyword-plan";
import { richAdapterRegistry, richReputationPlatforms } from "@/lib/crawler/rich-adapters";
import { judgePostReputation } from "@/lib/crawler/reputation-judge";
import {
  createRunId,
  dedupePosts,
  judgementToReview,
  modelMatchesPost,
  platformLabel,
  RichCrawlerBlockedError,
  stableHash
} from "@/lib/crawler/rich-utils";
import { isScorableReputationReview, matchOfficialUseCases, minimumPlatformReputationSamples } from "@/lib/scoring";
import { rankedModelsData, vendors } from "@/lib/data";
import type {
  AiReputationJudgement,
  CrawledPost,
  RichCrawlerActionRequired,
  RichCrawlerRunReport,
  RichCrawlTarget
} from "@/lib/crawler/rich-types";
import type { Model, NormalizedReview, PlatformKey } from "@/lib/types";

type CliArgs = {
  daily: boolean;
  dryRun: boolean;
  force: boolean;
  platforms: PlatformKey[];
  modelFilters: string[];
  keywords: string[];
  limitTargets?: number;
  limitModels?: number;
  keywordsPerModel?: number;
};

const validPlatformSet = new Set<PlatformKey>(richReputationPlatforms);
const minReviewsPerModelPlatform = Number(process.env.CRAWLER_MIN_REVIEWS_PER_MODEL_PLATFORM ?? minimumPlatformReputationSamples);
const maxTargetsPerModelPlatform = Number(process.env.RICH_CRAWL_MAX_TARGETS_PER_MODEL_PLATFORM ?? 2);
const discoverModelId = "__discover__";

function splitList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parsePlatforms(value: string | undefined): PlatformKey[] {
  const platforms = splitList(value) as PlatformKey[];
  for (const platform of platforms) {
    if (!validPlatformSet.has(platform)) {
      throw new Error(`不支持的平台：${platform}，可用：${richReputationPlatforms.join(",")}`);
    }
  }
  return platforms;
}

function readCliArgs(argv = process.argv.slice(2)): CliArgs {
  const args: CliArgs = {
    daily: false,
    dryRun: false,
    force: false,
    platforms: [],
    modelFilters: [],
    keywords: []
  };

  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    const next = argv[index + 1];
    if (item === "--daily") {
      args.daily = true;
    } else if (item === "--dry-run") {
      args.dryRun = true;
    } else if (item === "--force") {
      args.force = true;
    } else if ((item === "--platform" || item === "--platforms") && next) {
      args.platforms = parsePlatforms(next);
      index += 1;
    } else if ((item === "--model" || item === "--models") && next) {
      args.modelFilters.push(...splitList(next));
      index += 1;
    } else if (item === "--keyword" && next) {
      args.keywords.push(next.trim());
      index += 1;
    } else if (item === "--limit-targets" && next) {
      args.limitTargets = Number(next);
      index += 1;
    } else if (item === "--limit-models" && next) {
      args.limitModels = Number(next);
      index += 1;
    } else if (item === "--keywords-per-model" && next) {
      args.keywordsPerModel = Number(next);
      index += 1;
    }
  }

  if (args.platforms.length === 0) {
    args.platforms = parsePlatforms(process.env.RICH_CRAWL_PLATFORMS)
      ?? [];
  }
  if (args.platforms.length === 0) {
    args.platforms = args.daily ? richReputationPlatforms : ["bilibili", "hupu"];
  }

  return args;
}

function matchesModel(model: Model, filter: string) {
  const normalized = filter.toLowerCase().replace(/\s+/g, "");
  const candidates = [model.id, model.slug, model.rankName, model.detailName, model.name, model.family, ...model.aliases]
    .map((item) => item.toLowerCase().replace(/\s+/g, ""));
  return candidates.some((item) => item.includes(normalized) || normalized.includes(item));
}

function selectModels(args: CliArgs) {
  const selected = args.modelFilters.length > 0
    ? rankedModelsData.filter((model) => args.modelFilters.some((filter) => matchesModel(model, filter)))
    : rankedModelsData;

  if (selected.length === 0) {
    throw new Error(`没有匹配到模型：${args.modelFilters.join(",")}`);
  }

  return selected.slice(0, args.limitModels ?? selected.length);
}

function priorityKeywords(model: Model) {
  const vendor = vendors.find((item) => item.id === model.vendorId);
  const base = [model.rankName, model.family, ...model.aliases, vendor?.shortName ? `${vendor.shortName} 大模型` : ""]
    .map((item) => item.trim())
    .filter(Boolean);
  const terms = ["使用感受", "实际使用", "解决问题", "真实体验", "好不好用", "踩坑", "评测"];
  const officialUseCaseKeywords = model.officialUseCases.flatMap((useCase) => [
    `${model.rankName} ${useCase.label} 实际使用`,
    ...useCase.keywords.slice(0, 2).map((keyword) => `${model.rankName} ${keyword} 解决问题`)
  ]);

  return [
    ...base.flatMap((name) => terms.map((term) => `${name} ${term}`)),
    ...officialUseCaseKeywords,
    ...buildModelKeywords(model, vendor)
  ];
}

function uniqueKeywords(model: Model, args: CliArgs) {
  const source = args.keywords.length > 0 ? args.keywords : priorityKeywords(model);
  const seen = new Set<string>();
  return source.filter((keyword) => {
    const normalized = keyword.toLowerCase().replace(/\s+/g, "");
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  }).slice(0, args.keywordsPerModel ?? (args.daily ? 4 : 2));
}

function coverageByModelPlatform(reviews: NormalizedReview[]) {
  const coverage = new Map<string, number>();
  for (const review of reviews) {
    if (!isScorableReputationReview(review)) {
      continue;
    }
    const key = `${review.modelId}:${review.platform}`;
    coverage.set(key, (coverage.get(key) ?? 0) + 1);
  }
  return coverage;
}

function buildTargets(args: CliArgs, existing: NormalizedReview[]): RichCrawlTarget[] {
  if (args.keywords.length > 0 && args.modelFilters.length === 0) {
    const limitTargets = args.limitTargets ?? args.keywords.length * args.platforms.length;
    return args.platforms
      .flatMap((platform) =>
        args.keywords.map((keyword) => ({
          platform,
          keyword,
          modelId: discoverModelId,
          modelName: "模型发现",
          aliases: [],
          url: getSearchUrl(platform, keyword)
        }))
      )
      .slice(0, limitTargets);
  }

  const models = selectModels(args);
  const coverage = coverageByModelPlatform(existing);
  const groups = new Map<string, RichCrawlTarget[]>();
  const force = args.force || args.keywords.length > 0 || args.modelFilters.length > 0;

  for (const model of models) {
    for (const platform of args.platforms) {
      const key = `${model.id}:${platform}`;
      if (!force && (coverage.get(key) ?? 0) >= minReviewsPerModelPlatform) {
        continue;
      }

      for (const keyword of uniqueKeywords(model, args)) {
        groups.set(key, [
          ...(groups.get(key) ?? []),
          {
            platform,
            keyword,
            modelId: model.id,
            modelName: model.rankName,
            aliases: model.aliases,
            url: getSearchUrl(platform, keyword)
          }
        ]);
      }
    }
  }

  const envLimitTargets = Number(process.env.RICH_CRAWL_MAX_TARGETS || 0);
  const limitTargets = args.limitTargets ?? (envLimitTargets || (args.daily ? 28 : 4));

  return [...groups.values()]
    .flatMap((targets) => targets.slice(0, maxTargetsPerModelPlatform))
    .slice(0, limitTargets);
}

function modelCandidatesForPost(post: CrawledPost, args: CliArgs) {
  const models = selectModels(args);
  if (post.modelId !== discoverModelId) {
    return models.filter((model) => model.id === post.modelId);
  }

  return models.filter((model) => modelMatchesPost(post, model));
}

function assignPostToModel(post: CrawledPost, model: Model): CrawledPost {
  return {
    ...post,
    id: `${post.id}-${stableHash(model.id)}`,
    modelId: model.id
  };
}

function mergeReviews(existing: NormalizedReview[], selected: NormalizedReview[]) {
  const seen = new Set<string>();
  const merged: NormalizedReview[] = [];

  for (const review of [...selected, ...existing]) {
    const key = `${review.platform}:${review.modelId}:${review.sourceUrl}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(review);
  }

  return merged;
}

async function readPreviousPosts() {
  try {
    return JSON.parse(await readFile("data/crawler/latest-posts.json", "utf8")) as CrawledPost[];
  } catch {
    return [];
  }
}

function actionRequired(input: {
  target: RichCrawlTarget;
  reason: RichCrawlerActionRequired["reason"];
  message: string;
}): RichCrawlerActionRequired {
  return {
    platform: input.target.platform,
    target: input.target,
    reason: input.reason,
    message: input.message,
    detectedAt: new Date().toISOString()
  };
}

async function closeAdapters() {
  const adapters = [...new Set(Object.values(richAdapterRegistry).filter(Boolean))];
  for (const adapter of adapters) {
    await adapter?.close?.().catch(() => undefined);
  }
}

async function main() {
  const args = readCliArgs();
  const runId = createRunId();
  const collectedAt = new Date().toISOString();
  const existing = existingReputationExcerpts as NormalizedReview[];
  const targets = buildTargets(args, existing);
  const posts: CrawledPost[] = [];
  const judgements: AiReputationJudgement[] = [];
  const selectedReviews: NormalizedReview[] = [];
  const actionItems: RichCrawlerActionRequired[] = [];

  await mkdir("data/crawler/runs", { recursive: true });

  console.log(JSON.stringify({
    runId,
    daily: args.daily,
    dryRun: args.dryRun,
    platforms: args.platforms,
    targetCount: targets.length,
    limitTargets: args.limitTargets ?? process.env.RICH_CRAWL_MAX_TARGETS ?? (args.daily ? 28 : 4)
  }, null, 2));

  for (const target of targets) {
    const adapter = richAdapterRegistry[target.platform];
    if (!adapter) {
      actionItems.push(actionRequired({ target, reason: "adapter_missing", message: `${platformLabel(target.platform)} 尚未实现富内容适配器` }));
      continue;
    }

    try {
      console.log(`[${platformLabel(target.platform)}] ${target.modelName}：${target.keyword}`);
      const collectedPosts = await adapter.searchPosts(target);
      if (collectedPosts.length === 0) {
        actionItems.push(actionRequired({ target, reason: "unknown", message: "未采集到实际内容页，可能需要调整关键词或人工登录后重试" }));
      }
      for (const post of collectedPosts) {
        for (const warning of post.warnings ?? []) {
          actionItems.push(actionRequired({
            target,
            reason: warning.reason,
            message: `${post.sourceUrl}：${warning.message}`
          }));
        }
      }
      posts.push(...collectedPosts);
    } catch (error) {
      if (error instanceof RichCrawlerBlockedError) {
        actionItems.push(actionRequired({ target, reason: error.reason, message: error.message }));
      } else {
        actionItems.push(actionRequired({
          target,
          reason: "unknown",
          message: error instanceof Error ? error.message : "未知抓取错误"
        }));
      }
    }
  }

  const dedupedPosts = dedupePosts([...await readPreviousPosts(), ...posts]);
  for (const post of dedupePosts(posts)) {
    for (const model of modelCandidatesForPost(post, args)) {
      const assignedPost = assignPostToModel(post, model);
      const judgement = await judgePostReputation(assignedPost, model);
    judgements.push(judgement);
      const review = judgementToReview(assignedPost, judgement, model);
      if (review) {
        selectedReviews.push({
          ...review,
          useCaseMatches: matchOfficialUseCases(review, model.officialUseCases),
          auditStatus: "approved"
        });
      }
    }
  }

  const mergedReviews = mergeReviews(existing, selectedReviews);
  const report: RichCrawlerRunReport & { mergedCount: number; dryRun: boolean } = {
    runId,
    collectedAt,
    targets,
    posts,
    judgements,
    selectedReviews,
    actionRequired: actionItems,
    mergedCount: mergedReviews.length,
    dryRun: args.dryRun
  };

  await writeFile(`data/crawler/runs/${runId}.json`, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile("data/crawler/latest-posts.json", `${JSON.stringify(dedupedPosts.slice(-500), null, 2)}\n`, "utf8");
  await writeFile("data/crawler/latest-run.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile("data/crawler/action-required.json", `${JSON.stringify({ collectedAt, actionRequired: actionItems }, null, 2)}\n`, "utf8");

  if (!args.dryRun) {
    await writeFile("data/reputation-excerpts.json", `${JSON.stringify(mergedReviews, null, 2)}\n`, "utf8");
  }

  await closeAdapters();

  console.log(JSON.stringify({
    runId,
    targetCount: targets.length,
    postCount: posts.length,
    judgementCount: judgements.length,
    selectedCount: selectedReviews.length,
    mergedCount: mergedReviews.length,
    actionRequiredCount: actionItems.length,
    dryRun: args.dryRun
  }, null, 2));
}

main().catch(async (error) => {
  await closeAdapters();
  console.error(error);
  process.exitCode = 1;
});
