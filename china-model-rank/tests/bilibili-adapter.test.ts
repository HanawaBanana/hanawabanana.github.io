import { describe, expect, it, vi } from "vitest";
import { bilibiliAdapter } from "@/lib/crawler/platforms/bilibili";

describe("bilibili adapter", () => {
  it("uses public video detail API when target contains a BV id", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        code: 0,
        data: {
          bvid: "BV1a8AnzNENY",
          title: "Gemini 3.1 Pro VS千问3，2026年还需要付费制AI吗",
          pubdate: 1774001255,
          desc: "围绕普通人场景比较千问3与海外付费模型。",
          owner: { name: "草鸡实验室" },
          stat: {
            view: 296032,
            like: 1333,
            favorite: 962,
            coin: 814,
            reply: 290
          }
        }
      })
    }));
    vi.stubGlobal("fetch", fetchMock);

    const items = await bilibiliAdapter.fetchItems({
      platform: "bilibili",
      modelId: "qwen-max",
      keyword: "通义千问 BV1a8AnzNENY",
      url: "https://www.bilibili.com/video/BV1a8AnzNENY"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bilibili.com/x/web-interface/view?bvid=BV1a8AnzNENY",
      expect.objectContaining({ headers: expect.any(Object) })
    );
    expect(items[0]?.sourceUrl).toBe("https://www.bilibili.com/video/BV1a8AnzNENY");
    expect(items[0]?.engagementMetrics?.find((metric) => metric.label === "点赞")?.value).toBe(1333);
    expect(items[0]?.positiveSignals).toContain("播放 296,032");
  });
});
