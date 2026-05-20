import Link from "next/link";
import { BreakdownBars } from "@/components/BreakdownBars";
import { ScoreDial } from "@/components/ScoreDial";
import { formatMetric, platformLabel, topEngagementMetric } from "@/lib/review-evidence";
import type { RankedModel } from "@/lib/types";

type ModelCardProps = {
  model: RankedModel;
};

export function ModelCard({ model }: ModelCardProps) {
  const delta = model.score.previousRank - model.score.rank;
  const topReview = [...model.reviews]
    .filter((review) => review.auditStatus === "approved")
    .sort((a, b) => b.engagement - a.engagement)[0];
  const topMetric = topReview ? topEngagementMetric(topReview) : undefined;

  return (
    <article className="ledger-card group relative overflow-hidden p-5 transition duration-300 hover:-translate-y-1 hover:bg-bone">
      <div className="absolute right-5 top-5 font-display text-7xl font-black text-coal/[0.04]">
        {String(model.score.rank).padStart(2, "0")}
      </div>
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start">
        <ScoreDial score={model.score.total} />
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="seal">#{model.score.rank}</span>
            <span className="seal">{model.vendor.shortName}</span>
            <span className="seal">{delta >= 0 ? `上升 ${delta}` : `下降 ${Math.abs(delta)}`}</span>
          </div>
          <Link href={`/models/${model.slug}`} className="font-display text-3xl font-black tracking-tight text-coal transition group-hover:text-cinnabar">
            {model.rankName}
          </Link>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-graphite">{model.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {model.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-coal/5 px-3 py-1 text-xs font-bold text-coal/70">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="w-full lg:w-72">
          <BreakdownBars breakdown={model.score.breakdown} contributions={model.score.contributions} />
        </div>
      </div>
      <div className="relative mt-5 grid gap-3 border-t border-ink/10 pt-4 text-sm text-graphite sm:grid-cols-3">
        <span>来源平台：{model.score.sourceCount}</span>
        <span>口碑：{model.score.reviewCount} 条</span>
        <span>
          最高互动：
          {topReview && topMetric ? `${platformLabel[topReview.platform]} · ${formatMetric(topMetric)}` : "待接入"}
        </span>
      </div>
    </article>
  );
}
