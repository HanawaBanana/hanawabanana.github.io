import { deriveUserReputation } from "@/lib/scoring";
import type { NormalizedReview, OfficialUseCase } from "@/lib/types";

export function calculateReputationScore(reviews: NormalizedReview[], now = new Date(), useCases: OfficialUseCase[] = []): number {
  return deriveUserReputation(reviews, { officialUseCases: useCases }, now) ?? 0;
}
