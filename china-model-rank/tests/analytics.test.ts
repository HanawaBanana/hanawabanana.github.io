import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { classifyTrafficSource, stableHash } from "@/lib/analytics";

const projectRoot = process.cwd();

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

  it("keeps Google Analytics enabled for Pages builds", () => {
    const workflow = readFileSync(join(projectRoot, "../.github/workflows/deploy-pages.yml"), "utf8");
    const packageJson = readFileSync(join(projectRoot, "package.json"), "utf8");
    const gaComponent = readFileSync(join(projectRoot, "components/GoogleAnalytics.tsx"), "utf8");
    const layout = readFileSync(join(projectRoot, "app/layout.tsx"), "utf8");

    expect(workflow).toContain('NEXT_PUBLIC_GA_MEASUREMENT_ID: "G-W80TF1WPB4"');
    expect(workflow).not.toContain("NEXT_PUBLIC_DISABLE_ANALYTICS");
    expect(packageJson).toContain("NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID:-G-W80TF1WPB4}");
    expect(gaComponent).toContain("https://www.googletagmanager.com/gtag/js?id=");
    expect(gaComponent).toContain("gtag('config'");
    expect(layout).toContain("<GoogleAnalytics />");
  });
});
