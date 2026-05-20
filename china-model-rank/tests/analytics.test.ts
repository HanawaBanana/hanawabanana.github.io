import { describe, expect, it } from "vitest";
import { classifyTrafficSource, stableHash } from "@/lib/analytics";

describe("traffic source classification", () => {
  it("detects Chinese and global search engines", () => {
    expect(classifyTrafficSource({ referrer: "https://www.baidu.com/s?wd=国产大模型排名" })).toEqual({
      sourceType: "organic_search",
      searchEngine: "baidu"
    });
    expect(classifyTrafficSource({ referrer: "https://www.sogou.com/web?query=通义千问评分" })).toEqual({
      sourceType: "organic_search",
      searchEngine: "sogou"
    });
    expect(classifyTrafficSource({ referrer: "https://www.bing.com/search?q=DeepSeek排名" })).toEqual({
      sourceType: "organic_search",
      searchEngine: "bing"
    });
    expect(classifyTrafficSource({ referrer: "https://www.google.com/search?q=Chinese+AI+model+ranking" })).toEqual({
      sourceType: "organic_search",
      searchEngine: "google"
    });
  });

  it("detects campaign and internal traffic", () => {
    expect(classifyTrafficSource({ utmSource: "newsletter" }).sourceType).toBe("campaign");
    expect(
      classifyTrafficSource({
        referrer: "https://example.com/models/qwen-max",
        siteUrl: "https://example.com"
      }).sourceType
    ).toBe("internal");
  });

  it("hashes session and user agent values", () => {
    expect(stableHash("abc")).toHaveLength(64);
    expect(stableHash("abc")).toBe(stableHash("abc"));
    expect(stableHash(null)).toBeNull();
  });
});
