import { readFile, writeFile } from "fs/promises";
import existingReputationExcerpts from "@/data/reputation-excerpts.json";
import { judgePostReputation } from "@/lib/crawler/reputation-judge";
import { judgementToReview, modelMatchesPost, stableHash } from "@/lib/crawler/rich-utils";
import { matchOfficialUseCases } from "@/lib/scoring";
import { rankedModelsData } from "@/lib/data";
import type { CrawledPost } from "@/lib/crawler/rich-types";
import type { Model, NormalizedReview } from "@/lib/types";

const keywords = new Set(["国产AI对比", "国产大模型对比", "国产AI使用感受"]);
const discoverModelId = "__discover__";

function assignPostToModel(post: CrawledPost, model: Model): CrawledPost {
  return {
    ...post,
    id: `${post.id}-${stableHash(model.id)}`,
    modelId: model.id
  };
}

function modelCandidatesForPost(post: CrawledPost) {
  if (post.modelId !== discoverModelId) {
    return rankedModelsData.filter((model) => model.id === post.modelId);
  }

  return rankedModelsData.filter((model) => modelMatchesPost(post, model));
}

function isCurrentKeywordReview(review: NormalizedReview) {
  return review.platform === "bilibili"
    && review.collectedAt.startsWith("2026-05-18")
    && [
      "https://www.bilibili.com/video/BV1srd8BAEvr",
      "https://www.bilibili.com/video/BV1iw5q6qEuM",
      "https://www.bilibili.com/video/BV17h5J69Ehh",
      "https://www.bilibili.com/video/BV1NHZFBHE92",
      "https://www.bilibili.com/video/BV1TdReBLERa",
      "https://www.bilibili.com/video/BV1AgXSB5ESx",
      "https://www.bilibili.com/video/BV1Vgd2BtEZE",
      "https://www.bilibili.com/video/BV1QJ4m1L77Q"
    ].includes(review.sourceUrl);
}

function mergeReviews(existing: NormalizedReview[], selected: NormalizedReview[]) {
  const seen = new Set<string>();
  const merged: NormalizedReview[] = [];

  for (const review of [...selected, ...existing]) {
    const key = `${review.platform}:${review.modelId}:${review.sourceUrl}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(review);
  }

  return merged;
}

async function main() {
  const latest = JSON.parse(await readFile("data/crawler/latest-run.json", "utf8")) as { posts: CrawledPost[] };
  const selectedReviews: NormalizedReview[] = [];

  for (const post of latest.posts.filter((item) => keywords.has(item.keyword))) {
    for (const model of modelCandidatesForPost(post)) {
      const assignedPost = assignPostToModel(post, model);
      const judgement = await judgePostReputation(assignedPost, model);
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

  const existing = (existingReputationExcerpts as NormalizedReview[]).filter((review) => !isCurrentKeywordReview(review));
  const merged = mergeReviews(existing, selectedReviews);
  await writeFile("data/reputation-excerpts.json", `${JSON.stringify(merged, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    selectedCount: selectedReviews.length,
    mergedCount: merged.length,
    selected: selectedReviews.map((review) => ({
      modelId: review.modelId,
      title: review.title,
      sourceUrl: review.sourceUrl,
      sentiment: review.sentiment,
      quote: review.quote
    }))
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
