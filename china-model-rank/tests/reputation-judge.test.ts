import { describe, expect, it, vi } from "vitest";
import { judgePostReputation } from "@/lib/crawler/reputation-judge";
import { metric } from "@/lib/crawler/rich-utils";
import { rankedModelsData } from "@/lib/data";
import type { CrawledPost } from "@/lib/crawler/rich-types";

describe("reputation judge", () => {
  it("scores a relevant post with comments and replies without external LLM config", async () => {
    vi.stubEnv("LLM_SCORE_ENDPOINT", "");
    vi.stubEnv("LLM_SCORE_API_KEY", "");
    vi.stubEnv("LLM_SCORE_MODEL", "");

    const model = rankedModelsData.find((item) => item.id === "qwen-max");
    expect(model).toBeDefined();

    const post: CrawledPost = {
      id: "qwen-post",
      platform: "hupu",
      modelId: "qwen-max",
      keyword: "通义千问 实际使用",
      title: "通义千问实际使用能解决写作和代码问题吗",
      content: "我用通义千问整理文档、写代码解释，中文表达稳定，免费入口也好用。",
      sourceUrl: "https://bbs.hupu.com/123456.html",
      sourceTitle: "虎扑帖子：通义千问实际使用",
      author: { label: "虎扑用户：AI体验" },
      publishedAt: "2026-05-10T00:00:00.000Z",
      collectedAt: "2026-05-17T00:00:00.000Z",
      engagementMetrics: [metric("hupu_light", "亮了", 88, true)],
      comments: [
        {
          id: "comment-1",
          author: { label: "虎扑用户：A" },
          content: "确实好用，中文总结和代码解释都挺顺手。",
          sourceUrl: "https://bbs.hupu.com/123456.html#1",
          publishedAt: "2026-05-10T01:00:00.000Z",
          engagementMetrics: [metric("hupu_comment_light", "亮了", 33, true)],
          replies: [
            {
              id: "reply-1",
              author: { label: "虎扑用户：B" },
              content: "免费用起来比我预期稳定。",
              sourceUrl: "https://bbs.hupu.com/123456.html#2",
              publishedAt: "2026-05-10T01:20:00.000Z",
              engagementMetrics: [metric("hupu_reply_light", "亮了", 9, true)]
            }
          ]
        }
      ]
    };

    const judgement = await judgePostReputation(post, model!);

    expect(judgement.relevant).toBe(true);
    expect(judgement.relevance).toBeGreaterThan(0.5);
    expect(judgement.sentiment).toBe("positive");
    expect(judgement.score).toBeGreaterThan(70);
    expect(judgement.topics).toContain("userReputation");
  });

  it("rejects promotional or generic mention posts without real usage evidence", async () => {
    vi.stubEnv("LLM_SCORE_ENDPOINT", "");
    vi.stubEnv("LLM_SCORE_API_KEY", "");
    vi.stubEnv("LLM_SCORE_MODEL", "");

    const model = rankedModelsData.find((item) => item.id === "deepseek-r1");
    expect(model).toBeDefined();

    const post: CrawledPost = {
      id: "promo-post",
      platform: "bilibili",
      modelId: "deepseek-r1",
      keyword: "DeepSeek R1 使用感受",
      title: "DeepSeek R1 使用自由，获取地址关注私信",
      content: "DeepSeek 满血版直连官网，不限次数，一站全搞定，三联关注 UP 获取地址。",
      sourceUrl: "https://www.bilibili.com/video/BV1sfLuzZERU",
      sourceTitle: "B站视频：DeepSeek R1 使用自由",
      author: { label: "B站创作者：推广" },
      publishedAt: "2026-05-10T00:00:00.000Z",
      collectedAt: "2026-05-17T00:00:00.000Z",
      engagementMetrics: [metric("bilibili_view", "播放", 30000, true)],
      comments: []
    };

    const judgement = await judgePostReputation(post, model!);

    expect(judgement.relevant).toBe(false);
    expect(judgement.confidence).toBeLessThan(0.45);
  });

  it("uses model-specific comment text for sentiment in comparison videos", async () => {
    vi.stubEnv("LLM_SCORE_ENDPOINT", "");
    vi.stubEnv("LLM_SCORE_API_KEY", "");
    vi.stubEnv("LLM_SCORE_MODEL", "");

    const model = rankedModelsData.find((item) => item.id === "minimax-abab");
    expect(model).toBeDefined();

    const post: CrawledPost = {
      id: "compare-post",
      platform: "bilibili",
      modelId: "minimax-abab",
      keyword: "国产AI对比",
      title: "三强真实数据测，Kimi vs GLM vs Qwen 对比，也聊 MiniMax-M2.7",
      content: "国产模型横评，对比多款代码模型。",
      sourceUrl: "https://www.bilibili.com/video/BV1Vgd2BtEZE",
      sourceTitle: "B站视频：国产模型横评",
      author: { label: "B站创作者：横评" },
      publishedAt: "2026-05-10T00:00:00.000Z",
      collectedAt: "2026-05-18T00:00:00.000Z",
      engagementMetrics: [metric("bilibili_view", "播放", 17000, true)],
      comments: [
        {
          id: "comment-minimax",
          author: { label: "B站用户：A" },
          content: "minimax-M2.7 也加入一下。",
          sourceUrl: "https://www.bilibili.com/video/BV1Vgd2BtEZE#1",
          publishedAt: "2026-05-10T01:00:00.000Z",
          engagementMetrics: [metric("bilibili_comment_like", "点赞", 20, true)],
          replies: [
            {
              id: "reply-minimax",
              author: { label: "B站用户：B" },
              content: "拉得很，改个代码绕来绕去，都改不出来。",
              sourceUrl: "https://www.bilibili.com/video/BV1Vgd2BtEZE#2",
              publishedAt: "2026-05-10T01:20:00.000Z",
              engagementMetrics: [metric("bilibili_reply_like", "点赞", 8, true)]
            }
          ]
        }
      ]
    };

    const judgement = await judgePostReputation(post, model!);

    expect(judgement.relevant).toBe(true);
    expect(judgement.evidenceQuote).toContain("拉得很");
    expect(judgement.sentiment).toBe("negative");
  });
});
