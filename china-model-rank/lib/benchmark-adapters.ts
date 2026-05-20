import type { EvidenceSource, Model, ScoreCategoryKey } from "@/lib/types";

export type BenchmarkImportResult = {
  evidenceSources: EvidenceSource[];
  warnings: string[];
};

export type BenchmarkCollectOptions = {
  collectedAt?: string;
  artificialAnalysisApiKey?: string;
  artificialAnalysisEndpoint?: string;
  liveBenchRows?: LiveBenchRow[];
  liveBenchSourceUrl?: string;
};

export type LiveBenchRow = {
  model: string;
  global?: number;
  reasoning?: number;
  math?: number;
  coding?: number;
  language?: number;
  dataAnalysis?: number;
  instructionFollowing?: number;
};

type UnknownRecord = Record<string, unknown>;

function today(collectedAt?: string) {
  return (collectedAt ?? new Date().toISOString()).slice(0, 10);
}

function normalizeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "");
}

function modelCandidates(model: Model) {
  return [model.name, model.rankName, model.detailName, model.family, ...model.aliases].map(normalizeName);
}

function rowName(row: UnknownRecord) {
  const value = row.name ?? row.model ?? row.model_name ?? row.modelName ?? row.slug ?? row.id;
  return typeof value === "string" ? value : "";
}

function matchesModel(model: Model, name: string) {
  const normalized = normalizeName(name);
  if (!normalized) {
    return false;
  }

  return modelCandidates(model).some((candidate) => normalized.includes(candidate) || candidate.includes(normalized));
}

function numberFrom(record: UnknownRecord, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

function clampScore(value: number) {
  return Number(Math.max(0, Math.min(100, value)).toFixed(1));
}

function normalizeBenchmarkScore(value: number) {
  if (value <= 1) {
    return clampScore(value * 100);
  }
  return clampScore(value);
}

function asRecordArray(payload: unknown): UnknownRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is UnknownRecord => typeof item === "object" && item !== null);
  }
  if (typeof payload !== "object" || payload === null) {
    return [];
  }

  const record = payload as UnknownRecord;
  for (const key of ["data", "models", "results", "items"]) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value.filter((item): item is UnknownRecord => typeof item === "object" && item !== null);
    }
  }

  return [];
}

export class ArtificialAnalysisSource {
  readonly id = "artificial-analysis";
  readonly name = "Artificial Analysis";
  readonly defaultEndpoint = "https://artificialanalysis.ai/api/v2/data/llms/models";

