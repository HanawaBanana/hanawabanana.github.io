import { describe, expect, it } from "vitest";
import { ArtificialAnalysisSource, LiveBenchSource, parseLiveBenchCsv } from "@/lib/benchmark-adapters";
import { rankedModelsData } from "@/lib/data";

describe("benchmark adapters", () => {
  it("parses LiveBench CSV rows and maps them to capability, coding and data-analysis evidence", () => {
    const rows = parseLiveBenchCsv("model,global,reasoning,math,coding,language,data_analysis,instruction_following\nQwen Max,88,90,86,89,87,84,82");
    const result = new LiveBenchSource().collect(rankedModelsData, {
      collectedAt: "2026-05-16T00:00:00.000Z",
      liveBenchRows: rows,
      liveBenchSourceUrl: "https://livebench.ai/"
    });

    const qwenEvidence = result.evidenceSources.find((source) => source.modelId === "qwen-max");
    expect(qwenEvidence?.category).toBe("capability");
    expect(qwenEvidence?.normalizedValue).toBe(88);
    expect(qwenEvidence?.sourceUrl).toBe("https://livebench.ai/");
    expect(result.evidenceSources.some((source) => source.modelId === "qwen-max" && source.category === "coding")).toBe(true);
    expect(result.evidenceSources.some((source) => source.modelId === "qwen-max" && source.category === "dataAnalysis")).toBe(true);
  });

  it("requires an Artificial Analysis API key before network collection", async () => {
    const result = await new ArtificialAnalysisSource().collect(rankedModelsData, {
      collectedAt: "2026-05-16T00:00:00.000Z"
    });

    expect(result.evidenceSources).toHaveLength(0);
    expect(result.warnings.join(" ")).toContain("ARTIFICIAL_ANALYSIS_API_KEY");
  });

  it("maps Artificial Analysis imported rows to capability evidence", () => {
    const result = new ArtificialAnalysisSource().collectFromRows(
      rankedModelsData,
      [{ name: "DeepSeek R1", intelligence_index: 94, coding_score: 91 }],
      "https://artificialanalysis.ai/leaderboards/models",
      "2026-05-16"
    );

    expect(result.evidenceSources.some((source) => source.modelId === "deepseek-r1" && source.category === "capability")).toBe(true);
    expect(result.evidenceSources.some((source) => source.modelId === "deepseek-r1" && source.category === "coding")).toBe(true);
  });
});
