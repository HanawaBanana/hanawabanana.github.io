import type { Metadata } from "next";
import { defaultWeights, scoreFormulas, scoreLabels } from "@/lib/scoring";
import { getBenchmarkSourcesForScore } from "@/lib/benchmark-sources";
import { absoluteUrl } from "@/lib/site";
import type { ScoreBreakdown, ScoreCategoryKey } from "@/lib/types";

export const metadata: Metadata = {
  title: "中国大模型排行榜评分方法",
  description: "说明中国大模型排行榜的综合评分公式、能力评测来源、用户口碑计算规则、成本可用性和真实来源要求。",
  alternates: {
    canonical: absoluteUrl("/methodology")
  },
  openGraph: {
    title: "中国大模型排行榜评分方法",
    description: "公开展示国产大模型评分公式、来源规则和口碑计算方法。",
    url: absoluteUrl("/methodology")
  }
};

const sourceReferences = [
  {
    name: "Artificial Analysis API",
    url: "https://artificialanalysis.ai/api-reference/",
    purpose: "通过官方 API 接入模型能力、代码相关公开信号和价格指标；前台入口使用模型榜单页。"
  },
  {
    name: "LiveBench",
    url: "https://livebench.ai/",
    purpose: "作为能力、代码能力、数据分析的公开来源，覆盖 reasoning、math、coding、language、data analysis、instruction following 等分项。"
  },
  {
    name: "LiveBench GitHub",
    url: "https://github.com/livebench/livebench",
    purpose: "用于追溯 LiveBench 数据、评测说明和导入文件。"
  },
  {
    name: "LMArena / Chatbot Arena",
    url: "https://lmarena.ai/blog/arena/",
    purpose: "参考匿名成对人类偏好和 Elo 排名思路，用作能力与真实偏好补充。"
  },
  {
    name: "Chatbot Arena Paper",
    url: "https://arxiv.org/abs/2403.04132",
    purpose: "引用其大规模人类偏好评估框架，避免只依赖静态题库。"
  },
  {
    name: "OpenCompass",
    url: "https://github.com/open-compass/opencompass",
    purpose: "参考开源可复现评测框架和公开榜单，补充中文、代码、知识等任务。"
  },
  {
    name: "SuperCLUE",
    url: "https://github.com/CLUEbenchmark/SuperCLUE",
    purpose: "参考中文大模型综合评测结构，补充中文场景能力信号。"
  }
];

const ruleDescriptions: Record<ScoreCategoryKey, string> = {
  capability: "优先来自 Artificial Analysis、OpenCompass、SuperCLUE、LMArena 等公开评测或偏好榜单，录入后统一归一到 0-100。",
  userReputation: "固定展示知乎、小红书、抖音、微博、虎扑、贴吧、B站；每个平台至少 3 条真实原文短摘录才计分，所有合格平台等权平均。",
  priceAccess: "参考公开 API 价格、免费可用性、访问门槛、是否开放权重和是否易于接入。",
  coding: "优先使用 LiveBench coding 分项和 Artificial Analysis 代码相关公开信号，按来源置信度加权。",
  dataAnalysis: "优先使用 LiveBench data_analysis 分项，并补充公开数据/表格/知识任务评测。",
  ecosystem: "参考 API/文档、开源生态、工具链适配、企业接入成熟度和社区资料。"
};

const normalizationRules = [
  "外部评测来源若已是 0-100 分，直接使用；若是排名或 Elo，按同批候选模型做 min-max 归一。",
  "同一分项存在多个来源时，按来源置信度加权平均；置信度取决于公开可追溯性、评测规模和与中文模型场景的相关性。",
  "缺失分项显示 N/A，不补假分；综合分只用可用分项的权重重归一，并显示数据完整度。",
  "用户口碑只展示真实原文短摘录、来源链接和平台互动指标；摘要型内容、搜索结果页、样本不足平台不进入口碑分。"
];

const benchmarkSources = getBenchmarkSourcesForScore();

