import { normalizeRawItem } from "@/lib/crawler/normalize";
import { flattenEvidenceText, modelMatchesPost, postToRawItem, topByEngagement } from "@/lib/crawler/rich-utils";
import { matchOfficialUseCases } from "@/lib/scoring";
import type { AiReputationJudgement, CrawledPost } from "@/lib/crawler/rich-types";
import type { Model, NormalizedReview, ScoreCategoryKey } from "@/lib/types";

type LlmJudgementPayload = Omit<AiReputationJudgement, "postId" | "modelId" | "platform" | "sourceUrl">;

const positiveWords = ["好用", "稳定", "优秀", "便宜", "开源", "顺手", "推荐", "收藏", "效率", "解决", "流畅", "顶尖", "免费", "实用", "爽", "舒服", "满血", "不卡", "省钱", "准确", "靠谱", "提效"];
const negativeWords = ["难用", "太慢", "卡顿", "贵", "幻觉", "失败", "出错", "废", "不稳", "翻车", "不好", "麻烦", "崩", "离谱", "不准", "繁忙", "等的人麻", "拉得很", "改不出来", "差一截", "不如", "不行"];
const reputationIntentPattern = /使用感受|实际使用|真实体验|体验|测评|评测|对比|好不好用|不好用|怎么样|值不值得|推荐|不推荐|爽感|越用|用起来|用下来|踩坑|解决问题|稳定|顺手|难用|好用|舒服|满血|不卡|幻觉|失败|翻车|便宜|成本|价格/;
const promotionalPattern = /三联|关注UP|关注我|获取地址|获取链接|私信|丝信|不限次数|一站全搞定|官网直连|直连官网|资源领取|课程|推广/;
const comparativePattern = /对比|vs|VS|横评|排名|双雄|全网|各大|主流|测一圈|盘点|哪家强|谁更强/;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Number(value.toFixed(1))));
}

function detectSentiment(text: string): NormalizedReview["sentiment"] {
  const positive = positiveWords.filter((word) => text.includes(word)).length;
  const negative = negativeWords.filter((word) => text.includes(word)).length;
  if (positive > negative) return "positive";
  if (negative > positive) return "negative";
  return "neutral";
}

