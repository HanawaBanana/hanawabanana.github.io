import { readFile, writeFile } from "fs/promises";
import { ArtificialAnalysisSource, LiveBenchSource, parseLiveBenchCsv } from "@/lib/benchmark-adapters";
import { rankedModelsData } from "@/lib/data";

async function readLiveBenchRows() {
  const filePath = process.env.LIVEBENCH_CSV_PATH;
  if (!filePath) {
    return [];
  }

  return parseLiveBenchCsv(await readFile(filePath, "utf8"));
}

async function main() {
  const collectedAt = new Date().toISOString();
  const aaSource = new ArtificialAnalysisSource();
  const liveBenchSource = new LiveBenchSource();
  const liveBenchRows = await readLiveBenchRows();

  const [aaResult, liveBenchResult] = await Promise.all([
    aaSource.collect(rankedModelsData, {
      collectedAt,
      artificialAnalysisApiKey: process.env.ARTIFICIAL_ANALYSIS_API_KEY,
      artificialAnalysisEndpoint: process.env.ARTIFICIAL_ANALYSIS_ENDPOINT
    }),
    Promise.resolve(liveBenchSource.collect(rankedModelsData, {
      collectedAt,
      liveBenchRows,
      liveBenchSourceUrl: process.env.LIVEBENCH_SOURCE_URL
    }))
  ]);

  const report = {
    collectedAt,
    evidenceSources: [...aaResult.evidenceSources, ...liveBenchResult.evidenceSources],
    warnings: [...aaResult.warnings, ...liveBenchResult.warnings],
    nextSteps: [
      "核对模型名映射，避免把同品牌不同型号误配。",
      "确认来源 URL 可打开到官方 API 文档、模型页或 LiveBench 数据文件。",
      "人工确认后把 evidenceSources 合并进 lib/data.ts 或后续数据库表。"
    ]
  };

  await writeFile("data/benchmark-evidence.latest.json", `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(JSON.stringify({
    collectedAt,
    evidenceCount: report.evidenceSources.length,
    warningCount: report.warnings.length
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

