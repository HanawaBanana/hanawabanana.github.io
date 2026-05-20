export type BenchmarkMetricKey =
  | "aa_intelligence"
  | "aa_coding"
  | "aa_price"
  | "livebench_global"
  | "livebench_reasoning"
  | "livebench_math"
  | "livebench_coding"
  | "livebench_language"
  | "livebench_data_analysis"
  | "livebench_instruction_following";

export type BenchmarkSourceDefinition = {
  id: string;
  name: string;
  homepage: string;
  adapter: "api" | "dataset";
  usableFor: Array<"capability" | "coding" | "dataAnalysis" | "priceAccess">;
  metrics: BenchmarkMetricKey[];
  attribution: string;
  currentStatus: "configured" | "needs_key" | "manual_import";
  notes: string;
};

export const benchmarkSources: BenchmarkSourceDefinition[] = [
  {
    id: "artificial-analysis",
    name: "Artificial Analysis",
    homepage: "https://artificialanalysis.ai/leaderboards/models",
    adapter: "api",
    usableFor: ["capability", "coding", "priceAccess"],
    metrics: ["aa_intelligence", "aa_coding", "aa_price"],
    attribution: "使用官方 API 或页面公开指标时必须标注 Artificial Analysis、指标名、模型榜单或 API 文档和 retrievedAt。",
    currentStatus: "needs_key",
    notes: "适合作为通用能力、代码相关能力和价格信号的外部数据源；生产抓取应走官方 API 并缓存，不能前端直连。API 文档：https://artificialanalysis.ai/api-reference/。"
  },
  {
    id: "livebench",
    name: "LiveBench",
    homepage: "https://livebench.ai/",
    adapter: "dataset",
    usableFor: ["capability", "coding", "dataAnalysis"],
    metrics: [
      "livebench_global",
      "livebench_reasoning",
      "livebench_math",
      "livebench_coding",
      "livebench_language",
      "livebench_data_analysis",
      "livebench_instruction_following"
    ],
    attribution: "使用 livebench.ai、GitHub 或 Hugging Face 数据时标注 LiveBench、数据文件、分项和 retrievedAt。",
    currentStatus: "manual_import",
    notes: "适合补充客观能力、代码和数据分析分项；不能替代真实用户口碑。开源仓库：https://github.com/livebench/livebench。"
  }
];

export function getBenchmarkSourcesForScore() {
  return benchmarkSources;
}
