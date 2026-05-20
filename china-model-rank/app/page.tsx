import Link from "next/link";
import { NaturalSearchSections } from "@/components/NaturalSearchSections";
import { RankingTable } from "@/components/RankingTable";
import { ReputationSummary } from "@/components/ReputationSummary";
import { SeoJsonLd } from "@/components/SeoJsonLd";
import { getRankedModels } from "@/lib/data";

export default function HomePage() {
  const rankedModels = getRankedModels();
  const topThree = rankedModels.slice(0, 3);

  return (
    <div className="space-y-10">
      <SeoJsonLd models={rankedModels} />
      <section className="grid gap-6 lg:grid-cols-[.82fr_1.18fr]">
        <div className="ledger-card relative overflow-hidden p-8 sm:p-10">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[28px] border-cinnabar/10" />
          <div className="mb-8 flex flex-wrap items-center gap-2">
            <span className="seal">中国大模型排行 · 模型名称/公司/评分一屏可见</span>
            <span className="seal text-xs">每日更新</span>
          </div>
          <h1 className="max-w-4xl font-display text-5xl font-black leading-tight tracking-[-0.05em] text-coal sm:text-6xl">
            中国大模型排行与大模型排行榜
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-9 text-graphite">
            面向搜索“中国大模型”“大模型排行”“大模型排行榜”的用户，首页优先呈现 DeepSeek、通义千问、Kimi、豆包、文心一言、智谱 GLM 等模型名称、品牌公司、0-100 综合评分和用户口碑来源。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#ranking" className="rounded-full bg-coal px-6 py-3 text-sm font-black text-paper transition hover:bg-cinnabar">
              查看大模型排行
            </Link>
            <Link href="/methodology" className="rounded-full border border-ink/15 bg-paper px-6 py-3 text-sm font-black text-coal transition hover:bg-coal hover:text-paper">
              评分方法
            </Link>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {topThree.map((model) => (
            <Link
              key={model.id}
              href={`/models/${model.slug}`}
              className="ledger-card block p-5 transition hover:-translate-y-1 hover:bg-bone"
            >
              <div className="flex items-center justify-between">
                <span className="ink-label">TOP {model.score.rank}</span>
                <span className="font-display text-4xl font-black text-cinnabar">{model.score.total.toFixed(1)}</span>
              </div>
              <h2 className="mt-3 font-display text-2xl font-black text-coal">{model.rankName}</h2>
              <p className="mt-2 text-sm leading-6 text-graphite">{model.score.explanation}</p>
            </Link>
          ))}
        </div>
      </section>

      <RankingTable models={rankedModels} />

      <NaturalSearchSections models={rankedModels} />

      <section className="space-y-4">
        <div>
          <p className="ink-label">模型口碑</p>
          <h2 className="font-display text-4xl font-black tracking-tight text-coal">模型口碑摘要</h2>
        </div>
        <ReputationSummary models={rankedModels} />
      </section>
    </div>
  );
}
