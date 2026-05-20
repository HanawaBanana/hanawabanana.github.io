import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { absoluteUrl } from "@/lib/site";

const projectRoot = process.cwd();

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

  it("exposes root discovery files for search engines", () => {
    const rootRobots = readFileSync(join(projectRoot, "../robots.txt"), "utf8");
    const rootSitemap = readFileSync(join(projectRoot, "../sitemap.xml"), "utf8");
    const rootIndex = readFileSync(join(projectRoot, "../index.html"), "utf8");
    const workflow = readFileSync(join(projectRoot, "../.github/workflows/deploy-pages.yml"), "utf8");

    expect(rootRobots).toContain("Sitemap: https://page.far-domain.top/sitemap.xml");
    expect(rootRobots).toContain("Sitemap: https://page.far-domain.top/china-model-rank/sitemap.xml");
    expect(rootSitemap).toContain("https://page.far-domain.top/china-model-rank/sitemap.xml");
    expect(rootIndex).toContain('href="https://page.far-domain.top/china-model-rank/"');
    expect(workflow).toContain("cp ../CNAME ../robots.txt ../sitemap.xml ../index.html ../page-artifact/");
  });
});
