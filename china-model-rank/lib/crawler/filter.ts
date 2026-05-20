import { normalizeRawItem } from "@/lib/crawler/normalize";
import type { RawCrawlItem } from "@/lib/crawler/types";
import { isActualContentUrl } from "@/lib/content-source";
import { matchOfficialUseCases } from "@/lib/scoring";
import type { Model, NormalizedReview } from "@/lib/types";

function normalizeText(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

export function isRelevantToModel(item: RawCrawlItem, model: Model): boolean {
  const haystack = normalizeText(`${item.title} ${item.text}`);
  const terms = [model.name, model.family, ...model.aliases].map(normalizeText).filter((term) => term.length >= 2);
  return terms.some((term) => haystack.includes(term));
}

export function dedupeRawItems(items: RawCrawlItem[]): RawCrawlItem[] {
  const seen = new Set<string>();
  const deduped: RawCrawlItem[] = [];

  for (const item of items) {
    const key = item.sourceUrl || `${item.platform}:${item.modelId}:${normalizeText(item.title).slice(0, 60)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(item);
  }

  return deduped;
}

export function qualityScore(item: RawCrawlItem): number {
  const textLength = item.text.trim().length;
  const engagement = item.engagementMetrics?.reduce((sum, metric) => sum + (metric.positive ? metric.value : metric.value * 0.25), 0) ?? item.engagement;
  const hasSource = isActualContentUrl(item.sourceUrl) ? 25 : 0;
  const lengthScore = Math.min(textLength / 120, 1) * 25;
  const engagementScore = Math.min(engagement / 1000, 1) * 35;
  const positiveScore = Math.min((item.positiveSignals?.length ?? 0) * 8, 20);
  return Number((hasSource + lengthScore + engagementScore + positiveScore).toFixed(2));
}

function hasVerifiedMetrics(item: RawCrawlItem) {
  return (item.engagementMetrics ?? []).some((metric) => !metric.key.includes("public_search") && metric.value > 0);
}

function useCaseFit(item: RawCrawlItem, model: Model) {
  const normalized = normalizeRawItem(item);
  return matchOfficialUseCases(normalized, model.officialUseCases).length;
}

export function selectTopReputation(input: {
  items: RawCrawlItem[];
  models: Model[];
  perModel?: number;
  perModelPlatform?: number;
}): NormalizedReview[] {
  const perModel = input.perModel ?? 2;
  const perModelPlatform = input.perModelPlatform;
  const deduped = dedupeRawItems(input.items);

  return input.models.flatMap((model) => {
    const candidates = deduped
      .filter((item) => item.modelId === model.id)
      .filter((item) => isRelevantToModel(item, model))
      .filter((item) => isActualContentUrl(item.sourceUrl))
      .filter(hasVerifiedMetrics)
      .filter((item) => item.text.trim().length >= 20)
      .sort((a, b) => useCaseFit(b, model) - useCaseFit(a, model) || qualityScore(b) - qualityScore(a));
    const selected = perModelPlatform
      ? [...new Set(candidates.map((item) => item.platform))].flatMap((platform) =>
          candidates.filter((item) => item.platform === platform).slice(0, perModelPlatform)
        )
      : candidates.slice(0, perModel);

    return selected.map((item) => {
      const normalized = normalizeRawItem(item);
      return {
        ...normalized,
        useCaseMatches: matchOfficialUseCases(normalized, model.officialUseCases),
        auditStatus: "approved" as const
      };
    });
  });
}
