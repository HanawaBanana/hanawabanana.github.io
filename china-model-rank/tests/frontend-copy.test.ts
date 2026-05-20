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
});
