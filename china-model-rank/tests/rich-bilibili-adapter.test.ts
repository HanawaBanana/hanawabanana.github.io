import { afterEach, describe, expect, it, vi } from "vitest";
import { richBilibiliAdapter } from "@/lib/crawler/platforms/rich-bilibili";

describe("rich bilibili adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("collects video metadata plus top comments and replies", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/view?bvid=")) {
        return {
          ok: true,
          json: async () => ({
            code: 0,
            data: {
              aid: 100,
              bvid: "BV1a8AnzNENY",
              title: "DeepSeek R1 使用感受",
              desc: "真实体验 DeepSeek R1 解决代码问题。",
              pubdate: 1774001255,
              owner: { name: "AI测评" },
              stat: { view: 12000, like: 900, favorite: 600, coin: 200, reply: 80, share: 30 }
            }
          })
        };
      }

      if (url.includes("/reply/main")) {
        return {
          ok: true,
          json: async () => ({
            code: 0,
            data: {
              replies: [
                {
                  rpid: 1,
                  ctime: 1774001300,
                  like: 88,
                  content: { message: "拿来实际解决问题很好用。" },
                  member: { uname: "用户A" },
                  replies: [
                    {
                      rpid: 2,
                      ctime: 1774001400,
                      like: 11,
                      content: { message: "代码场景确实顺手。" },
                      member: { uname: "用户B" }
                    }
                  ]
                }
              ]
            }
          })
        };
      }

      throw new Error(`unexpected url ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const posts = await richBilibiliAdapter.searchPosts({
      platform: "bilibili",
      modelId: "deepseek-r1",
      modelName: "DeepSeek",
      aliases: ["DeepSeek"],
      keyword: "DeepSeek BV1a8AnzNENY 使用感受",
      url: "https://www.bilibili.com/video/BV1a8AnzNENY"
    });

    expect(posts).toHaveLength(1);
    expect(posts[0]?.sourceUrl).toBe("https://www.bilibili.com/video/BV1a8AnzNENY");
    expect(posts[0]?.comments[0]?.content).toContain("实际解决问题");
    expect(posts[0]?.comments[0]?.replies[0]?.content).toContain("代码场景");
    expect(posts[0]?.engagementMetrics.find((item) => item.label === "收藏")?.value).toBe(600);
  });
});
