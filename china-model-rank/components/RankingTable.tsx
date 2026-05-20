import Link from "next/link";
import type { RankedModel } from "@/lib/types";

export function RankingTable({ models }: { models: RankedModel[] }) {
  const reputationContribution = (model: RankedModel) => model.score.contributions.find((item) => item.category === "userReputation");
  const reputationLabel = (model: RankedModel) => {
    const contribution = reputationContribution(model);
    return contribution?.score === null ? "待补源" : model.score.breakdown.userReputation.toFixed(1);
  };

  return (
    <section id="ranking" className="ledger-card overflow-hidden p-0">
      <div className="flex flex-col justify-between gap-4 border-b border-ink/10 bg-coal p-5 text-paper sm:flex-row sm:items-end">
        <div>
          <p className="text-[0.68rem] font-bold tracking-[0.22em] text-paper/60">今日榜单</p>
          <h2 className="mt-2 font-display text-4xl font-black tracking-tight">中国大模型排行综合榜</h2>
        </div>
        <p className="max-w-xl text-sm leading-7 text-paper/70">
          大模型排行榜展示模型名称、公司、综合评分、能力分和用户口碑；App、API 型号、开源地址和价格进入详情页查看。
        </p>
      </div>

      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full border-collapse text-left">
          <thead className="bg-paper text-xs uppercase tracking-[0.16em] text-graphite">
            <tr>
              <th className="px-5 py-4">排名</th>
              <th className="px-5 py-4">模型 / 公司</th>
              <th className="px-5 py-4 text-right">综合评分</th>
              <th className="px-5 py-4 text-right">能力</th>
              <th className="px-5 py-4 text-right">口碑</th>
            </tr>
          </thead>
          <tbody>
            {models.map((model) => (
                <tr key={model.id} className="border-t border-ink/10 bg-bone/70 transition hover:bg-paper">
                  <td className="px-5 py-5">
                    <span className="font-display text-4xl font-black text-cinnabar">#{model.score.rank}</span>
                  </td>
                  <td className="px-5 py-5">
                    <Link href={`/models/${model.slug}`} className="font-display text-2xl font-black text-coal hover:text-cinnabar">
                      {model.rankName}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-graphite">
                      <span>{model.vendor.name}</span>
                      <span className="seal">{model.vendor.shortName}</span>
                      <span className="seal">{model.releaseType === "open" ? "开源" : model.releaseType === "hybrid" ? "混合" : "闭源"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-5 text-right">
                    <span className="font-display text-5xl font-black text-coal">{model.score.total.toFixed(1)}</span>
                    <span className="ml-1 text-xs font-bold text-graphite">/100</span>
                    {model.score.missingCategories.length > 0 ? (
                      <div className="mt-1 text-xs font-bold text-graphite">有源分项 {model.score.dataCompleteness}%</div>
                    ) : null}
                  </td>
                  <td className="px-5 py-5 text-right font-display text-2xl font-black text-coal">
                    {model.score.breakdown.capability.toFixed(1)}
                  </td>
                  <td className="px-5 py-5 text-right">
                    <Link href={`/models/${model.slug}#reputation`} className="font-display text-2xl font-black text-cinnabar hover:text-coal">
                      {reputationLabel(model)}
                    </Link>
                    <div className="mt-1 text-xs text-graphite">
                      {model.score.platformReputation.filter((platform) => platform.score !== null).length} 个平台计分
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-ink/10 lg:hidden">
        {models.map((model) => (
          <article key={model.id} className="bg-bone/70 p-5 transition hover:bg-paper">
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-display text-3xl font-black text-cinnabar">#{model.score.rank}</span>
                <Link href={`/models/${model.slug}`} className="mt-2 block font-display text-2xl font-black text-coal hover:text-cinnabar">
                  {model.rankName}
                </Link>
                <p className="mt-1 text-sm text-graphite">{model.vendor.name}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-5xl font-black text-coal">{model.score.total.toFixed(1)}</p>
                <p className="text-xs font-bold text-graphite">综合评分</p>
                {model.score.missingCategories.length > 0 ? (
                  <p className="text-xs font-bold text-graphite">有源 {model.score.dataCompleteness}%</p>
                ) : null}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs text-graphite">
              <span className="rounded-2xl bg-paper p-3">能力 {model.score.breakdown.capability.toFixed(1)}</span>
              <Link href={`/models/${model.slug}#reputation`} className="rounded-2xl bg-paper p-3 font-bold text-cinnabar hover:bg-coal hover:text-paper">
                口碑 {reputationLabel(model)}
              </Link>
              <Link href={`/models/${model.slug}`} className="rounded-2xl bg-paper p-3 font-bold text-coal hover:bg-cinnabar hover:text-paper">
                看详情
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
