import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BreakdownBars } from "@/components/BreakdownBars";
import { ReviewList } from "@/components/ReviewList";
import { ScoreDial } from "@/components/ScoreDial";
import { getModelBySlug, getRankedModels } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";
import type { EvidenceSource, ProductVariant, ScoreContribution } from "@/lib/types";

const variantLabel: Record<ProductVariant["type"], string> = {
  software_app: "软件 / App",
  api_model: "API 型号",
  open_source_model: "开源模型"
};

function VariantCard({ variant }: { variant: ProductVariant }) {
  return (
    <article className="rounded-3xl border border-ink/10 bg-paper/70 p-5 shadow-insetLine">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="seal">{variantLabel[variant.type]}</span>
        {variant.pricing ? <span className="seal">价格更新 {variant.pricing.api.retrievedAt}</span> : null}
      </div>
      <h3 className="mt-3 font-display text-2xl font-black text-coal">{variant.name}</h3>
      <p className="mt-2 text-sm leading-7 text-graphite">{variant.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {variant.links.map((link) => (
          <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="seal transition hover:border-cinnabar hover:text-cinnabar">
            {link.label}
          </a>
        ))}
      </div>
      {variant.pricing ? (
        <div className="mt-4 rounded-2xl bg-bone p-4 text-sm font-bold leading-7 text-coal">
          <a href={variant.pricing.api.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-cinnabar/30 underline-offset-4 hover:text-cinnabar">
            {variant.pricing.display}
          </a>
          {typeof variant.pricing.api.cacheHitInput === "number" ? (
            <p className="text-xs text-graphite">缓存命中输入：{variant.pricing.api.currency === "CNY" ? "¥" : "$"}{variant.pricing.api.cacheHitInput}/百万 tokens</p>
          ) : null}
          {variant.pricing.subscriptions?.map((item) => (
            <a key={`${item.label}-${item.price}`} href={item.sourceUrl} target="_blank" rel="noreferrer" className="block text-xs text-graphite hover:text-cinnabar">
              订阅：{item.label} {item.price}
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function ScoreSourcePanel({ contribution, evidenceSources }: { contribution: ScoreContribution; evidenceSources: EvidenceSource[] }) {
  const sources = evidenceSources.filter((source) => contribution.evidenceIds.includes(source.id));

  return (
    <article className="rounded-3xl border border-ink/10 bg-paper/70 p-5 shadow-insetLine">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-2xl font-black text-coal">{contribution.label}</h3>
          <p className="mt-2 text-sm leading-7 text-graphite">{contribution.formula}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-3xl font-black text-cinnabar">
            {contribution.score === null ? "待补源" : contribution.score.toFixed(1)}
          </p>
          <p className="text-xs font-bold text-graphite">
            计入权重 {Math.round(contribution.effectiveWeight * 100)}%
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-bold text-graphite sm:grid-cols-3">
        <span>原始权重 {Math.round(contribution.baseWeight * 100)}%</span>
        <span>贡献 {contribution.contribution.toFixed(1)}</span>
        <span>来源数 {contribution.sourceCount}</span>
      </div>

      {contribution.missingReason ? (
        <p className="mt-4 rounded-2xl bg-bone p-4 text-sm font-bold leading-7 text-graphite">{contribution.missingReason}</p>
      ) : null}

      {contribution.inputSummary.length > 0 ? (
        <div className="mt-4 space-y-2">
          {contribution.inputSummary.map((item) => (
            <p key={item} className="rounded-2xl bg-bone p-3 text-xs leading-6 text-graphite">
              {item}
            </p>
          ))}
        </div>
      ) : null}

      {sources.length > 0 ? (
        <div className="mt-4 space-y-3 border-t border-ink/10 pt-4">
          {sources.map((source) => (
            <a key={source.id} href={source.sourceUrl} target="_blank" rel="noreferrer" className="block rounded-2xl border border-ink/10 bg-bone p-4 transition hover:border-cinnabar/40 hover:bg-paper">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-display text-lg font-black text-coal">{source.sourceName}</span>
                <span className="seal">更新 {source.retrievedAt}</span>
              </div>
              <p className="mt-2 text-xs font-bold leading-6 text-graphite">{source.metricName}：{source.rawValue}</p>
              <p className="mt-1 text-xs leading-6 text-graphite">归一分 {source.normalizedValue?.toFixed(1) ?? "N/A"}，置信度 {Math.round(source.confidence * 100)}%。{source.note}</p>
            </a>
          ))}
        </div>
      ) : null}
    </article>
  );
}

export function generateStaticParams() {
  return getRankedModels().map((model) => ({ slug: model.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const model = getModelBySlug(slug);
  if (!model) {
    return {};
  }

  const title = `${model.rankName}评分与用户口碑`;
  const description = `${model.rankName}由${model.vendor.name}推出，当前综合评分 ${model.score.total.toFixed(1)}。查看能力分、口碑分、免费方式、API 价格、开源模型和真实用户评价来源。`;

  return {
    title,
    description,
    alternates: {
      canonical: absoluteUrl(`/models/${model.slug}`)
    },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/models/${model.slug}`),
      type: "article"
    }
  };
}

export default async function ModelDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const model = getModelBySlug(slug);

  if (!model) {
    notFound();
  }

  const scoredReputationPlatforms = model.score.platformReputation.filter((platform) => platform.score !== null);

  return (
    <div className="space-y-8">
      <section className="ledger-card grid gap-8 p-8 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="mb-5 flex flex-wrap gap-2">
            <span className="seal">#{model.score.rank}</span>
            <span className="seal">{model.vendor.name}</span>
            <span className="seal">{model.releaseType === "open" ? "开源" : model.releaseType === "hybrid" ? "混合" : "闭源"}</span>
          </div>
          <h1 className="font-display text-5xl font-black tracking-[-0.04em] text-coal">{model.detailName}</h1>
          <p className="mt-5 max-w-3xl text-lg leading-9 text-graphite">{model.summary}</p>
          <dl className="mt-8 grid gap-3 sm:grid-cols-2">
            <div className="metric-cell">
              <dt className="ink-label">访问方式</dt>
              <dd className="mt-2 text-sm font-bold text-coal">{model.access}</dd>
            </div>
            <div className="metric-cell">
              <dt className="ink-label">免费方式</dt>
              <dd className="mt-2 space-y-2 text-sm font-bold text-coal">
                <p>{model.freeAccessInfo.display}</p>
                <div className="flex flex-wrap gap-2">
                  {model.freeAccessInfo.web?.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="seal transition hover:border-cinnabar hover:text-cinnabar">
                      {link.label}
                    </a>
                  ))}
                  {model.freeAccessInfo.openSourceModels?.map((link) => (
                    <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="seal border-malachite/25 bg-malachite/10 text-malachite transition hover:border-malachite">
                      开源：{link.label}
                    </a>
                  ))}
                </div>
              </dd>
            </div>
            <div className="metric-cell">
              <dt className="ink-label">付费成本</dt>
              <dd className="mt-2 space-y-2 text-sm font-bold text-coal">
                <a href={model.pricing.api.sourceUrl} target="_blank" rel="noreferrer" className="underline decoration-cinnabar/30 underline-offset-4 hover:text-cinnabar">
                  {model.pricing.display}
                </a>
                {typeof model.pricing.api.cacheHitInput === "number" ? (
                  <p className="text-xs text-graphite">缓存命中输入：{model.pricing.api.currency === "CNY" ? "¥" : "$"}{model.pricing.api.cacheHitInput}/百万 tokens</p>
                ) : null}
                {model.pricing.subscriptions?.map((item) => (
                  <a key={`${item.label}-${item.price}`} href={item.sourceUrl} target="_blank" rel="noreferrer" className="block text-xs text-graphite hover:text-cinnabar">
                    订阅：{item.label} {item.price}
                  </a>
                ))}
                <p className="text-xs text-graphite">价格来源更新：{model.pricing.api.retrievedAt}</p>
              </dd>
            </div>
            <div className="metric-cell sm:col-span-2">
              <dt className="ink-label">官方使用场景</dt>
              <dd className="mt-2 flex flex-wrap gap-2 text-sm font-bold text-coal">
                {model.officialUseCases.map((useCase) => (
                  <a key={useCase.id} href={useCase.sourceUrl} target="_blank" rel="noreferrer" className="seal transition hover:border-cinnabar hover:text-cinnabar">
                    {useCase.label}
                  </a>
                ))}
              </dd>
            </div>
          </dl>
        </div>
        <aside className="rounded-[2rem] border border-ink/10 bg-paper/70 p-6 shadow-insetLine">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="ink-label">综合评分</p>
              <p className="mt-1 text-sm text-graphite">{model.score.explanation}</p>
            </div>
            <ScoreDial score={model.score.total} size="sm" />
          </div>
          <BreakdownBars breakdown={model.score.breakdown} contributions={model.score.contributions} />
          <div className="mt-5 rounded-3xl bg-bone p-4 text-xs leading-6 text-graphite">
            <p>数据完整度：{model.score.dataCompleteness}%</p>
            <p>综合分只计入有来源分项；缺源项不会用静态分填充。</p>
          </div>
        </aside>
      </section>

      <section className="ledger-card p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="ink-label">评分论据</p>
            <h2 className="mt-2 font-display text-3xl font-black text-coal">每个分项的公式、输入和来源</h2>
          </div>
          <span className="seal">综合分 {model.score.total.toFixed(1)}</span>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {model.score.contributions.map((contribution) => (
            <ScoreSourcePanel key={contribution.category} contribution={contribution} evidenceSources={model.evidenceSources} />
          ))}
        </div>
      </section>

      <section className="ledger-card p-6">
        <p className="ink-label">软件和型号</p>
        <h2 className="mt-2 font-display text-3xl font-black text-coal">App、API 型号与开源模型</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {model.productVariants.map((variant) => (
            <VariantCard key={`${variant.type}-${variant.name}`} variant={variant} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
        <div className="ledger-card p-6">
          <p className="ink-label">公司信息</p>
          <h2 className="mt-2 font-display text-3xl font-black text-coal">{model.vendor.name}</h2>
          <p className="mt-4 text-sm leading-7 text-graphite">{model.vendor.description}</p>
          <a
            href={model.vendor.homepage}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-flex rounded-full bg-coal px-5 py-3 text-sm font-black text-paper transition hover:bg-cinnabar"
          >
            访问官网
          </a>
        </div>
        <div id="reputation" className="ledger-card scroll-mt-8 p-6">
          <div className="mb-5 flex items-end justify-between">
            <div>
              <p className="ink-label">模型口碑</p>
              <h2 className="font-display text-3xl font-black text-coal">口碑详情</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {model.score.platformReputation.map((platform) => (
                  <span key={platform.platform} className={platform.score === null ? "seal" : "seal border-cinnabar/25 bg-cinnabar/10 text-cinnabar"}>
                    {platform.label}{platform.score === null ? "待补源" : ` ${platform.score.toFixed(1)}`}
                  </span>
                ))}
              </div>
            </div>
            <span className="seal">{scoredReputationPlatforms.length} 个平台计分</span>
          </div>
          <ReviewList
            reviews={model.reviews}
            scoreDetails={model.score.reviewScoreDetails}
            platformReputation={model.score.platformReputation}
          />
        </div>
      </section>
    </div>
  );
}
