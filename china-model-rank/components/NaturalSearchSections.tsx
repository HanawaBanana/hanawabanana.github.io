import Link from "next/link";
import type { RankedModel } from "@/lib/types";

const useCases = [
  {
    title: "写作、办公、总结",
    query: "中国大模型排行里哪个适合写作办公？",
    picks: ["Kimi", "豆包", "文心"],
    reason: "优先看长文档、搜索增强、日常入口和数据整理能力。"
  },
  {
    title: "代码、开发、工具调用",
    query: "大模型排行里哪个国产大模型适合写代码？",
    picks: ["千问", "DeepSeek", "智谱"],
    reason: "优先看开源生态、API 文档、开源模型地址、工具调用和开发者讨论热度。"
  },
  {
    title: "推理、数学、复杂问题",
    query: "DeepSeek 和通义千问在中国大模型排行榜里哪个推理更强？",
    picks: ["DeepSeek", "千问", "阶跃"],
    reason: "优先看公开能力评测、推理模型定位和真实用户高互动反馈。"
  },
  {
    title: "企业接入、稳定服务",
    query: "企业用哪个国产大模型更稳？",
    picks: ["文心", "混元", "千问"],
    reason: "优先看云服务接入、价格可用性、SLA 信号和产业生态。"
  }
];

const faqs = [
  {
    question: "中国大模型排行和大模型排行榜主要看什么？",
    answer: "普通用户先看模型名称、排名、综合评分、公司和用户口碑；如果要认真选择，再看详情页里的 App、API 型号、开源地址、价格和真实评价出处。"
  },
  {
    question: "大模型用户口碑怎么看？",
    answer: "用户口碑只计入可追溯到内容页或评论页的真实反馈，并结合贴吧、B站等平台热度、正负向评价和互动指标，避免只看单一主观印象。"
  },
  {
    question: "DeepSeek、通义千问、Kimi、豆包、文心一言、智谱 GLM 怎么选？",
    answer: "写作和长文档优先看 Kimi、豆包；代码和开源生态看通义千问、DeepSeek、智谱 GLM；企业接入看文心一言、混元、通义千问；推理任务重点比较 DeepSeek 和通义千问。"
  }
];

export function NaturalSearchSections({ models }: { models: RankedModel[] }) {
  return (
    <section className="space-y-8">
      <div className="ledger-card p-8">
        <p className="ink-label">怎么选</p>
        <h2 className="mt-2 font-display text-4xl font-black tracking-tight text-coal">按用途快速选择中国大模型</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-graphite">
          如果你是从百度、搜狗、Bing 或 Google 搜“中国大模型”“大模型排行”“大模型用户口碑”到这里，可以先按使用场景筛选，再进入模型详情页查看真实评价来源。
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {useCases.map((item) => (
            <article key={item.title} className="rounded-3xl border border-ink/10 bg-paper/70 p-5 shadow-insetLine">
              <p className="ink-label">{item.query}</p>
              <h3 className="mt-2 font-display text-2xl font-black text-coal">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-graphite">{item.reason}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {item.picks.map((pick) => {
                  const model = models.find((entry) => entry.rankName === pick);
                  return model ? (
                    <Link key={pick} href={`/models/${model.slug}`} className="seal transition hover:border-cinnabar hover:text-cinnabar">
                      {model.rankName}
                    </Link>
                  ) : (
                    <span key={pick} className="seal">{pick}</span>
                  );
                })}
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="ledger-card p-8">
        <p className="ink-label">常见问题</p>
        <h2 className="mt-2 font-display text-4xl font-black tracking-tight text-coal">常见问题</h2>
        <div className="mt-6 grid gap-4">
          {faqs.map((faq) => (
            <article key={faq.question} className="rounded-3xl border border-ink/10 bg-paper/70 p-5 shadow-insetLine">
              <h3 className="font-display text-xl font-black text-coal">{faq.question}</h3>
              <p className="mt-2 text-sm leading-7 text-graphite">{faq.answer}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
