import type { Metadata } from "next";
import { BreakdownBars } from "@/components/BreakdownBars";
import { ScoreDial } from "@/components/ScoreDial";
import { getRankedModels } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "中国大模型对比矩阵",
  description: "对比通义千问、DeepSeek、Kimi、豆包、文心、智谱等国产大模型的综合评分、能力、口碑、成本和生态开放度。",
  alternates: {
    canonical: absoluteUrl("/compare")
  },
  openGraph: {
    title: "中国大模型对比矩阵",
    description: "一页对比国产大模型的评分、能力、口碑、成本和生态。",
    url: absoluteUrl("/compare")
  }
};

export default function ComparePage() {
  const models = getRankedModels();

  return (
    <div className="space-y-8">
      <section className="ledger-card p-8">
        <p className="ink-label">对比矩阵</p>
        <h1 className="mt-3 font-display text-5xl font-black tracking-[-0.04em] text-coal">模型对比矩阵</h1>
        <p className="mt-4 max-w-3xl text-base leading-8 text-graphite">
          展示完整 Top 10 品牌的核心维度，具体 App、API 型号、开源模型和价格进入详情页查看。
        </p>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {models.map((model) => (
          <article key={model.id} className="ledger-card p-5">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <span className="seal">#{model.score.rank}</span>
                <h2 className="mt-3 font-display text-2xl font-black text-coal">{model.rankName}</h2>
                <p className="mt-1 text-sm text-graphite">{model.vendor.shortName}</p>
              </div>
              <ScoreDial score={model.score.total} size="sm" />
            </div>
            <BreakdownBars breakdown={model.score.breakdown} contributions={model.score.contributions} />
          </article>
        ))}
      </section>
    </div>
  );
}
