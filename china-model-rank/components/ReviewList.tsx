import type { NormalizedReview, PlatformReputationSummary, ReviewScoreDetail } from "@/lib/types";
import { formatMetric, platformLabel } from "@/lib/review-evidence";

export function ReviewList({
  reviews,
  scoreDetails = [],
  platformReputation = []
}: {
  reviews: NormalizedReview[];
  scoreDetails?: ReviewScoreDetail[];
  platformReputation?: PlatformReputationSummary[];
}) {
  const scoreByReview = new Map(scoreDetails.map((detail) => [detail.reviewId, detail]));

  return (
    <div className="space-y-4">
      {platformReputation.map((platform) => {
        const platformReviews = platform.reviewIds
          .map((id) => reviews.find((review) => review.id === id))
          .filter((review): review is NormalizedReview => Boolean(review));

        return (
          <article
            key={platform.platform}
            className="rounded-3xl border border-ink/10 bg-paper/70 p-5 shadow-insetLine transition hover:border-cinnabar/40 hover:bg-bone"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="seal">{platform.label}</span>
                  <span className={platform.status === "scored" ? "seal border-cinnabar/25 bg-cinnabar/10 text-cinnabar" : "seal"}>
                    {platform.score === null ? "待补源" : `平台分 ${platform.score.toFixed(1)}`}
                  </span>
                  <span className="seal">
                    原文 {platform.sampleCount}/{platform.requiredSampleCount}
                  </span>
                </div>
                <h3 className="mt-3 font-display text-2xl font-black text-coal">{platform.label}口碑聚合</h3>
                <p className="mt-2 text-sm leading-7 text-graphite">{platform.summary}</p>
              </div>
            </div>

            <details className="mt-4 rounded-2xl border border-ink/10 bg-bone p-4">
              <summary className="cursor-pointer font-display text-lg font-black text-coal">
                查看{platform.label}真实原文
              </summary>

              {platformReviews.length > 0 ? (
                <div className="mt-4 space-y-4">
                  {platformReviews.map((review) => {
                    const detail = scoreByReview.get(review.id);

                    return (
                      <div key={review.id} className="rounded-2xl border border-ink/10 bg-paper p-4">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <span className="seal">{platformLabel[review.platform]}</span>
                          {detail ? <span className="seal border-cinnabar/25 bg-cinnabar/10 text-cinnabar">单条分 {detail.total.toFixed(1)}</span> : null}
                          {review.positiveSignals.slice(0, 2).map((signal) => (
                            <span key={signal} className="seal border-malachite/25 bg-malachite/10 text-malachite">
                              {signal}
                            </span>
                          ))}
                          <span className="text-xs font-bold text-graphite">{review.authorLabel}</span>
                        </div>
                        <h4 className="font-display text-lg font-black text-coal">{review.title}</h4>
                        <blockquote className="mt-3 border-l-4 border-cinnabar/70 pl-4 font-display text-xl font-black leading-9 text-coal">
                          “{review.quote}”
                        </blockquote>
                        <p className="mt-3 text-sm leading-7 text-graphite">{review.excerpt}</p>

                        {detail ? (
                          <div className="mt-4 rounded-2xl border border-ink/10 bg-bone p-4">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-black text-coal">
                              <span>计算：{detail.formula}</span>
                            </div>
                            <div className="mt-3 grid gap-2 text-xs font-bold text-graphite sm:grid-cols-4">
                              <span>场景匹配 {detail.scenario.toFixed(1)}</span>
                              <span>用户态度 {detail.sentiment.toFixed(1)}</span>
                              <span>互动质量 {detail.engagement.toFixed(1)}</span>
                              <span>来源时效 {detail.sourceFreshness.toFixed(1)}</span>
                            </div>
                          </div>
                        ) : null}

                        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                          <div className="flex flex-wrap gap-2">
                            {review.engagementMetrics.map((metric) => (
                              <span
                                key={metric.key}
                                className={metric.positive ? "seal border-malachite/25 bg-malachite/10 text-malachite" : "seal"}
                              >
                                {formatMetric(metric)}
                              </span>
                            ))}
                          </div>
                          <a
                            href={review.sourceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-black text-cinnabar transition hover:translate-x-1 hover:text-coal"
                          >
                            查看原文出处
                          </a>
                        </div>

                        <div className="mt-4 grid gap-2 border-t border-ink/10 pt-4 text-xs leading-6 text-graphite sm:grid-cols-2">
                          <a href={review.sourceUrl} target="_blank" rel="noreferrer" className="break-all hover:text-cinnabar">
                            出处：{review.sourceTitle}
                          </a>
                          <span>原文时间：{new Date(review.publishedAt).toLocaleDateString("zh-CN")}</span>
                          <span>采集时间：{new Date(review.collectedAt).toLocaleString("zh-CN")}</span>
                          <span>正向标识：{review.positiveSignals.join(" / ") || "无"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-4 rounded-2xl border border-ink/10 bg-paper p-4 text-sm leading-7 text-graphite">
                  该平台尚未达到 3 条真实原文短摘录，后续爬取会优先补齐“使用感受、实际使用、解决问题”相关内容。
                </p>
              )}
            </details>
          </article>
        );
      })}
    </div>
  );
}
