import { describe, expect, it } from "vitest";
import { dedupePosts, judgementToReview, metric, topByEngagement } from "@/lib/crawler/rich-utils";
import { rankedModelsData } from "@/lib/data";
import type { AiReputationJudgement, CrawledPost } from "@/lib/crawler/rich-types";

function samplePost(overrides: Partial<CrawledPost> = {}): CrawledPost {
  return {
    id: "post-1",
    platform: "bilibili",
    modelId: "deepseek-r1",
    keyword: "DeepSeek R1 使用感受",
    title: "DeepSeek R1 实际使用体验",
    content: "开发者分享 DeepSeek R1 用来解决数学推理和代码问题，反馈稳定且成本低。",
    sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNENY",
    sourceTitle: "B站视频：DeepSeek R1 实际使用体验",
    author: { label: "B站创作者：测试用户" },
    publishedAt: "2026-05-01T00:00:00.000Z",
    collectedAt: "2026-05-17T00:00:00.000Z",
    engagementMetrics: [metric("bilibili_view", "播放", 2000, true)],
    comments: [
      {
        id: "comment-1",
        author: { label: "B站用户：A" },
        content: "确实好用，拿来解决代码问题很顺手。",
        sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNENY#reply1",
        publishedAt: "2026-05-01T01:00:00.000Z",
        engagementMetrics: [metric("bilibili_comment_like", "点赞", 99, true)],
        replies: [
          {
            id: "reply-1",
            author: { label: "B站用户：B" },
            content: "我也用它排查 bug，速度可以。",
            sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNENY#reply2",
            publishedAt: "2026-05-01T02:00:00.000Z",
            engagementMetrics: [metric("bilibili_reply_like", "点赞", 12, true)]
          }
        ]
      }
    ],
    ...overrides
  };
}

describe("rich crawler utils", () => {
  it("converts AI judgement into a scorable excerpt review with source metrics", () => {
    const model = rankedModelsData.find((item) => item.id === "deepseek-r1");
    expect(model).toBeDefined();

    const post = samplePost();
    const judgement: AiReputationJudgement = {
      postId: post.id,
      modelId: post.modelId,
      platform: post.platform,
      sourceUrl: post.sourceUrl,
      relevant: true,
      relevance: 0.9,
      sentiment: "positive",
      confidence: 0.82,
      score: 88,
      evidenceQuote: "确实好用，拿来解决代码问题很顺手。",
      summary: "热评集中在代码排错、推理和低成本使用。",
      positivePoints: ["好用", "解决", "顺手"],
      negativePoints: [],
      topics: ["userReputation", "coding", "priceAccess"]
    };

    const review = judgementToReview(post, judgement, model!);

    expect(review).not.toBeNull();
    expect(review?.auditStatus).toBe("approved");
    expect(review?.quoteType).toBe("excerpt");
    expect(review?.sourceUrl).toBe(post.sourceUrl);
    expect(review?.positiveSignals.join(" ")).toContain("播放");
    expect(review?.engagementMetrics.some((item) => item.label === "点赞")).toBe(true);
  });

  it("does not select posts when hot comments were blocked or missing", () => {
    const model = rankedModelsData.find((item) => item.id === "deepseek-r1");
    expect(model).toBeDefined();

    const post = samplePost({
      comments: [],
      warnings: [{ scope: "comments", reason: "rate_limit", message: "评论接口风控" }]
    });
    const judgement: AiReputationJudgement = {
      postId: post.id,
      modelId: post.modelId,
      platform: post.platform,
      sourceUrl: post.sourceUrl,
      relevant: true,
      relevance: 0.9,
      sentiment: "positive",
      confidence: 0.82,
      score: 88,
      evidenceQuote: "本地部署用起来舒服。",
      summary: "缺少热评，不进入前台口碑。",
      positivePoints: ["舒服"],
      negativePoints: [],
      topics: ["userReputation"]
    };

    expect(judgementToReview(post, judgement, model!)).toBeNull();
  });

  it("keeps highest engagement items and dedupes posts by platform/model/url", () => {
    const posts = [
      samplePost({ id: "a", sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNENY" }),
      samplePost({ id: "b", sourceUrl: "https://www.bilibili.com/video/BV1a8AnzNENY" }),
      samplePost({ id: "c", sourceUrl: "https://www.bilibili.com/video/BV1Q2iXBtEme" })
    ];

    expect(dedupePosts(posts)).toHaveLength(2);
    expect(topByEngagement(posts, 1)[0]?.sourceUrl).toBe("https://www.bilibili.com/video/BV1a8AnzNENY");
  });
});