  async collect(models: Model[], options: BenchmarkCollectOptions = {}): Promise<BenchmarkImportResult> {
    const apiKey = options.artificialAnalysisApiKey;
    if (!apiKey) {
      return {
        evidenceSources: [],
        warnings: ["缺少 ARTIFICIAL_ANALYSIS_API_KEY，Artificial Analysis 官方 API 未抓取。"]
      };
    }

    const endpoint = options.artificialAnalysisEndpoint ?? this.defaultEndpoint;
    const response = await fetch(endpoint, {
      headers: {
        "x-api-key": apiKey,
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      return {
        evidenceSources: [],
        warnings: [`Artificial Analysis API 返回 ${response.status}，未写入 benchmark 证据。`]
      };
    }

    const rows = asRecordArray(await response.json());
    return this.collectFromRows(models, rows, endpoint, today(options.collectedAt));
  }

  collectFromRows(models: Model[], rows: UnknownRecord[], sourceUrl: string, retrievedAt = today()): BenchmarkImportResult {
    const evidenceSources: EvidenceSource[] = [];
    const warnings: string[] = [];

    for (const model of models) {
      const row = rows.find((item) => matchesModel(model, rowName(item)));
      if (!row) {
        warnings.push(`Artificial Analysis 未匹配到 ${model.rankName}`);
        continue;
      }

      const intelligence = numberFrom(row, ["intelligence_index", "intelligenceIndex", "quality", "score"]);
      const coding = numberFrom(row, ["coding", "code", "code_score", "coding_score", "livecodebench", "live_code_bench", "swe_bench", "swebench"]);
      const price = numberFrom(row, ["price_1m_blended", "blended_price", "price"]);

      if (typeof intelligence === "number") {
        evidenceSources.push(this.toEvidence(model, "capability", "Intelligence Index", intelligence, sourceUrl, retrievedAt, row));
      }

      if (typeof coding === "number") {
        evidenceSources.push(this.toEvidence(model, "coding", "Coding benchmark signal", coding, sourceUrl, retrievedAt, row));
      }

      if (typeof price === "number") {
        evidenceSources.push(this.toEvidence(model, "priceAccess", "Artificial Analysis price signal", price, sourceUrl, retrievedAt, row));
      }
    }

    return { evidenceSources, warnings };
  }

  private toEvidence(
    model: Model,
    category: ScoreCategoryKey,
    metricName: string,
    value: number,
    sourceUrl: string,
    retrievedAt: string,
    row: UnknownRecord
  ): EvidenceSource {
    return {
      id: `ev-${model.id}-aa-${category}`,
      modelId: model.id,
      sourceName: this.name,
      sourceUrl,
      retrievedAt,
      metricName,
      rawValue: JSON.stringify(row).slice(0, 500),
      normalizedValue: normalizeBenchmarkScore(value),
      confidence: 0.86,
      category,
      note: "由 Artificial Analysis 官方 API 导入，需保留模型页或 API 返回来源。"
    };
  }
}

export class LiveBenchSource {
  readonly id = "livebench";
  readonly name = "LiveBench";
  readonly defaultSourceUrl = "https://livebench.ai/";

  collect(models: Model[], options: BenchmarkCollectOptions = {}): BenchmarkImportResult {
    if (!options.liveBenchRows?.length) {
      return {
        evidenceSources: [],
        warnings: ["缺少 LiveBench 导入行，需提供 LIVEBENCH_CSV_PATH 或 JSON 输入。"]
      };
    }

    const sourceUrl = options.liveBenchSourceUrl ?? this.defaultSourceUrl;
    const retrievedAt = today(options.collectedAt);
    const evidenceSources: EvidenceSource[] = [];
    const warnings: string[] = [];

    for (const model of models) {
      const row = options.liveBenchRows.find((item) => matchesModel(model, item.model));
      if (!row) {
        warnings.push(`LiveBench 未匹配到 ${model.rankName}`);
        continue;
      }

      const categoryScores = [
        row.reasoning,
        row.math,
        row.coding,
        row.language,
        row.dataAnalysis,
        row.instructionFollowing
      ].filter((value): value is number => typeof value === "number");
      const global = row.global ?? (categoryScores.length ? categoryScores.reduce((sum, value) => sum + value, 0) / categoryScores.length : undefined);

      if (typeof global !== "number") {
        warnings.push(`LiveBench ${model.rankName} 缺少 global 或分项分数`);
        continue;
      }

      evidenceSources.push({
        id: `ev-${model.id}-livebench`,
        modelId: model.id,
        sourceName: this.name,
        sourceUrl,
        retrievedAt,
        metricName: "Global score and task categories",
        rawValue: [
          `global ${global}`,
          `reasoning ${row.reasoning ?? "N/A"}`,
          `math ${row.math ?? "N/A"}`,
          `coding ${row.coding ?? "N/A"}`,
          `language ${row.language ?? "N/A"}`,
          `data_analysis ${row.dataAnalysis ?? "N/A"}`,
          `instruction_following ${row.instructionFollowing ?? "N/A"}`
        ].join("；"),
        normalizedValue: normalizeBenchmarkScore(global),
        confidence: 0.78,
        category: "capability",
        note: "LiveBench 只作为能力分来源，不替代真实用户口碑。"
      });

      if (typeof row.coding === "number") {
        evidenceSources.push({
          id: `ev-${model.id}-livebench-coding`,
          modelId: model.id,
          sourceName: this.name,
          sourceUrl,
          retrievedAt,
          metricName: "Coding category",
          rawValue: `coding ${row.coding}`,
          normalizedValue: normalizeBenchmarkScore(row.coding),
          confidence: 0.82,
          category: "coding",
          note: "LiveBench coding 分项导入，作为代码能力的可追溯来源。"
        });
      }

      if (typeof row.dataAnalysis === "number") {
        evidenceSources.push({
          id: `ev-${model.id}-livebench-data-analysis`,
          modelId: model.id,
          sourceName: this.name,
          sourceUrl,
          retrievedAt,
          metricName: "Data analysis category",
          rawValue: `data_analysis ${row.dataAnalysis}`,
          normalizedValue: normalizeBenchmarkScore(row.dataAnalysis),
          confidence: 0.82,
          category: "dataAnalysis",
          note: "LiveBench data_analysis 分项导入，作为数据分析能力的可追溯来源。"
        });
      }
    }

    return { evidenceSources, warnings };
  }
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === "\"" && next === "\"") {
      current += "\"";
      index += 1;
      continue;
    }
    if (char === "\"") {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function numericCell(record: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (value && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
}

export function parseLiveBenchCsv(input: string): LiveBenchRow[] {
  const lines = input.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0] ?? "").map(normalizeHeader);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
    return {
      model: record.model || record.model_name || record.name || "",
      global: numericCell(record, ["global", "score", "average", "overall"]),
      reasoning: numericCell(record, ["reasoning"]),
      math: numericCell(record, ["math"]),
      coding: numericCell(record, ["coding", "code"]),
      language: numericCell(record, ["language"]),
      dataAnalysis: numericCell(record, ["data_analysis", "dataanalysis"]),
      instructionFollowing: numericCell(record, ["instruction_following", "instructionfollowing", "if"])
    };
  }).filter((row) => row.model);
}
