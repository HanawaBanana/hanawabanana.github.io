import { scoreLabels } from "@/lib/scoring";
import type { ScoreBreakdown, ScoreContribution } from "@/lib/types";

type BreakdownBarsProps = {
  breakdown: ScoreBreakdown;
  contributions?: ScoreContribution[];
};

export function BreakdownBars({ breakdown, contributions }: BreakdownBarsProps) {
  const scoreByCategory = contributions
    ? Object.fromEntries(contributions.map((contribution) => [contribution.category, contribution.score])) as Partial<Record<keyof ScoreBreakdown, number | null>>
    : undefined;

  return (
    <div className="space-y-3">
      {Object.entries(breakdown).map(([key, value]) => (
        <div key={key}>
          <div className="mb-1 flex items-center justify-between text-xs font-bold text-graphite">
            <span>{scoreLabels[key as keyof ScoreBreakdown]}</span>
            <span>{scoreByCategory && scoreByCategory[key as keyof ScoreBreakdown] === null ? "待补源" : value.toFixed(1)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-coal/10">
            <div
              className={scoreByCategory && scoreByCategory[key as keyof ScoreBreakdown] === null
                ? "h-full rounded-full bg-coal/20"
                : "h-full rounded-full bg-gradient-to-r from-malachite to-cinnabar"}
              style={{ width: `${scoreByCategory && scoreByCategory[key as keyof ScoreBreakdown] === null ? 18 : value}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
