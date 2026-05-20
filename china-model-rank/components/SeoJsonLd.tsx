import type { RankedModel } from "@/lib/types";
import { absoluteUrl, siteName } from "@/lib/site";

export function SeoJsonLd({ models }: { models: RankedModel[] }) {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteName,
      url: absoluteUrl("/"),
      inLanguage: "zh-CN",
      description: "查看中国厂商大模型排名、评分、公司、适用场景、明确价格、开源地址和公开用户评价来源。"
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "中国大模型综合排名",
      itemListElement: models.map((model) => ({
        "@type": "ListItem",
        position: model.score.rank,
        url: absoluteUrl(`/models/${model.slug}`),
        name: `${model.rankName} - ${model.vendor.name}`,
        description: `综合评分 ${model.score.total.toFixed(1)}，能力分 ${model.score.breakdown.capability.toFixed(1)}，口碑分 ${model.score.breakdown.userReputation.toFixed(1)}。详情页列出 App、API 型号、开源模型和价格。`
      }))
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "中国大模型排行榜怎么看？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "优先看排名、综合评分、模型公司和适用场景，再进入详情页查看评分来源、公开评价和互动指标。"
          }
        },
        {
          "@type": "Question",
          name: "写作、代码、推理和长文档分别适合哪些模型？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "写作和办公可优先看 Kimi、豆包、文心；代码和开源生态可关注通义千问、DeepSeek、智谱；推理可重点比较 DeepSeek 与通义；长文档可重点查看 Kimi。"
          }
        },
        {
          "@type": "Question",
          name: "评分是否完全来自真实评测？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "能力分优先参考公开评测来源，用户口碑只计入可追溯到实际内容页或评论页的真实反馈；缺失数据不会补假分。"
          }
        }
      ]
    }
  ];

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
