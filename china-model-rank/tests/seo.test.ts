import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { absoluteUrl } from "@/lib/site";

describe("seo routes", () => {
  it("hides ops routes from robots", () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;

    expect(rules?.disallow).toContain("/ops-console");
    expect(rules?.disallow).toContain("/admin");
  });

  it("includes homepage and model pages in sitemap", () => {
    const entries = sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls.some((url) => url.endsWith("/models/qwen-max"))).toBe(true);
    expect(urls[0]).toMatch(/^https:\/\//);
  });

  it("uses the GitHub Pages site url by default", () => {
    expect(absoluteUrl("/models/deepseek-r1")).toBe("https://page.far-domain.top/china-model-rank/models/deepseek-r1");
  });
});
