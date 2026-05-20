import { writeFile } from "fs/promises";
import { adapterRegistry } from "@/lib/crawler/adapters";
import { buildCrawlTargets } from "@/lib/crawler/keyword-plan";
import { createPendingMcpTask } from "@/lib/crawler/platforms/shared";
import { selectTopReputation } from "@/lib/crawler/filter";
import { calculateReputationScore } from "@/lib/reputation-score";
import type { PendingMcpTask, RawCrawlItem } from "@/lib/crawler/types";
import { rankedModelsData, vendors } from "@/lib/data";
import existingReputationExcerpts from "@/data/reputation-excerpts.json";

const maxTargetsPerModelPlatform = Number(process.env.CRAWLER_MAX_TARGETS_PER_MODEL_PLATFORM ?? 8);
const minReviewsPerModelPlatform = Number(process.env.CRAWLER_MIN_REVIEWS_PER_MODEL_PLATFORM ?? 3);

function capTargets() {
  const allTargets = buildCrawlTargets({
    models: rankedModelsData,
    vendors,
    platforms: ["zhihu", "xiaohongshu", "weibo", "douyin", "hupu", "tieba", "bilibili"]
  });
  const groups = new Map<string, typeof allTargets>();

  for (const target of allTargets) {
    const key = `${target.modelId}:${target.platform}`;
    groups.set(key, [...(groups.get(key) ?? []), target]);
  }

  return [...groups.values()].flatMap((targets) => targets.slice(0, maxTargetsPerModelPlatform));
}

async function main() {
  const collectedAt = new Date().toISOString();
  const rawItems: RawCrawlItem[] = [];
  const pendingMcpTasks: PendingMcpTask[] = [];
  const targets = capTargets();

  for (const target of targets) {
    const adapter = adapterRegistry[target.platform];
    if (!adapter) {
      pendingMcpTasks.push(createPendingMcpTask(target.platform, target, "未实现平台 adapter"));
      continue;
    }

    try {
      const items = await adapter.fetchItems(target);
      if (items.length === 0) {
        pendingMcpTasks.push(createPendingMcpTask(target.platform, target, "API 未返回结果，需要浏览器 MCP 补采"));
      }
      rawItems.push(...items);
    } catch (error) {
      pendingMcpTasks.push(createPendingMcpTask(target.platform, target, error instanceof Error ? error.message : "抓取失败"));
    }
  }

  const selectedReviews = selectTopReputation({ items: rawItems, models: rankedModelsData, perModelPlatform: minReviewsPerModelPlatform });
  const mergedReviews = mergeReviews([...(existingReputationExcerpts as typeof selectedReviews), ...selectedReviews]);
  const scores = rankedModelsData.map((model) => ({
    modelId: model.id,
    modelName: model.rankName,
    reputationScore: calculateReputationScore(mergedReviews.filter((review) => review.modelId === model.id), new Date(collectedAt), model.officialUseCases),
    selectedCount: mergedReviews.filter((review) => review.modelId === model.id).length
  }));

  const report = {
    collectedAt,
    targetCount: targets.length,
    rawCount: rawItems.length,
    selectedCount: selectedReviews.length,
    mergedCount: mergedReviews.length,
    selectedReviews,
    scores,
    pendingMcpTasks
  };

  await writeFile("data/reputation-excerpts.json", `${JSON.stringify(mergedReviews, null, 2)}\n`, "utf8");
  await writeFile("data/daily-reputation.latest.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile("data/mcp-tasks.latest.json", `${JSON.stringify({ collectedAt, pendingMcpTasks }, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({ collectedAt, rawCount: rawItems.length, selectedCount: selectedReviews.length, mergedCount: mergedReviews.length, pendingMcpTaskCount: pendingMcpTasks.length }, null, 2));
}

function mergeReviews<T extends { platform: string; modelId: string; sourceUrl: string; quote: string }>(reviews: T[]): T[] {
  const seen = new Set<string>();
  const merged: T[] = [];

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

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
