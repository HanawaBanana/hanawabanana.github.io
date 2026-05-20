import Link from "next/link";
import type { RankedModel } from "@/lib/types";

export function ReputationSummary({ models }: { models: RankedModel[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {models.map((model) => {
        const reputationContribution = model.score.contributions.find((item) => item.category === "userReputation");
        const scoredPlatforms = model.score.platformReputation.filter((platform) => platform.score !== null);
        const shownPlatforms = scoredPlatforms.length > 0 ? scoredPlatforms.slice(0, 2) : model.score.platformReputation.slice(0, 2);

        return (
          <article key={model.id} className="ledger-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="ink-label">#{model.score.rank} · {model.vendor.name}</p>
                <Link href={`/models/${model.slug}#reputation`} className="font-display text-2xl font-black text-coal hover:text-cinnabar">
                  {model.rankName}
                </Link>
              </div>
              <span className="font-display text-3xl font-black text-cinnabar">
                {reputationContribution?.score === null ? "待补源" : model.score.breakdown.userReputation.toFixed(1)}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {shownPlatforms.map((platform) => (
                <Link
                  key={platform.platform}
                  href={`/models/${model.slug}#reputation`}
                  className="block rounded-3xl border border-ink/10 bg-paper/70 p-4 shadow-insetLine transition hover:border-cinnabar/40 hover:bg-bone"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="seal">{platform.label}</span>
                    <span className={platform.score === null ? "seal" : "seal border-cinnabar/25 bg-cinnabar/10 text-cinnabar"}>
                      {platform.score === null ? "待补源" : `平台分 ${platform.score.toFixed(1)}`}
                    </span>
                    <span className="seal">原文 {platform.sampleCount}/{platform.requiredSampleCount}</span>
                  </div>
                  <p className="font-display text-lg font-black leading-8 text-coal">{platform.summary}</p>
                </Link>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}