export default function MethodologyPage() {
  return (
    <div className="space-y-8">
      <section className="ledger-card p-8">
        <p className="ink-label">评分方法</p>
        <h1 className="mt-3 font-display text-5xl font-black tracking-[-0.04em] text-coal">真实来源驱动的评分方法</h1>
        <p className="mt-4 max-w-4xl text-base leading-8 text-graphite">
          榜单不是自定义拍脑袋排名。综合分由公开评测来源、真实内容页用户评价、价格可用性、代码能力、数据分析和生态开放度组成；缺失数据不伪造，并在页面显示数据完整度。
        </p>
      </section>

      <section className="ledger-card overflow-hidden p-0">
        <div className="bg-coal p-6 text-paper">
          <p className="text-[0.68rem] font-bold tracking-[0.22em] text-paper/60">计算公式</p>
          <h2 className="mt-2 font-display text-3xl font-black">综合分 = 有来源分项按原始权重重归一</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-paper/70">
            原始权重：能力 40% + 用户口碑 30% + 成本可用性 15% + 代码能力 6% + 数据分析 4% + 生态开放度 5%。缺源分项显示待补源，不进入综合分。
          </p>
        </div>
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {Object.entries(defaultWeights).map(([key, weight]) => (
            <div key={key} className="rounded-3xl border border-ink/10 bg-paper/70 p-5 shadow-insetLine">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-display text-2xl font-black text-coal">{scoreLabels[key as ScoreCategoryKey]}</h3>
                <span className="seal">{Math.round(weight * 100)}%</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-graphite">{ruleDescriptions[key as ScoreCategoryKey]}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="ledger-card p-8">
        <p className="ink-label">分项公式</p>
        <h2 className="mt-2 font-display text-3xl font-black text-coal">每个分数都必须能追到公式和来源</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {scoreFormulas.map((formula) => (
            <article key={formula.category} className="rounded-3xl border border-ink/10 bg-paper/70 p-5 shadow-insetLine">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-2xl font-black text-coal">{formula.label}</h3>
                <span className="seal">{formula.category === "total" ? "总分" : "分项"}</span>
              </div>
              <p className="mt-3 text-sm font-black leading-7 text-coal">{formula.expression}</p>
              <p className="mt-2 text-sm leading-7 text-graphite">{formula.description}</p>
              <p className="mt-2 text-xs font-bold leading-6 text-graphite">来源规则：{formula.sourcePolicy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
        <div className="ledger-card p-6">
          <h2 className="font-display text-3xl font-black text-coal">计算规则</h2>
          <div className="mt-5 space-y-3">
            {normalizationRules.map((rule, index) => (
              <p key={rule} className="rounded-3xl border border-ink/10 bg-paper/70 p-4 text-sm leading-7 text-graphite shadow-insetLine">
                <span className="mr-2 font-display text-xl font-black text-cinnabar">{index + 1}</span>
                {rule}
              </p>
            ))}
          </div>
        </div>

        <div className="ledger-card p-6">
          <h2 className="font-display text-3xl font-black text-coal">真实来源</h2>
          <div className="mt-5 space-y-3">
            {sourceReferences.map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-3xl border border-ink/10 bg-paper/70 p-4 shadow-insetLine transition hover:border-cinnabar/40 hover:bg-bone"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="font-display text-xl font-black text-coal">{source.name}</h3>
                  <span className="seal">公开来源</span>
                </div>
                <p className="mt-2 text-sm leading-7 text-graphite">{source.purpose}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="ledger-card p-8">
        <p className="ink-label">外部评测接入</p>
        <h2 className="mt-2 font-display text-3xl font-black text-coal">LiveBench 与 Artificial Analysis 的使用方式</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {benchmarkSources.map((source) => (
            <a key={source.id} href={source.homepage} target="_blank" rel="noreferrer" className="rounded-3xl border border-ink/10 bg-paper/70 p-5 shadow-insetLine transition hover:border-cinnabar/40 hover:bg-bone">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-display text-2xl font-black text-coal">{source.name}</h3>
                <span className="seal">{source.adapter === "api" ? "官方 API" : "公开数据集"}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-graphite">{source.notes}</p>
              <p className="mt-2 text-xs font-bold leading-6 text-graphite">可用于：{source.usableFor.map((key) => scoreLabels[key]).join("、")}</p>
              <p className="mt-2 text-xs leading-6 text-graphite">{source.attribution}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="ledger-card p-8">
        <h2 className="font-display text-3xl font-black text-coal">合规与局限</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[
            "用户评价只展示短摘录、统计和来源链接，不转载完整原文。",
            "不使用登录态，不绕过反爬；平台 API 不可用时生成浏览器 MCP 采集任务，再人工筛选短摘录。",
            "外部评测榜单更新频繁，页面应显示 retrievedAt，旧数据需要定期复核。"
          ].map((item) => (
            <p key={item} className="rounded-3xl border border-ink/10 bg-paper/70 p-5 text-sm leading-7 text-graphite shadow-insetLine">
              {item}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
