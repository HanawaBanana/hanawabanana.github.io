import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const projectRoot = process.cwd();

describe("frontend copy", () => {
  it("does not expose internal audit or example wording on public homepage components", () => {
    const files = [
      "app/page.tsx",
      "components/RankingTable.tsx",
      "components/ReputationSummary.tsx",
      "components/ReviewList.tsx",
      "components/ModelCard.tsx"
    ];

    const combined = files.map((file) => readFileSync(join(projectRoot, file), "utf8")).join("\n");

    expect(combined).not.toContain("审核");
    expect(combined).not.toContain("示例数据");
    expect(combined).not.toContain("Evidence");
    expect(combined).not.toContain("Priority");
  });

  it("keeps homepage SEO copy focused on model ranking and reputation keywords", () => {
    const files = [
      "app/layout.tsx",
      "app/page.tsx",
      "components/NaturalSearchSections.tsx",
      "components/RankingTable.tsx",
      "components/SeoJsonLd.tsx"
    ];

    const combined = files.map((file) => readFileSync(join(projectRoot, file), "utf8")).join("\n");
    const requiredTerms = [
      "中国大模型",
      "大模型排行",
      "中国大模型排行",
      "大模型排行榜",
      "用户口碑",
      "大模型评分对比",
      "DeepSeek",
      "通义千问",
      "Kimi",
      "豆包",
      "文心一言",
      "智谱 GLM",
      "混元"
    ];

    requiredTerms.forEach((term) => {
      expect(combined).toContain(term);
    });
  });
});