function normalizeForMatch(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function modelTerms(model: Model) {
  const base = [model.rankName, model.detailName, model.name, model.family, ...model.aliases];
  const special: Record<string, string[]> = {
    "deepseek-r1": ["deepseek", "deepseekr1", "deepseekv4", "dsv4", "ds-v4"],
    "glm-4": ["glm", "glm5", "glm5.1", "chatglm", "智谱"],
    "qwen-max": ["qwen", "qwen3", "千问", "通义", "通义千问"],
    "kimi-k2": ["kimi", "k2.6", "k2", "月之暗面"],
    "doubao-pro": ["豆包", "doubao"],
    "minimax-abab": ["minimax", "abab", "海螺"],
    "ernie-4": ["文心", "文心一言", "ernie"],
    "hunyuan-turbos": ["混元", "腾讯混元", "元宝", "hunyuan"],
    "baichuan-4": ["百川", "baichuan"],
    "step-2": ["阶跃", "step", "跃问"]
  };

  return [...new Set([...base, ...(special[model.id] ?? [])]
    .map((term) => normalizeForMatch(term))
    .filter((term) => term.length >= 2 && !["ai", "max", "pro"].includes(term)))];
}

function hasModelTerm(text: string, model: Model, context = "") {
  const normalized = normalizeForMatch(text);
  const contextText = normalizeForMatch(context);
  return modelTerms(model).some((term) => {
    if (["ds", "k2", "step"].includes(term)) {
      return contextText.includes(model.id.split("-")[0]) && normalized.includes(term);
    }
    return normalized.includes(term);
  });
}

function reputationSignalScore(post: CrawledPost, evidence: string, matchedUseCaseCount: number, hasModelSpecificComment: boolean) {
  const hasCommentEvidence = post.comments.some((comment) => comment.content.length >= 8);
  const intentSignal = reputationIntentPattern.test(evidence);
  const positiveCount = positiveWords.filter((word) => evidence.includes(word)).length;
  const negativeCount = negativeWords.filter((word) => evidence.includes(word)).length;
  const sentimentSignal = positiveCount + negativeCount > 0;
  const isPromotional = promotionalPattern.test(evidence) && !hasCommentEvidence;
  if (isPromotional && !/我|自己|亲测|用起来|用下来|部署|拿来|实际/.test(evidence)) {
    return 0;
  }

  const score = (intentSignal ? 0.28 : 0)
    + (sentimentSignal ? 0.22 : 0)
    + (hasCommentEvidence ? 0.12 : 0)
    + (hasModelSpecificComment ? 0.18 : 0)
    + Math.min(matchedUseCaseCount, 2) * 0.08
    - (isPromotional ? 0.32 : 0);

  return Math.max(0, Math.min(0.5, score));
}

function topicsFromText(text: string): ScoreCategoryKey[] {
  const topics = new Set<ScoreCategoryKey>(["userReputation"]);
  if (/代码|编程|插件|开发|IDE|VSCode/i.test(text)) topics.add("coding");
  if (/价格|便宜|免费|成本|开源|部署/i.test(text)) topics.add("priceAccess");
  if (/表格|数据|分析|总结|文档|论文/i.test(text)) topics.add("dataAnalysis");
  if (/API|生态|工具|插件|接入|部署/i.test(text)) topics.add("ecosystem");
  if (/推理|能力|测评|对比|排名/i.test(text)) topics.add("capability");
  return [...topics];
}

function selectModelComment(post: CrawledPost, model: Model) {
  const context = `${post.title} ${post.content}`;
  const candidates = post.comments
    .map((comment) => {
      const reply = topByEngagement(comment.replies.filter((item) => hasModelTerm(item.content, model, context)), 1)[0];
      const matched = hasModelTerm(comment.content, model, context) || Boolean(reply);
      return { comment, reply, matched };
    })
    .filter((item) => item.matched)
    .sort((a, b) => {
      const aEngagement = a.comment.engagementMetrics.reduce((sum, item) => sum + item.value, 0);
      const bEngagement = b.comment.engagementMetrics.reduce((sum, item) => sum + item.value, 0);
      return bEngagement - aEngagement;
    })[0];

  return candidates ?? null;
}

function selectEvidenceQuote(post: CrawledPost, model: Model, fallback: string, isComparative: boolean) {
  const modelComment = selectModelComment(post, model);
  const topComment = modelComment?.comment ?? (!isComparative ? topByEngagement(post.comments, 1)[0] : undefined);
  if (topComment?.content) {
    const topReply = modelComment?.reply ?? topByEngagement(topComment.replies, 1)[0];
    const replyText = topReply?.content ? `；楼中楼：${topReply.content}` : "";
    return `${topComment.content}${replyText}`.slice(0, 140);
  }

  return fallback.slice(0, 110);
}

function localJudge(post: CrawledPost, model: Model): AiReputationJudgement {
  const evidence = flattenEvidenceText(post);
  const matchedModel = modelMatchesPost(post, model);
  const matchedUseCases = matchOfficialUseCases(normalizeRawItem(postToRawItem(post)), model.officialUseCases);
  const isComparative = comparativePattern.test(`${post.title} ${post.content}`);
  const modelComment = selectModelComment(post, model);
  const hasModelSpecificComment = Boolean(modelComment);
  const commentWeight = Math.min(post.comments.length / 10, 1);
  const replyCount = post.comments.reduce((sum, comment) => sum + comment.replies.length, 0);
  const replyWeight = Math.min(replyCount / 30, 1);
  const reputationSignal = reputationSignalScore(post, evidence, matchedUseCases.length, hasModelSpecificComment);
  const relevant = matchedModel && reputationSignal >= 0.3 && (!isComparative || hasModelSpecificComment);
  const relevance = matchedModel ? Math.min(1, 0.28 + reputationSignal + matchedUseCases.length * 0.05 + commentWeight * 0.12) : 0.2;
  const quote = selectEvidenceQuote(post, model, evidence, isComparative);
  const sentimentText = quote || evidence;
  const positiveCount = positiveWords.filter((word) => sentimentText.includes(word)).length;
  const negativeCount = negativeWords.filter((word) => sentimentText.includes(word)).length;
  const sentiment = detectSentiment(sentimentText);
  const sentimentBase = sentiment === "positive" ? 76 : sentiment === "negative" ? 36 : 58;
  const score = clampScore(sentimentBase + positiveCount * 2.2 - negativeCount * 3 + commentWeight * 8 + replyWeight * 4 + matchedUseCases.length * 2);

  return {
    postId: post.id,
    modelId: model.id,
    platform: post.platform,
    sourceUrl: post.sourceUrl,
    relevant,
    relevance,
    sentiment,
    confidence: relevant ? Math.min(0.88, 0.5 + reputationSignal * 0.35 + commentWeight * 0.15 + matchedUseCases.length * 0.03) : 0.35,
    score,
    evidenceQuote: quote,
    summary: post.comments.length > 0
      ? `${post.platform} 热评围绕「${post.title.slice(0, 28)}」给出实际反馈，前十热评和前三楼中楼共同计入口碑判断。`
      : `${post.platform} 证据显示用户主要围绕「${post.title.slice(0, 28)}」讨论，缺少热评时不写入前台口碑。`,
    positivePoints: positiveWords.filter((word) => evidence.includes(word)).slice(0, 4),
    negativePoints: negativeWords.filter((word) => evidence.includes(word)).slice(0, 4),
    topics: topicsFromText(evidence)
  };
}

async function llmJudge(post: CrawledPost, model: Model): Promise<LlmJudgementPayload | null> {
  const endpoint = process.env.LLM_SCORE_ENDPOINT;
  const apiKey = process.env.LLM_SCORE_API_KEY;
  const llmModel = process.env.LLM_SCORE_MODEL;
  if (!endpoint || !apiKey || !llmModel) {
    return null;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: llmModel,
      messages: [
        {
          role: "system",
          content: "你是中文大模型口碑评分器。只基于输入证据输出 JSON，不要编造。"
        },
        {
          role: "user",
          content: `输出 JSON：{"relevant":boolean,"relevance":0-1,"sentiment":"positive|neutral|negative","confidence":0-1,"score":0-100,"evidenceQuote":"短原文摘录","summary":"中文摘要","positivePoints":[],"negativePoints":[],"topics":["userReputation"]}。\n模型：${JSON.stringify({ id: model.id, name: model.rankName, aliases: model.aliases, useCases: model.officialUseCases })}\n证据：${JSON.stringify({
            platform: post.platform,
            title: post.title,
            content: post.content.slice(0, 1200),
            sourceUrl: post.sourceUrl,
            engagementMetrics: post.engagementMetrics,
            comments: post.comments.slice(0, 10).map((comment) => ({
              content: comment.content.slice(0, 500),
              engagementMetrics: comment.engagementMetrics,
              replies: comment.replies.slice(0, 3).map((reply) => ({
                content: reply.content.slice(0, 280),
                engagementMetrics: reply.engagementMetrics
              }))
            }))
          })}`
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`LLM scorer failed: ${response.status}`);
  }

  const payload = await response.json();
  const rawContent = payload.choices?.[0]?.message?.content;
  if (typeof rawContent !== "string") {
    return null;
  }

  try {
    return JSON.parse(rawContent) as LlmJudgementPayload;
  } catch {
    return null;
  }
}

function normalizeLlmJudgement(post: CrawledPost, model: Model, judgement: LlmJudgementPayload): AiReputationJudgement {
  const sentiment = ["positive", "neutral", "negative"].includes(judgement.sentiment) ? judgement.sentiment : "neutral";
  const topics = Array.isArray(judgement.topics) && judgement.topics.length > 0
    ? judgement.topics.filter((topic): topic is ScoreCategoryKey => ["capability", "priceAccess", "coding", "dataAnalysis", "ecosystem", "userReputation"].includes(topic))
    : ["userReputation" as const];

  return {
    postId: post.id,
    modelId: model.id,
    platform: post.platform,
    sourceUrl: post.sourceUrl,
    relevant: Boolean(judgement.relevant),
    relevance: Math.max(0, Math.min(1, Number(judgement.relevance) || 0)),
    sentiment,
    confidence: Math.max(0, Math.min(1, Number(judgement.confidence) || 0)),
    score: clampScore(Number(judgement.score) || 0),
    evidenceQuote: String(judgement.evidenceQuote || flattenEvidenceText(post)).slice(0, 120),
    summary: String(judgement.summary || post.title).slice(0, 180),
    positivePoints: Array.isArray(judgement.positivePoints) ? judgement.positivePoints.map(String).slice(0, 6) : [],
    negativePoints: Array.isArray(judgement.negativePoints) ? judgement.negativePoints.map(String).slice(0, 6) : [],
    topics
  };
}

export async function judgePostReputation(post: CrawledPost, model: Model): Promise<AiReputationJudgement> {
  const llm = await llmJudge(post, model);
  if (llm) {
    return normalizeLlmJudgement(post, model, llm);
  }

  return localJudge(post, model);
}
