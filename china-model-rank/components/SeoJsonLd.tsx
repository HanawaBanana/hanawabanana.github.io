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
      description: "查看中国大模型排行、大模型排行榜、模型名称、综合评分、适用场景和公开用户口碑来源，覆盖 DeepSeek、通义千问、Kimi、豆包、文心一言、智谱 GLM、混元等模型。"
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: "中国大模型排行与大模型排行榜",
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
          name: "中国大模型排行和大模型排行榜怎么看？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "优先看模型名称、排名、综合评分、模型公司、适用场景和用户口碑，再进入详情页查看评分来源、公开评价和互动指标。"
          }
        },
        {
          "@type": "Question",
          name: "DeepSeek、通义千问、Kimi、豆包、文心一言、智谱 GLM 分别适合什么？",
          acceptedAnswer: {
            "@type": "Answer",
            text: "写作和办公可优先看 Kimi、豆包、文心一言；代码和开源生态可关注通义千问、DeepSeek、智谱 GLM；推理可重点比较 DeepSeek 与通义千问；企业接入可比较文心一言、混元和通义千问。"
          }
        },
        {
          "@type": "Question",
          name: "大模型用户口碑是否来自真实评价？",
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
