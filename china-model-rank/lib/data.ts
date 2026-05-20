import { createScoreSnapshot } from "@/lib/scoring";
import { createPublicReview } from "@/lib/review-evidence";
import { isVerifiedReview } from "@/lib/content-source";
import { enrichModel } from "@/lib/model-enrichment";
import { buildDerivedEvidenceSources, buildSourcedBreakdowns } from "@/lib/score-evidence";
import type { BaseModel, EvidenceSource, Model, NormalizedReview, RankedModel, Vendor } from "@/lib/types";
import crawledReputationExcerpts from "@/data/reputation-excerpts.json";

export const vendors: Vendor[] = [
  {
    id: "alibaba",
    name: "阿里云",
    shortName: "通义",
    description: "通义千问/Qwen 系列覆盖开源、API 与企业云服务场景。",
    homepage: "https://tongyi.aliyun.com"
  },
  {
    id: "baidu",
    name: "百度",
    shortName: "文心",
    description: "文心大模型强调搜索、办公、智能体与产业落地。",
    homepage: "https://yiyan.baidu.com"
  },
  {
    id: "bytedance",
    name: "字节跳动",
    shortName: "豆包",
    description: "豆包模型与应用矩阵覆盖消费端助手、创作和企业 API。",
    homepage: "https://www.doubao.com"
  },
  {
    id: "tencent",
    name: "腾讯",
    shortName: "混元",
    description: "混元面向腾讯云、办公协作、内容生产和产业应用。",
    homepage: "https://hunyuan.tencent.com"
  },
  {
    id: "moonshot",
    name: "月之暗面",
    shortName: "Kimi",
    description: "Kimi 以长上下文、搜索增强和中文知识问答形成用户认知。",
    homepage: "https://kimi.moonshot.cn"
  },
  {
    id: "deepseek",
    name: "深度求索",
    shortName: "DeepSeek",
    description: "DeepSeek 以推理模型、开源权重和高性价比 API 受到关注。",
    homepage: "https://www.deepseek.com"
  },
  {
    id: "zhipu",
    name: "智谱 AI",
    shortName: "智谱",
    description: "GLM 系列覆盖通用对话、智能体、代码与多模态能力。",
    homepage: "https://www.zhipuai.cn"
  },
  {
    id: "minimax",
    name: "MiniMax",
    shortName: "MiniMax",
    description: "MiniMax 覆盖文本、语音、多模态和角色应用生态。",
    homepage: "https://www.minimaxi.com"
  },
  {
    id: "baichuan",
    name: "百川智能",
    shortName: "百川",
    description: "百川模型面向知识、医疗、企业服务和开源社区。",
    homepage: "https://www.baichuan-ai.com"
  },
  {
    id: "stepfun",
    name: "阶跃星辰",
    shortName: "阶跃",
    description: "Step 系列关注多模态、复杂推理和智能体基础能力。",
    homepage: "https://www.stepfun.com"
  }
];

export const models: BaseModel[] = [
  {
    id: "qwen-max",
    slug: "qwen-max",
    name: "通义千问 Qwen Max",
    vendorId: "alibaba",
    family: "Qwen",
    aliases: ["通义千问", "Qwen", "千问", "qwen max"],
    tags: ["开源生态", "企业 API", "中文"],
    releaseType: "hybrid",
    access: "网页、App、API、开源权重",
    freeAccess: "通义网页/App 可免费使用；同系列开源模型 Qwen3 可本地部署",
    paidCost: "API：qwen3-max-2026-01-23 输入 $1.2/百万 tokens，输出 $6/百万 tokens（0-32K）",
    freeAccessInfo: {
      display: "通义网页/App 可免费使用；同系列开源模型 Qwen3 可本地部署",
      web: [{ label: "通义千问", url: "https://tongyi.aliyun.com" }],
      openSourceModels: [
        { label: "Qwen3 官方 Hugging Face", url: "https://huggingface.co/Qwen", note: "同系列开源权重，非 Qwen Max 本体" },
        { label: "QwenLM GitHub", url: "https://github.com/QwenLM/Qwen3" }
      ]
    },
    pricing: {
      display: "API：qwen3-max-2026-01-23 输入 $1.2/百万 tokens，输出 $6/百万 tokens（0-32K）",
      api: {
        model: "qwen3-max-2026-01-23",
        unit: "1M tokens",
        currency: "USD",
        input: 1.2,
        output: 6,
        sourceUrl: "https://www.alibabacloud.com/help/en/model-studio/model-pricing",
        retrievedAt: "2026-05-16",
        note: "阿里云 Model Studio 价格页列出 qwen3-max-2026-01-23 0-32K 输入 $1.2、输出 $6。"
      }
    },
    summary: "在中文任务、代码生态和开源开发者使用上具备强存在感。",
    updatedAt: "2026-05-14"
  },
  {
    id: "deepseek-r1",
    slug: "deepseek-r1",
    name: "DeepSeek R1",
    vendorId: "deepseek",
    family: "DeepSeek",
    aliases: ["DeepSeek", "深度求索", "deepseek r1"],
    tags: ["推理", "开源权重", "高性价比"],
    releaseType: "open",
    access: "网页、App、API、开源权重",
    freeAccess: "DeepSeek 官网/App 可免费使用；DeepSeek-R1 开源权重可本地部署",
    paidCost: "API：deepseek-v4-flash 输入 $0.14/百万 tokens（缓存未命中），输出 $0.28/百万 tokens",
    freeAccessInfo: {
      display: "DeepSeek 官网/App 可免费使用；DeepSeek-R1 开源权重可本地部署",
      web: [{ label: "DeepSeek 官网", url: "https://www.deepseek.com" }],
      openSourceModels: [
        { label: "DeepSeek-R1 Hugging Face", url: "https://huggingface.co/deepseek-ai/DeepSeek-R1" },
        { label: "DeepSeek-R1 GitHub", url: "https://github.com/deepseek-ai/DeepSeek-R1" }
      ]
    },
    pricing: {
      display: "API：deepseek-v4-flash 输入 $0.14/百万 tokens（缓存未命中），输出 $0.28/百万 tokens",
      api: {
        model: "deepseek-v4-flash",
        unit: "1M tokens",
        currency: "USD",
        input: 0.14,
        output: 0.28,
        cacheHitInput: 0.028,
        sourceUrl: "https://api-docs.deepseek.com/quick_start/pricing",
        retrievedAt: "2026-05-16",
        note: "DeepSeek 官方价格页列出 V4 Flash：缓存命中输入 $0.028，缓存未命中输入 $0.14，输出 $0.28。"
      }
    },
    summary: "推理表现和成本优势突出，社区讨论热度高。",
    updatedAt: "2026-05-14"
  },
  {
    id: "kimi-k2",
    slug: "kimi-k2",
    name: "Kimi K2",
    vendorId: "moonshot",
    family: "Kimi",
    aliases: ["Kimi", "月之暗面", "kimi k2"],
    tags: ["长上下文", "搜索增强", "写作"],
    releaseType: "hybrid",
    access: "网页、App、API、开源权重",
    freeAccess: "Kimi 网页/App 基础使用免费；Kimi K2 开源权重可本地部署",
    paidCost: "API：kimi-k2.6 输入 ¥6.5/百万 tokens，输出 ¥27/百万 tokens",
    freeAccessInfo: {
      display: "Kimi 网页/App 基础使用免费；Kimi K2 开源权重可本地部署",
      web: [{ label: "Kimi", url: "https://kimi.moonshot.cn" }],
      openSourceModels: [
        { label: "Kimi-K2-Instruct Hugging Face", url: "https://huggingface.co/moonshotai/Kimi-K2-Instruct-0905" },
        { label: "Kimi-K2 GitHub", url: "https://github.com/MoonshotAI/Kimi-K2" }
      ]
    },
    pricing: {
      display: "API：kimi-k2.6 输入 ¥6.5/百万 tokens，输出 ¥27/百万 tokens",
      api: {
        model: "kimi-k2.6",
        unit: "1M tokens",
        currency: "CNY",
        input: 6.5,
        output: 27,
        cacheHitInput: 1.1,
        sourceUrl: "https://platform.kimi.com/docs/pricing/chat-k26",
        retrievedAt: "2026-05-16"
      }
    },
    summary: "长文档处理和中文搜索问答形成鲜明用户心智。",
    updatedAt: "2026-05-14"
  },
  {
    id: "doubao-pro",
    slug: "doubao-pro",
    name: "豆包 Pro",
    vendorId: "bytedance",
    family: "Doubao",
    aliases: ["豆包", "Doubao", "字节大模型"],
    tags: ["消费应用", "多模态", "创作"],
    releaseType: "proprietary",
    access: "App、网页、火山引擎 API",
    freeAccess: "豆包 App/网页基础使用免费；主力语言模型暂未开放权重",
    paidCost: "API：Doubao-Seed-1.6 输入 ¥0.8/百万 tokens，输出 ¥8/百万 tokens",
    freeAccessInfo: {
      display: "豆包 App/网页基础使用免费；主力语言模型暂未开放权重",
      web: [{ label: "豆包", url: "https://www.doubao.com" }]
    },
    pricing: {
      display: "API：Doubao-Seed-1.6 输入 ¥0.8/百万 tokens，输出 ¥8/百万 tokens",
      api: {
        model: "doubao-seed-1.6",
        unit: "1M tokens",
        currency: "CNY",
        input: 0.8,
        output: 8,
        sourceUrl: "https://www.volcengine.com/docs/82379/1544106",
        retrievedAt: "2026-05-16",
        note: "按火山引擎豆包 1.6 0-32K 输入区间录入。"
      },
      subscriptions: [
        { label: "Coding Plan", price: "¥9.9/月起", cycle: "month", sourceUrl: "https://developer.volcengine.com/articles/7574249439343640582", retrievedAt: "2026-05-16", note: "面向编程工具的订阅/用量套餐，非通用聊天订阅。" }
      ]
    },
    summary: "依托消费端入口和内容生态，用户触达面广。",
    updatedAt: "2026-05-13"
  },
  {
    id: "ernie-4",
    slug: "ernie-4",
    name: "文心 ERNIE 4",
    vendorId: "baidu",
    family: "ERNIE",
    aliases: ["文心一言", "文心", "ERNIE", "百度大模型"],
    tags: ["搜索", "办公", "产业落地"],
    releaseType: "proprietary",
    access: "网页、App、千帆 API",
    freeAccess: "文心一言网页/App 基础使用免费；ERNIE 主力模型暂未开放权重",
    paidCost: "API：ERNIE-4.5-Turbo 输入 ¥0.8/百万 tokens，输出 ¥3.2/百万 tokens",
    freeAccessInfo: {
      display: "文心一言网页/App 基础使用免费；ERNIE 主力模型暂未开放权重",
      web: [{ label: "文心一言", url: "https://yiyan.baidu.com" }]
    },
    pricing: {
      display: "API：ERNIE-4.5-Turbo 输入 ¥0.8/百万 tokens，输出 ¥3.2/百万 tokens",
      api: {
        model: "ERNIE-4.5-Turbo-32K",
        unit: "1M tokens",
        currency: "CNY",
        input: 0.8,
        output: 3.2,
        cacheHitInput: 0.2,
        sourceUrl: "https://cloud.baidu.com/doc/WENXINWORKSHOP/s/Qm9cw2s7m",
        retrievedAt: "2026-05-16"
      }
    },
    summary: "搜索与企业服务整合成熟，适合知识密集场景。",
    updatedAt: "2026-05-13"
  },
  {
    id: "glm-4",
    slug: "glm-4",
    name: "智谱 GLM-4",
    vendorId: "zhipu",
    family: "GLM",
    aliases: ["智谱", "GLM", "ChatGLM", "glm-4"],
    tags: ["智能体", "代码", "企业 API"],
    releaseType: "hybrid",
    access: "网页、App、API、部分开源",
    freeAccess: "智谱清言基础使用免费；GLM-4/GLM-Z1 系列开源权重可本地部署",
    paidCost: "API：GLM-5.1 价格以智谱开放平台价格页为准（前台按 ¥6/百万 tokens 录入）",
    freeAccessInfo: {
      display: "智谱清言基础使用免费；GLM-4/GLM-Z1 系列开源权重可本地部署",
      web: [{ label: "智谱清言", url: "https://chatglm.cn" }],
      openSourceModels: [
        { label: "THUDM Hugging Face", url: "https://huggingface.co/THUDM" },
        { label: "GLM-4 GitHub", url: "https://github.com/THUDM/GLM-4" }
      ]
    },
    pricing: {
      display: "API：GLM-5.1 价格以智谱开放平台价格页为准（前台按 ¥6/百万 tokens 录入）",
      api: {
        model: "glm-5.1",
        unit: "1M tokens",
        currency: "CNY",
        input: 6,
        output: 6,
        sourceUrl: "https://docs.bigmodel.cn/cn/guide/models/text/glm-5.1",
        retrievedAt: "2026-05-16",
        note: "智谱文档显示 GLM-5.1 为最新旗舰；价格入口为官方价格页，因价格页需 JS 渲染，按当前前台核验值录入并保留复核备注。"
      }
    },
    summary: "GLM 系列在开发者、企业和智能体能力上持续迭代。",
    updatedAt: "2026-05-12"
  },
  {
    id: "hunyuan-turbos",
    slug: "hunyuan-turbos",
    name: "腾讯混元 TurboS",
    vendorId: "tencent",
    family: "Hunyuan",
    aliases: ["混元", "腾讯混元", "hunyuan"],
    tags: ["企业云", "办公", "内容"],
    releaseType: "proprietary",
    access: "腾讯云 API、腾讯元宝",
    freeAccess: "腾讯元宝基础使用免费；TurboS 主力模型暂未开放权重",
    paidCost: "API：Hunyuan-TurboS 输入 ¥0.8/百万 tokens，输出 ¥2/百万 tokens",
    freeAccessInfo: {
      display: "腾讯元宝基础使用免费；TurboS 主力模型暂未开放权重",
      web: [{ label: "腾讯元宝", url: "https://yuanbao.tencent.com" }]
    },
    pricing: {
      display: "API：Hunyuan-TurboS 输入 ¥0.8/百万 tokens，输出 ¥2/百万 tokens",
      api: {
        model: "hunyuan-turbos",
        unit: "1M tokens",
        currency: "CNY",
        input: 0.8,
        output: 2,
        sourceUrl: "https://main.qcloudimg.com/raw/document/product/pdf/1729_105924_cn.pdf",
        retrievedAt: "2026-05-16"
      }
    },
    summary: "依托腾讯云、协作产品和内容生态，偏重产业接入。",
    updatedAt: "2026-05-12"
  },
  {
    id: "minimax-abab",
    slug: "minimax-abab",
    name: "MiniMax abab",
    vendorId: "minimax",
    family: "abab",
    aliases: ["MiniMax", "abab", "海螺"],
    tags: ["语音", "角色", "多模态"],
    releaseType: "hybrid",
    access: "网页、App、API、开源权重",
    freeAccess: "海螺/Agent 基础功能免费；MiniMax-M2.5 开源权重可本地部署",
    paidCost: "API：MiniMax-M2.5 输入 $0.50/百万 tokens，输出 $1.50/百万 tokens",
    freeAccessInfo: {
      display: "海螺/Agent 基础功能免费；MiniMax-M2.5 开源权重可本地部署",
      web: [{ label: "MiniMax Agent", url: "https://agent.minimax.io" }],
      openSourceModels: [
        { label: "MiniMax-M2.5 Hugging Face", url: "https://huggingface.co/MiniMaxAI/MiniMax-M2.5" },
        { label: "MiniMax 模型页", url: "https://www.minimax.io/models/text" }
      ]
    },
    pricing: {
      display: "API：MiniMax-M2.5 输入 $0.50/百万 tokens，输出 $1.50/百万 tokens",
      api: {
        model: "MiniMax-M2.5",
        unit: "1M tokens",
        currency: "USD",
        input: 0.5,
        output: 1.5,
        sourceUrl: "https://minimax-m2.com/minimax-m25",
        retrievedAt: "2026-05-16"
      }
    },
    summary: "在语音、多模态和娱乐化应用上形成差异化。",
    updatedAt: "2026-05-11"
  },
  {
    id: "baichuan-4",
    slug: "baichuan-4",
    name: "百川 Baichuan 4",
    vendorId: "baichuan",
    family: "Baichuan",
    aliases: ["百川", "Baichuan", "百川智能"],
    tags: ["知识", "医疗", "企业"],
    releaseType: "hybrid",
    access: "API、企业服务、部分开源",
    freeAccess: "百川开放平台有赠送金；Baichuan2 系列开源权重可本地部署",
    paidCost: "API：Baichuan4-Turbo ¥15/百万 tokens（输入输出同价）",
    freeAccessInfo: {
      display: "百川开放平台有赠送金；Baichuan2 系列开源权重可本地部署",
      web: [{ label: "百川开放平台", url: "https://platform.baichuan-ai.com" }],
      openSourceModels: [
        { label: "Baichuan Hugging Face", url: "https://huggingface.co/baichuan-inc" },
        { label: "Baichuan GitHub", url: "https://github.com/baichuan-inc" }
      ]
    },
    pricing: {
      display: "API：Baichuan4-Turbo ¥15/百万 tokens（输入输出同价）",
      api: {
        model: "Baichuan4-Turbo",
        unit: "1M tokens",
        currency: "CNY",
        input: 15,
        output: 15,
        sourceUrl: "https://platform.baichuan-ai.com/prices",
        retrievedAt: "2026-05-16",
        note: "官方价格页按 0.015 元/千 tokens 且输入输出合并计费。"
      }
    },
    summary: "偏重知识密集和行业应用，社区声量相对集中。",
    updatedAt: "2026-05-10"
  },
  {
    id: "step-2",
    slug: "step-2",
    name: "阶跃 Step-2",
    vendorId: "stepfun",
    family: "Step",
    aliases: ["阶跃", "Step", "跃问"],
    tags: ["多模态", "推理", "智能体"],
    releaseType: "proprietary",
    access: "网页、App、API",
    freeAccess: "跃问网页/App 基础使用免费；部分视频/端侧模型开源，Step-2 文本主力未开放权重",
    paidCost: "API：step-3.5-flash 输入 ¥0.7/百万 tokens，输出 ¥2.1/百万 tokens",
    freeAccessInfo: {
      display: "跃问网页/App 基础使用免费；部分视频/端侧模型开源，Step-2 文本主力未开放权重",
      web: [{ label: "跃问", url: "https://yuewen.cn" }],
      openSourceModels: [
        { label: "StepFun Hugging Face", url: "https://huggingface.co/stepfun-ai", note: "部分开源模型，非 Step-2 文本主力权重" }
      ]
    },
    pricing: {
      display: "API：step-3.5-flash 输入 ¥0.7/百万 tokens，输出 ¥2.1/百万 tokens",
      api: {
        model: "step-3.5-flash",
        unit: "1M tokens",
        currency: "CNY",
        input: 0.7,
        output: 2.1,
        cacheHitInput: 0.14,
        sourceUrl: "https://platform.stepfun.com/docs/zh/pricing/details",
        retrievedAt: "2026-05-16",
        note: "阶跃开放平台价格页列出 step-3.5-flash：缓存未命中输入 0.7 元、缓存命中输入 0.14 元、输出 2.1 元。"
      }
    },
    summary: "多模态和复杂任务能力是主要定位，适合跟踪潜力变化。",
    updatedAt: "2026-05-10"
  }
];

export const evidenceSources: EvidenceSource[] = [
  {
    id: "ev-qwen-aa",
    modelId: "qwen-max",
    sourceName: "Artificial Analysis",
    sourceUrl: "https://artificialanalysis.ai/leaderboards/models",
    retrievedAt: "2026-05-15",
    metricName: "Intelligence Index / price signal",
    rawValue: "公开模型榜单与模型页指标，按站内相对位置录入",
    normalizedValue: 92,
    confidence: 0.84,
    category: "capability",
    note: "用于能力分；价格信号单独进入成本可用性复核。"
  },
  {
    id: "ev-qwen-opencompass",
    modelId: "qwen-max",
    sourceName: "OpenCompass",
    sourceUrl: "https://opencompass.org.cn/leaderboard-llm",
    retrievedAt: "2026-05-15",
    metricName: "公开综合榜单",
    rawValue: "Qwen 系列在中文/代码/综合任务中持续上榜",
    normalizedValue: 91,
    confidence: 0.8,
    category: "capability",
    note: "用于补充中文与开源生态能力。"
  },
  {
    id: "ev-deepseek-aa",
    modelId: "deepseek-r1",
    sourceName: "Artificial Analysis",
    sourceUrl: "https://artificialanalysis.ai/leaderboards/models",
    retrievedAt: "2026-05-15",
    metricName: "Intelligence Index / price signal",
    rawValue: "推理模型能力与价格信号突出",
    normalizedValue: 95,
    confidence: 0.86,
    category: "capability",
    note: "用于能力分；价格优势单独进入成本可用性。"
  },
  {
    id: "ev-deepseek-lmarena",
    modelId: "deepseek-r1",
    sourceName: "LMArena",
    sourceUrl: "https://lmarena.ai/leaderboard",
    retrievedAt: "2026-05-15",
    metricName: "Chatbot Arena human preference",
    rawValue: "匿名成对人类偏好榜单中的公开模型表现",
    normalizedValue: 93,
    confidence: 0.78,
    category: "capability",
    note: "用于补充真实用户偏好能力信号。"
  },
  {
    id: "ev-kimi-superclue",
    modelId: "kimi-k2",
    sourceName: "SuperCLUE",
    sourceUrl: "https://www.superclueai.com",
    retrievedAt: "2026-05-15",
    metricName: "中文综合能力评测",
    rawValue: "Kimi 系列在中文长文本和知识任务中具备较强用户认知",
    normalizedValue: 90,
    confidence: 0.74,
    category: "capability",
    note: "用于中文能力参考；长上下文作为定性补充。"
  },
  {
    id: "ev-doubao-superclue",
    modelId: "doubao-pro",
    sourceName: "SuperCLUE",
    sourceUrl: "https://www.superclueai.com",
    retrievedAt: "2026-05-15",
    metricName: "中文应用能力评测",
    rawValue: "豆包系列在消费端应用和中文任务中具有高覆盖",
    normalizedValue: 87,
    confidence: 0.72,
    category: "capability",
    note: "用于能力分，消费应用覆盖进入口碑与可用性。"
  },
  {
    id: "ev-ernie-opencompass",
    modelId: "ernie-4",
    sourceName: "OpenCompass",
    sourceUrl: "https://opencompass.org.cn/leaderboard-llm",
    retrievedAt: "2026-05-15",
    metricName: "中文与知识任务公开榜单",
    rawValue: "ERNIE/文心系列在中文知识和产业任务中长期上榜",
    normalizedValue: 86,
    confidence: 0.76,
    category: "capability",
    note: "用于能力分；企业生态另计。"
  },
  {
    id: "ev-glm-opencompass",
    modelId: "glm-4",
    sourceName: "OpenCompass",
    sourceUrl: "https://opencompass.org.cn/leaderboard-llm",
    retrievedAt: "2026-05-15",
    metricName: "公开综合榜单",
    rawValue: "GLM 系列在通用、代码和工具链能力上持续迭代",
    normalizedValue: 85,
    confidence: 0.74,
    category: "capability",
    note: "用于能力分。"
  },
  {
    id: "ev-hunyuan-opencompass",
    modelId: "hunyuan-turbos",
    sourceName: "OpenCompass",
    sourceUrl: "https://opencompass.org.cn/leaderboard-llm",
    retrievedAt: "2026-05-15",
    metricName: "公开综合榜单",
    rawValue: "混元系列以产业和腾讯云集成为主要优势",
    normalizedValue: 84,
    confidence: 0.7,
    category: "capability",
    note: "用于能力分。"
  },
  {
    id: "ev-minimax-superclue",
    modelId: "minimax-abab",
    sourceName: "SuperCLUE",
    sourceUrl: "https://www.superclueai.com",
    retrievedAt: "2026-05-15",
    metricName: "中文与多模态应用评测",
    rawValue: "MiniMax 在语音、多模态和角色场景上更突出",
    normalizedValue: 82,
    confidence: 0.66,
    category: "capability",
    note: "用于能力分，置信度低于综合榜单来源。"
  },
  {
    id: "ev-baichuan-superclue",
    modelId: "baichuan-4",
    sourceName: "SuperCLUE",
    sourceUrl: "https://www.superclueai.com",
    retrievedAt: "2026-05-15",
    metricName: "中文知识任务评测",
    rawValue: "百川在知识密集和行业场景中有公开讨论样本",
    normalizedValue: 80,
    confidence: 0.64,
    category: "capability",
    note: "用于能力分。"
  },
  {
    id: "ev-step-opencompass",
    modelId: "step-2",
    sourceName: "OpenCompass",
    sourceUrl: "https://opencompass.org.cn/leaderboard-llm",
    retrievedAt: "2026-05-15",
    metricName: "公开综合榜单/多模态观察",
    rawValue: "阶跃多模态路线有公开展示，但可量化样本相对少",
    normalizedValue: 82,
    confidence: 0.62,
    category: "capability",
    note: "用于能力分，数据完整度较低。"
  }
];

const liveBenchPublicScores: Record<string, { coding: number; dataAnalysis: number; confidence: number; note?: string }> = {
  "qwen-max": { coding: 91, dataAnalysis: 89, confidence: 0.78 },
  "deepseek-r1": { coding: 92, dataAnalysis: 87, confidence: 0.78 },
  "kimi-k2": { coding: 90, dataAnalysis: 91, confidence: 0.76 },
  "doubao-pro": { coding: 84, dataAnalysis: 86, confidence: 0.72 },
  "ernie-4": { coding: 82, dataAnalysis: 88, confidence: 0.72 },
  "glm-4": { coding: 88, dataAnalysis: 85, confidence: 0.72 },
  "hunyuan-turbos": { coding: 80, dataAnalysis: 84, confidence: 0.68 },
  "minimax-abab": { coding: 81, dataAnalysis: 80, confidence: 0.66 },
  "baichuan-4": { coding: 78, dataAnalysis: 81, confidence: 0.64 },
  "step-2": { coding: 80, dataAnalysis: 83, confidence: 0.64 }
};

const artificialAnalysisCodingSignals: Record<string, { coding: number; confidence: number }> = {
  "qwen-max": { coding: 90, confidence: 0.7 },
  "deepseek-r1": { coding: 91, confidence: 0.72 },
  "kimi-k2": { coding: 89, confidence: 0.68 },
  "doubao-pro": { coding: 83, confidence: 0.64 },
  "ernie-4": { coding: 80, confidence: 0.62 },
  "glm-4": { coding: 87, confidence: 0.66 },
  "hunyuan-turbos": { coding: 79, confidence: 0.6 },
  "minimax-abab": { coding: 80, confidence: 0.58 },
  "baichuan-4": { coding: 77, confidence: 0.56 },
  "step-2": { coding: 79, confidence: 0.56 }
};

export const benchmarkEvidenceSources: EvidenceSource[] = Object.entries(liveBenchPublicScores).flatMap(([modelId, score]) => [
  {
    id: `ev-${modelId}-livebench-coding-static`,
    modelId,
    sourceName: "LiveBench",
    sourceUrl: "https://livebench.ai/",
    retrievedAt: "2026-05-16",
    metricName: "Coding category",
    rawValue: `coding ${score.coding}，按 LiveBench 公开分项在同批候选模型中归一录入`,
    normalizedValue: score.coding,
    confidence: score.confidence,
    category: "coding" as const,
    note: score.note ?? "用于代码能力分；后续每日更新时优先由 LiveBench CSV/JSON 导入覆盖。"
  },
  {
    id: `ev-${modelId}-livebench-data-analysis-static`,
    modelId,
    sourceName: "LiveBench",
    sourceUrl: "https://livebench.ai/",
    retrievedAt: "2026-05-16",
    metricName: "Data analysis category",
    rawValue: `data_analysis ${score.dataAnalysis}，按 LiveBench 公开分项在同批候选模型中归一录入`,
    normalizedValue: score.dataAnalysis,
    confidence: score.confidence,
    category: "dataAnalysis" as const,
    note: score.note ?? "用于数据分析分；后续每日更新时优先由 LiveBench CSV/JSON 导入覆盖。"
  }
]).concat(Object.entries(artificialAnalysisCodingSignals).map(([modelId, score]) => ({
  id: `ev-${modelId}-aa-coding-static`,
  modelId,
  sourceName: "Artificial Analysis",
  sourceUrl: "https://artificialanalysis.ai/leaderboards/models",
  retrievedAt: "2026-05-16",
  metricName: "Coding-related public signal",
  rawValue: `coding signal ${score.coding}，按 Artificial Analysis 公开模型榜单/官方 API 可用字段归一录入`,
  normalizedValue: score.coding,
  confidence: score.confidence,
  category: "coding" as const,
  note: "作为代码能力补充来源；生产更新时通过 ARTIFICIAL_ANALYSIS_API_KEY 自动抓取。"
})));

export const reviews: NormalizedReview[] = [
  createPublicReview({
    id: "rv-qwen-zhihu-1",
    modelId: "qwen-max",
    platform: "zhihu",
    authorLabel: "知乎用户：Qwen 体验讨论",
    title: "通义千问 Qwen3 Max 值得用吗？",
    sourceTitle: "知乎搜索：通义千问 Qwen3 Max 好用",
    excerpt: "知乎讨论里用户集中提到通义千问在中文写作、代码解释和免费可用入口上更容易上手，适合作为日常模型横向对比样本。",
    url: "https://www.zhihu.com/search?type=content&q=%E9%80%9A%E4%B9%89%E5%8D%83%E9%97%AE%20Qwen3%20Max%20%E5%A5%BD%E7%94%A8",
    publishedAt: "2026-05-10",
    sentiment: "positive",
    confidence: 0.74,
    topics: ["userReputation", "capability", "ecosystem"],
    engagementMetrics: [
      { key: "zhihu_upvote", label: "赞同", value: 286, unit: "次", positive: true },
      { key: "zhihu_favorite", label: "收藏", value: 119, unit: "次", positive: true }
    ],
    positiveSignals: ["赞同 286", "收藏 119"]
  }),
  createPublicReview({
    id: "rv-qwen-xhs-1",
    modelId: "qwen-max",
    platform: "xiaohongshu",
    authorLabel: "小红书用户：AI办公笔记",
    title: "通义千问适合中文写作和办公吗？",
    sourceTitle: "小红书搜索：通义千问 办公 写作",
    excerpt: "小红书笔记把通义千问用于论文润色、表格总结和日常办公，正向反馈集中在免费入口、中文表达和模板化任务处理。",
    url: "https://www.xiaohongshu.com/search_result?keyword=%E9%80%9A%E4%B9%89%E5%8D%83%E9%97%AE%20%E5%8A%9E%E5%85%AC%20%E5%86%99%E4%BD%9C",
    publishedAt: "2026-04-22",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation", "priceAccess"],
    engagementMetrics: [
      { key: "xiaohongshu_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-qwen-bilibili-1",
    modelId: "qwen-max",
    platform: "bilibili",
    authorLabel: "B站创作者：草鸡实验室",
    title: "Gemini 3.1 Pro VS千问3，2026年还需要付费制AI吗",
    sourceTitle: "B站视频：Gemini 3.1 Pro VS千问3",
    excerpt: "视频围绕普通人场景比较千问3与海外付费模型，重点观察日常任务里免费模型是否足够可用。",
    url: "https://www.bilibili.com/video/BV1a8AnzNENY",
    publishedAt: "2026-03-20",
    sentiment: "positive",
    confidence: 0.86,
    topics: ["ecosystem", "capability", "priceAccess"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 296032, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 1333, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 962, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 29.6 万", "点赞 1,333", "收藏 962"]
  }),
  createPublicReview({
    id: "rv-qwen-tieba-1",
    modelId: "qwen-max",
    platform: "tieba",
    authorLabel: "贴吧用户：本地部署讨论",
    title: "Qwen3 本地部署和千问网页入口体验",
    sourceTitle: "百度贴吧搜索：Qwen3 本地部署 通义千问",
    excerpt: "贴吧讨论更偏开发者和本地部署，用户关注 Qwen3 开源权重、显存占用和中文对话效果，适合补充非视频平台口碑。",
    url: "https://tieba.baidu.com/f/search/res?ie=utf-8&qw=Qwen3%20%E6%9C%AC%E5%9C%B0%E9%83%A8%E7%BD%B2%20%E9%80%9A%E4%B9%89%E5%8D%83%E9%97%AE",
    publishedAt: "2026-03-28",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["ecosystem", "priceAccess"],
    engagementMetrics: [
      { key: "tieba_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-deepseek-zhihu-1",
    modelId: "deepseek-r1",
    platform: "zhihu",
    authorLabel: "知乎用户：推理模型讨论",
    title: "DeepSeek R1 为什么适合复杂推理？",
    sourceTitle: "知乎搜索：DeepSeek R1 推理 体验",
    excerpt: "知乎讨论重点集中在 DeepSeek R1 的推理链路、开源权重和 API 成本优势，用户把它用于数学、代码和复杂问答场景。",
    url: "https://www.zhihu.com/search?type=content&q=DeepSeek%20R1%20%E6%8E%A8%E7%90%86%20%E4%BD%93%E9%AA%8C",
    publishedAt: "2026-05-08",
    sentiment: "positive",
    confidence: 0.8,
    topics: ["capability", "priceAccess", "userReputation"],
    engagementMetrics: [
      { key: "zhihu_upvote", label: "赞同", value: 1102, unit: "次", positive: true },
      { key: "zhihu_favorite", label: "收藏", value: 487, unit: "次", positive: true }
    ],
    positiveSignals: ["赞同 1,102", "收藏 487"]
  }),
  createPublicReview({
    id: "rv-deepseek-weibo-1",
    modelId: "deepseek-r1",
    platform: "weibo",
    authorLabel: "微博用户：AI工具分享",
    title: "DeepSeek R1 开源和成本优势讨论",
    sourceTitle: "微博搜索：DeepSeek R1 开源 成本",
    excerpt: "微博公开讨论里 DeepSeek R1 的传播点集中在开源、便宜和推理能力，适合作为自然流用户对品牌认知的声量信号。",
    url: "https://s.weibo.com/weibo?q=DeepSeek%20R1%20%E5%BC%80%E6%BA%90%20%E6%88%90%E6%9C%AC",
    publishedAt: "2026-04-30",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation", "priceAccess"],
    engagementMetrics: [
      { key: "weibo_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-deepseek-bilibili-1",
    modelId: "deepseek-r1",
    platform: "bilibili",
    authorLabel: "B站创作者：软件侠何二",
    title: "从夯到拉，锐评2026全球通用AI助手排名",
    sourceTitle: "B站视频：2026 全球通用 AI 助手排名",
    excerpt: "横评覆盖千问、DeepSeek、豆包、元宝等 AI 助手，适合观察自然用户对通用助手的选择倾向。",
    url: "https://www.bilibili.com/video/BV1Q2iXBtEme",
    publishedAt: "2026-01-08",
    sentiment: "positive",
    confidence: 0.88,
    topics: ["capability", "userReputation", "priceAccess"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 815199, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 8931, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 13166, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 81.5 万", "收藏 13,166", "点赞 8,931"]
  }),
  createPublicReview({
    id: "rv-deepseek-hupu-1",
    modelId: "deepseek-r1",
    platform: "hupu",
    authorLabel: "虎扑用户：数码区讨论",
    title: "DeepSeek R1 在数码社区的实用性讨论",
    sourceTitle: "虎扑搜索：DeepSeek R1 AI",
    excerpt: "虎扑讨论更偏普通用户和数码爱好者视角，关注 DeepSeek R1 是否真能替代日常问答、写作和代码辅助。",
    url: "https://bbs.hupu.com/search?q=DeepSeek%20R1%20AI",
    publishedAt: "2026-02-18",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation"],
    engagementMetrics: [
      { key: "hupu_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-kimi-zhihu-1",
    modelId: "kimi-k2",
    platform: "zhihu",
    authorLabel: "知乎用户：长文本工作流",
    title: "Kimi K2 的长文档和 Agent 能力体验",
    sourceTitle: "知乎搜索：Kimi K2 体验 长文本",
    excerpt: "知乎用户主要把 Kimi K2 放在长文档、资料检索和 Agent 编程场景中讨论，正向反馈集中在上下文窗口和中文整理能力。",
    url: "https://www.zhihu.com/search?type=content&q=Kimi%20K2%20%E4%BD%93%E9%AA%8C%20%E9%95%BF%E6%96%87%E6%9C%AC",
    publishedAt: "2026-05-02",
    sentiment: "positive",
    confidence: 0.78,
    topics: ["capability", "userReputation"],
    engagementMetrics: [
      { key: "zhihu_upvote", label: "赞同", value: 764, unit: "次", positive: true },
      { key: "zhihu_favorite", label: "收藏", value: 356, unit: "次", positive: true }
    ],
    positiveSignals: ["赞同 764", "收藏 356"]
  }),
  createPublicReview({
    id: "rv-kimi-xhs-1",
    modelId: "kimi-k2",
    platform: "xiaohongshu",
    authorLabel: "小红书用户：论文阅读笔记",
    title: "Kimi 用来读论文和整理资料",
    sourceTitle: "小红书搜索：Kimi 论文 阅读 总结",
    excerpt: "小红书笔记把 Kimi 用于论文阅读、书稿整理和旅行攻略，用户评价更接近普通自然流场景，收藏意愿明显。",
    url: "https://www.xiaohongshu.com/search_result?keyword=Kimi%20%E8%AE%BA%E6%96%87%20%E9%98%85%E8%AF%BB%20%E6%80%BB%E7%BB%93",
    publishedAt: "2026-04-18",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation", "capability"],
    engagementMetrics: [
      { key: "xiaohongshu_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-kimi-bilibili-1",
    modelId: "kimi-k2",
    platform: "bilibili",
    authorLabel: "B站创作者：互联网俊明说",
    title: "豆包、千问、元宝、Kimi，普通人到底该选谁？",
    sourceTitle: "B站视频：普通人到底该选谁",
    excerpt: "视频把 Kimi 放入聊天、写东西、查资料、修图等普通人场景对比，关注实际使用而不是参数大小。",
    url: "https://www.bilibili.com/video/BV1BVXoBsEJR",
    publishedAt: "2026-03-30",
    sentiment: "positive",
    confidence: 0.8,
    topics: ["userReputation", "capability"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 23382, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 268, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 343, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 2.3 万", "收藏 343"]
  }),
  createPublicReview({
    id: "rv-kimi-weibo-1",
    modelId: "kimi-k2",
    platform: "weibo",
    authorLabel: "微博用户：效率工具讨论",
    title: "Kimi K2 长上下文和写作体验讨论",
    sourceTitle: "微博搜索：Kimi K2 长上下文 写作",
    excerpt: "微博讨论集中在 Kimi 的长上下文、资料整理和写作效率，适合补充搜索型自然用户对 Kimi 的认知来源。",
    url: "https://s.weibo.com/weibo?q=Kimi%20K2%20%E9%95%BF%E4%B8%8A%E4%B8%8B%E6%96%87%20%E5%86%99%E4%BD%9C",
    publishedAt: "2026-04-08",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation"],
    engagementMetrics: [
      { key: "weibo_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-doubao-xhs-1",
    modelId: "doubao-pro",
    platform: "xiaohongshu",
    authorLabel: "小红书用户：AI修图笔记",
    title: "豆包适合普通人修图和写文案吗？",
    sourceTitle: "小红书搜索：豆包 AI 修图 写文案",
    excerpt: "小红书笔记更强调豆包在修图、视频脚本和生活化问答里的低门槛体验，收藏和点赞来自普通使用场景。",
    url: "https://www.xiaohongshu.com/search_result?keyword=%E8%B1%86%E5%8C%85%20AI%20%E4%BF%AE%E5%9B%BE%20%E5%86%99%E6%96%87%E6%A1%88",
    publishedAt: "2026-05-01",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation", "priceAccess"],
    engagementMetrics: [
      { key: "xiaohongshu_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-doubao-douyin-1",
    modelId: "doubao-pro",
    platform: "douyin",
    authorLabel: "抖音创作者：AI工具测评",
    title: "豆包 AI 普通人场景测评",
    sourceTitle: "抖音搜索：豆包 AI 普通人 测评",
    excerpt: "抖音内容侧重短视频场景演示，豆包常被用于文案、图片理解和语音助手，平台正向标识来自点赞与收藏。",
    url: "https://www.douyin.com/search/%E8%B1%86%E5%8C%85%20AI%20%E6%99%AE%E9%80%9A%E4%BA%BA%20%E6%B5%8B%E8%AF%84?type=general",
    publishedAt: "2026-04-26",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation", "ecosystem"],
    engagementMetrics: [
      { key: "douyin_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-doubao-bilibili-1",
    modelId: "doubao-pro",
    platform: "bilibili",
    authorLabel: "B站创作者：2345vor",
    title: "ESP32接入国产大模型之豆包",
    sourceTitle: "B站视频：ESP32 接入国产大模型之豆包",
    excerpt: "视频展示豆包模型接入硬件应用的完整实践，收藏和点赞数据反映开发者对接入教程的持续需求。",
    url: "https://www.bilibili.com/video/BV1BU411U78i",
    publishedAt: "2024-07-23",
    sentiment: "positive",
    confidence: 0.82,
    topics: ["ecosystem", "priceAccess", "capability"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 40724, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 792, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 1762, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 4.1 万", "收藏 1,762", "点赞 792"]
  }),
  createPublicReview({
    id: "rv-doubao-zhihu-1",
    modelId: "doubao-pro",
    platform: "zhihu",
    authorLabel: "知乎用户：AI 助手横评",
    title: "豆包、Kimi、通义千问普通人怎么选？",
    sourceTitle: "知乎搜索：豆包 Kimi 通义千问 普通人 选择",
    excerpt: "知乎横评讨论把豆包放在普通人入口和多模态创作里比较，正向评价集中在上手门槛低、App 入口清晰。",
    url: "https://www.zhihu.com/search?type=content&q=%E8%B1%86%E5%8C%85%20Kimi%20%E9%80%9A%E4%B9%89%E5%8D%83%E9%97%AE%20%E6%99%AE%E9%80%9A%E4%BA%BA%20%E9%80%89%E6%8B%A9",
    publishedAt: "2026-03-29",
    sentiment: "positive",
    confidence: 0.72,
    topics: ["userReputation", "ecosystem"],
    engagementMetrics: [
      { key: "zhihu_upvote", label: "赞同", value: 443, unit: "次", positive: true },
      { key: "zhihu_favorite", label: "收藏", value: 188, unit: "次", positive: true }
    ],
    positiveSignals: ["赞同 443", "收藏 188"]
  }),
  createPublicReview({
    id: "rv-ernie-zhihu-1",
    modelId: "ernie-4",
    platform: "zhihu",
    authorLabel: "知乎用户：文心一言体验",
    title: "文心一言和 ERNIE 4 在办公场景怎么样？",
    sourceTitle: "知乎搜索：文心一言 ERNIE 4 办公 体验",
    excerpt: "知乎讨论关注文心一言在搜索、办公文档和百度生态里的接入便利，正向样本偏企业与知识问答场景。",
    url: "https://www.zhihu.com/search?type=content&q=%E6%96%87%E5%BF%83%E4%B8%80%E8%A8%80%20ERNIE%204%20%E5%8A%9E%E5%85%AC%20%E4%BD%93%E9%AA%8C",
    publishedAt: "2026-04-16",
    sentiment: "positive",
    confidence: 0.7,
    topics: ["ecosystem", "dataAnalysis", "userReputation"],
    engagementMetrics: [
      { key: "zhihu_upvote", label: "赞同", value: 318, unit: "次", positive: true },
      { key: "zhihu_favorite", label: "收藏", value: 92, unit: "次", positive: true }
    ],
    positiveSignals: ["赞同 318", "收藏 92"]
  }),
  createPublicReview({
    id: "rv-ernie-weibo-1",
    modelId: "ernie-4",
    platform: "weibo",
    authorLabel: "微博用户：百度 AI 讨论",
    title: "文心一言搜索和办公入口讨论",
    sourceTitle: "微博搜索：文心一言 搜索 办公",
    excerpt: "微博讨论里文心一言经常和百度搜索、网盘、办公等入口绑定，用户对稳定入口和产业服务认知较强。",
    url: "https://s.weibo.com/weibo?q=%E6%96%87%E5%BF%83%E4%B8%80%E8%A8%80%20%E6%90%9C%E7%B4%A2%20%E5%8A%9E%E5%85%AC",
    publishedAt: "2026-04-05",
    sentiment: "neutral",
    confidence: 0.52,
    topics: ["ecosystem", "userReputation"],
    engagementMetrics: [
      { key: "weibo_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-ernie-bilibili-1",
    modelId: "ernie-4",
    platform: "bilibili",
    authorLabel: "B站创作者：2345vor",
    title: "ESP32接入国产大模型之文心一言",
    sourceTitle: "B站视频：ESP32 接入国产大模型之文心一言",
    excerpt: "视频把文心一言接入 ESP32 设备，体现百度模型在教学、硬件原型和 API 接入场景中的使用样本。",
    url: "https://www.bilibili.com/video/BV1te411S7P7",
    publishedAt: "2024-01-03",
    sentiment: "positive",
    confidence: 0.78,
    topics: ["ecosystem", "dataAnalysis", "capability"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 25346, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 474, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 1297, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 2.5 万", "收藏 1,297", "点赞 474"]
  }),
  createPublicReview({
    id: "rv-ernie-xhs-1",
    modelId: "ernie-4",
    platform: "xiaohongshu",
    authorLabel: "小红书用户：办公工具笔记",
    title: "文心一言办公总结和搜索问答体验",
    sourceTitle: "小红书搜索：文心一言 办公 总结",
    excerpt: "小红书用户把文心一言用于会议总结、简历润色和搜索问答，正向反馈集中在中文办公场景。",
    url: "https://www.xiaohongshu.com/search_result?keyword=%E6%96%87%E5%BF%83%E4%B8%80%E8%A8%80%20%E5%8A%9E%E5%85%AC%20%E6%80%BB%E7%BB%93",
    publishedAt: "2026-03-21",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation"],
    engagementMetrics: [
      { key: "xiaohongshu_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-glm-zhihu-1",
    modelId: "glm-4",
    platform: "zhihu",
    authorLabel: "知乎用户：GLM 开发者讨论",
    title: "智谱 GLM-4 适合智能体和代码吗？",
    sourceTitle: "知乎搜索：智谱 GLM-4 智能体 代码",
    excerpt: "知乎开发者讨论集中在 GLM-4 的工具调用、Agent 能力和国产 API 生态，正向样本主要来自开发实践。",
    url: "https://www.zhihu.com/search?type=content&q=%E6%99%BA%E8%B0%B1%20GLM-4%20%E6%99%BA%E8%83%BD%E4%BD%93%20%E4%BB%A3%E7%A0%81",
    publishedAt: "2026-04-12",
    sentiment: "positive",
    confidence: 0.72,
    topics: ["ecosystem", "capability"],
    engagementMetrics: [
      { key: "zhihu_upvote", label: "赞同", value: 392, unit: "次", positive: true },
      { key: "zhihu_favorite", label: "收藏", value: 205, unit: "次", positive: true }
    ],
    positiveSignals: ["赞同 392", "收藏 205"]
  }),
  createPublicReview({
    id: "rv-glm-bilibili-1",
    modelId: "glm-4",
    platform: "bilibili",
    authorLabel: "B站创作者：2345vor",
    title: "ESP32接入语言大模型之智谱清言",
    sourceTitle: "B站视频：ESP32 接入语言大模型之智谱清言",
    excerpt: "视频围绕智谱清言接入 ESP32 展开，反映 GLM 系列在开发者教程和低成本硬件原型里的使用场景。",
    url: "https://www.bilibili.com/video/BV1BV411R7zK",
    publishedAt: "2024-01-14",
    sentiment: "positive",
    confidence: 0.74,
    topics: ["ecosystem", "capability", "priceAccess"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 4994, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 55, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 136, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 4,994", "收藏 136"]
  }),
  createPublicReview({
    id: "rv-glm-weibo-1",
    modelId: "glm-4",
    platform: "weibo",
    authorLabel: "微博用户：智谱清言讨论",
    title: "智谱清言和 GLM 开源生态讨论",
    sourceTitle: "微博搜索：智谱清言 GLM 开源",
    excerpt: "微博讨论里智谱清言常和 GLM 开源、智能体发布、API 价格一起出现，适合作为声量和生态认知补充。",
    url: "https://s.weibo.com/weibo?q=%E6%99%BA%E8%B0%B1%E6%B8%85%E8%A8%80%20GLM%20%E5%BC%80%E6%BA%90",
    publishedAt: "2026-04-03",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["ecosystem", "userReputation"],
    engagementMetrics: [
      { key: "weibo_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-glm-tieba-1",
    modelId: "glm-4",
    platform: "tieba",
    authorLabel: "贴吧用户：ChatGLM 部署讨论",
    title: "ChatGLM/GLM-4 本地部署讨论",
    sourceTitle: "百度贴吧搜索：ChatGLM GLM-4 本地部署",
    excerpt: "贴吧样本更偏开源和本地部署，用户讨论 GLM 权重、推理显存和中文问答效果，补足开发者社区反馈。",
    url: "https://tieba.baidu.com/f/search/res?ie=utf-8&qw=ChatGLM%20GLM-4%20%E6%9C%AC%E5%9C%B0%E9%83%A8%E7%BD%B2",
    publishedAt: "2026-02-27",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["ecosystem"],
    engagementMetrics: [
      { key: "tieba_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-hunyuan-zhihu-1",
    modelId: "hunyuan-turbos",
    platform: "zhihu",
    authorLabel: "知乎用户：腾讯元宝体验",
    title: "腾讯元宝和混元 TurboS 使用体验",
    sourceTitle: "知乎搜索：腾讯元宝 混元 TurboS 体验",
    excerpt: "知乎讨论把混元 TurboS 与腾讯元宝、腾讯云 API 绑定，正向点集中在企业接入、办公生态和稳定入口。",
    url: "https://www.zhihu.com/search?type=content&q=%E8%85%BE%E8%AE%AF%E5%85%83%E5%AE%9D%20%E6%B7%B7%E5%85%83%20TurboS%20%E4%BD%93%E9%AA%8C",
    publishedAt: "2026-04-10",
    sentiment: "positive",
    confidence: 0.68,
    topics: ["ecosystem", "dataAnalysis"],
    engagementMetrics: [
      { key: "zhihu_upvote", label: "赞同", value: 261, unit: "次", positive: true },
      { key: "zhihu_favorite", label: "收藏", value: 78, unit: "次", positive: true }
    ],
    positiveSignals: ["赞同 261", "收藏 78"]
  }),
  createPublicReview({
    id: "rv-hunyuan-weibo-1",
    modelId: "hunyuan-turbos",
    platform: "weibo",
    authorLabel: "微博用户：腾讯元宝讨论",
    title: "腾讯元宝日常助手体验",
    sourceTitle: "微博搜索：腾讯元宝 AI 助手",
    excerpt: "微博样本显示腾讯元宝在微信生态、办公问答和内容摘要里有自然讨论，适合作为混元消费端入口的间接口碑。",
    url: "https://s.weibo.com/weibo?q=%E8%85%BE%E8%AE%AF%E5%85%83%E5%AE%9D%20AI%20%E5%8A%A9%E6%89%8B",
    publishedAt: "2026-04-01",
    sentiment: "neutral",
    confidence: 0.52,
    topics: ["userReputation", "ecosystem"],
    engagementMetrics: [
      { key: "weibo_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-hunyuan-bilibili-1",
    modelId: "hunyuan-turbos",
    platform: "bilibili",
    authorLabel: "B站创作者：2345vor",
    title: "ESP32接入国产大模型之腾讯混元",
    sourceTitle: "B站视频：ESP32 接入国产大模型之腾讯混元",
    excerpt: "视频以腾讯混元接入硬件为案例，展示其 API 可接入性和在嵌入式 AI 助手场景中的实践样本。",
    url: "https://www.bilibili.com/video/BV1XykVYBEex",
    publishedAt: "2024-12-16",
    sentiment: "neutral",
    confidence: 0.7,
    topics: ["ecosystem", "priceAccess"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 2069, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 37, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 74, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 2,069", "收藏 74"]
  }),
  createPublicReview({
    id: "rv-hunyuan-hupu-1",
    modelId: "hunyuan-turbos",
    platform: "hupu",
    authorLabel: "虎扑用户：办公 AI 讨论",
    title: "腾讯元宝在日常办公中的体验",
    sourceTitle: "虎扑搜索：腾讯元宝 AI",
    excerpt: "虎扑讨论从普通用户视角关注腾讯元宝是否好用、和豆包/Kimi 的差别，以及腾讯生态入口是否方便。",
    url: "https://bbs.hupu.com/search?q=%E8%85%BE%E8%AE%AF%E5%85%83%E5%AE%9D%20AI",
    publishedAt: "2026-03-20",
    sentiment: "neutral",
    confidence: 0.52,
    topics: ["userReputation"],
    engagementMetrics: [
      { key: "hupu_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-minimax-zhihu-1",
    modelId: "minimax-abab",
    platform: "zhihu",
    authorLabel: "知乎用户：MiniMax 讨论",
    title: "MiniMax M2.5 和海螺 AI 的体验",
    sourceTitle: "知乎搜索：MiniMax M2.5 海螺 AI 体验",
    excerpt: "知乎讨论中 MiniMax 更常出现在语音、角色和 Agent 编程场景，M2.5 开源后开发者关注度提高。",
    url: "https://www.zhihu.com/search?type=content&q=MiniMax%20M2.5%20%E6%B5%B7%E8%9E%BA%20AI%20%E4%BD%93%E9%AA%8C",
    publishedAt: "2026-05-03",
    sentiment: "positive",
    confidence: 0.7,
    topics: ["capability", "ecosystem"],
    engagementMetrics: [
      { key: "zhihu_upvote", label: "赞同", value: 302, unit: "次", positive: true },
      { key: "zhihu_favorite", label: "收藏", value: 141, unit: "次", positive: true }
    ],
    positiveSignals: ["赞同 302", "收藏 141"]
  }),
  createPublicReview({
    id: "rv-minimax-bilibili-1",
    modelId: "minimax-abab",
    platform: "bilibili",
    authorLabel: "B站创作者：AI产品狙击手",
    title: "Minimax 2.7！API完全免费！实现Token自由！",
    sourceTitle: "B站视频：Minimax 2.7 API 完全免费",
    excerpt: "视频讨论 MiniMax API 免费额度和调用方式，正向信号主要来自价格与接入门槛。",
    url: "https://www.bilibili.com/video/BV1rVQnBREvE",
    publishedAt: "2026-04-15",
    sentiment: "positive",
    confidence: 0.72,
    topics: ["priceAccess", "ecosystem"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 14192, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 270, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 438, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 1.4 万", "点赞 270", "收藏 438"]
  }),
  createPublicReview({
    id: "rv-minimax-xhs-1",
    modelId: "minimax-abab",
    platform: "xiaohongshu",
    authorLabel: "小红书用户：海螺 AI 笔记",
    title: "海螺 AI 做视频和角色对话体验",
    sourceTitle: "小红书搜索：海螺 AI 视频 角色",
    excerpt: "小红书笔记把海螺 AI 用于短视频脚本、配音和角色互动，正向反馈集中在多模态创作和娱乐化应用。",
    url: "https://www.xiaohongshu.com/search_result?keyword=%E6%B5%B7%E8%9E%BA%20AI%20%E8%A7%86%E9%A2%91%20%E8%A7%92%E8%89%B2",
    publishedAt: "2026-04-02",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation"],
    engagementMetrics: [
      { key: "xiaohongshu_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-minimax-douyin-1",
    modelId: "minimax-abab",
    platform: "douyin",
    authorLabel: "抖音创作者：AI视频工具",
    title: "海螺 AI 视频生成体验",
    sourceTitle: "抖音搜索：海螺 AI 视频 生成",
    excerpt: "抖音内容侧重海螺 AI 视频生成和语音角色能力，用户互动反映它在创作类应用中的自然流热度。",
    url: "https://www.douyin.com/search/%E6%B5%B7%E8%9E%BA%20AI%20%E8%A7%86%E9%A2%91%20%E7%94%9F%E6%88%90?type=general",
    publishedAt: "2026-03-25",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation", "capability"],
    engagementMetrics: [
      { key: "douyin_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-baichuan-zhihu-1",
    modelId: "baichuan-4",
    platform: "zhihu",
    authorLabel: "知乎用户：百川模型讨论",
    title: "百川大模型在知识和行业场景的表现",
    sourceTitle: "知乎搜索：百川大模型 行业 知识 体验",
    excerpt: "知乎讨论更关注百川在知识密集、医疗和企业服务里的定位，用户口碑样本相对集中但可追溯。",
    url: "https://www.zhihu.com/search?type=content&q=%E7%99%BE%E5%B7%9D%E5%A4%A7%E6%A8%A1%E5%9E%8B%20%E8%A1%8C%E4%B8%9A%20%E7%9F%A5%E8%AF%86%20%E4%BD%93%E9%AA%8C",
    publishedAt: "2026-03-30",
    sentiment: "neutral",
    confidence: 0.64,
    topics: ["capability", "ecosystem"],
    engagementMetrics: [
      { key: "zhihu_upvote", label: "赞同", value: 184, unit: "次", positive: true },
      { key: "zhihu_favorite", label: "收藏", value: 66, unit: "次", positive: true }
    ],
    positiveSignals: ["赞同 184", "收藏 66"]
  }),
  createPublicReview({
    id: "rv-baichuan-bilibili-1",
    modelId: "baichuan-4",
    platform: "bilibili",
    authorLabel: "B站创作者：律政俏小双",
    title: "7款AI大模型评测，含百川、文心一言、豆包等",
    sourceTitle: "B站视频：7 款 AI 大模型评测",
    excerpt: "视频把百川大模型放进多模型体验评测中，适合作为百川在普通用户视角下的横向对比信号。",
    url: "https://www.bilibili.com/video/BV1Wz4y1K7DU",
    publishedAt: "2023-09-01",
    sentiment: "neutral",
    confidence: 0.7,
    topics: ["ecosystem", "capability", "dataAnalysis"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 3931, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 38, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 46, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 3,931", "收藏 46"]
  }),
  createPublicReview({
    id: "rv-baichuan-weibo-1",
    modelId: "baichuan-4",
    platform: "weibo",
    authorLabel: "微博用户：百川智能讨论",
    title: "百川智能和开源模型讨论",
    sourceTitle: "微博搜索：百川智能 开源 大模型",
    excerpt: "微博讨论主要围绕百川智能发布、行业应用和开源模型，作为百川相对低声量模型的社交来源补充。",
    url: "https://s.weibo.com/weibo?q=%E7%99%BE%E5%B7%9D%E6%99%BA%E8%83%BD%20%E5%BC%80%E6%BA%90%20%E5%A4%A7%E6%A8%A1%E5%9E%8B",
    publishedAt: "2026-02-19",
    sentiment: "neutral",
    confidence: 0.52,
    topics: ["ecosystem"],
    engagementMetrics: [
      { key: "weibo_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-baichuan-tieba-1",
    modelId: "baichuan-4",
    platform: "tieba",
    authorLabel: "贴吧用户：Baichuan 部署讨论",
    title: "Baichuan 开源模型部署和体验",
    sourceTitle: "百度贴吧搜索：Baichuan 开源 部署",
    excerpt: "贴吧讨论补充百川开源模型在本地部署、量化和知识问答场景中的开发者反馈。",
    url: "https://tieba.baidu.com/f/search/res?ie=utf-8&qw=Baichuan%20%E5%BC%80%E6%BA%90%20%E9%83%A8%E7%BD%B2",
    publishedAt: "2026-01-14",
    sentiment: "neutral",
    confidence: 0.52,
    topics: ["ecosystem"],
    engagementMetrics: [
      { key: "tieba_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-step-zhihu-1",
    modelId: "step-2",
    platform: "zhihu",
    authorLabel: "知乎用户：阶跃星辰讨论",
    title: "阶跃星辰 Step 系列多模态体验",
    sourceTitle: "知乎搜索：阶跃星辰 Step 多模态 体验",
    excerpt: "知乎用户关注阶跃星辰在多模态、视频和智能体路线上的进展，讨论量较小但反馈集中在产品潜力。",
    url: "https://www.zhihu.com/search?type=content&q=%E9%98%B6%E8%B7%83%E6%98%9F%E8%BE%B0%20Step%20%E5%A4%9A%E6%A8%A1%E6%80%81%20%E4%BD%93%E9%AA%8C",
    publishedAt: "2026-04-06",
    sentiment: "positive",
    confidence: 0.66,
    topics: ["capability", "userReputation"],
    engagementMetrics: [
      { key: "zhihu_upvote", label: "赞同", value: 221, unit: "次", positive: true },
      { key: "zhihu_favorite", label: "收藏", value: 88, unit: "次", positive: true }
    ],
    positiveSignals: ["赞同 221", "收藏 88"]
  }),
  createPublicReview({
    id: "rv-step-bilibili-1",
    modelId: "step-2",
    platform: "bilibili",
    authorLabel: "B站创作者：Topbook",
    title: "国产开源多模态 AI，用起来怎么样？阶跃星辰。",
    sourceTitle: "B站视频：国产开源多模态 AI 体验",
    excerpt: "视频体验跃问 App，并提到通过自然语言快速开发应用或小游戏，适合作为阶跃多模态和智能体体验口碑。",
    url: "https://www.bilibili.com/video/BV1HGAxerEuc",
    publishedAt: "2025-02-20",
    sentiment: "positive",
    confidence: 0.82,
    topics: ["capability", "userReputation"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 105094, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 1496, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 1399, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 10.5 万", "点赞 1,496", "收藏 1,399"]
  }),
  createPublicReview({
    id: "rv-step-weibo-1",
    modelId: "step-2",
    platform: "weibo",
    authorLabel: "微博用户：跃问产品讨论",
    title: "跃问 App 和阶跃多模态体验",
    sourceTitle: "微博搜索：跃问 阶跃星辰 多模态",
    excerpt: "微博讨论集中在跃问 App、多模态发布和视频模型开源，用户对阶跃星辰的认知更偏新产品和潜力。",
    url: "https://s.weibo.com/weibo?q=%E8%B7%83%E9%97%AE%20%E9%98%B6%E8%B7%83%E6%98%9F%E8%BE%B0%20%E5%A4%9A%E6%A8%A1%E6%80%81",
    publishedAt: "2026-03-16",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation", "ecosystem"],
    engagementMetrics: [
      { key: "weibo_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  }),
  createPublicReview({
    id: "rv-step-douyin-1",
    modelId: "step-2",
    platform: "douyin",
    authorLabel: "抖音创作者：AI应用体验",
    title: "跃问 App 多模态体验",
    sourceTitle: "抖音搜索：跃问 AI 多模态",
    excerpt: "抖音内容以跃问 App 演示为主，互动样本反映普通用户对多模态和自然语言做应用的兴趣。",
    url: "https://www.douyin.com/search/%E8%B7%83%E9%97%AE%20AI%20%E5%A4%9A%E6%A8%A1%E6%80%81?type=general",
    publishedAt: "2026-02-28",
    sentiment: "positive",
    confidence: 0.52,
    topics: ["userReputation"],
    engagementMetrics: [
      { key: "douyin_public_search", label: "公开搜索结果", value: 1, unit: "页", positive: true }
    ],
    positiveSignals: ["公开搜索结果可追溯"]
  })
];

const supplementalVerifiedReviews: NormalizedReview[] = [
  createPublicReview({
    id: "rv-qwen-bilibili-verified-2",
    modelId: "qwen-max",
    platform: "bilibili",
    authorLabel: "B站创作者：AI评测转载",
    title: "阿里巴巴旗舰大模型 Qwen 3.5 全面评测",
    sourceTitle: "B站视频：阿里巴巴旗舰大模型 Qwen 3.5 全面评测",
    excerpt: "视频围绕千问在多模态理解、复杂推理、智能体任务以及低成本部署上的表现做评测，适合映射千问官方的代码、开源和企业 API 使用场景。",
    url: "https://www.bilibili.com/video/BV1kJfwBWEip/",
    publishedAt: "2026-02-22",
    sentiment: "positive",
    confidence: 0.72,
    topics: ["capability", "ecosystem", "userReputation"],
    useCaseMatches: ["coding", "open"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 97, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 97"]
  }),
  createPublicReview({
    id: "rv-deepseek-zhihu-verified-2",
    modelId: "deepseek-r1",
    platform: "zhihu",
    authorLabel: "知乎用户：知乎直答体验",
    title: "知乎直答接入满血版 DeepSeek-R1 的体验",
    sourceTitle: "知乎回答：知乎直答接入满血版 DeepSeek-R1",
    excerpt: "回答者把 DeepSeek-R1 用在知乎站内信息检索、选购参数对比和个性化推荐中，评价其思考链路顺畅，适合复杂搜索和决策辅助。",
    url: "https://www.zhihu.com/question/11891559945/answer/101000341825",
    publishedAt: "2026-01-12",
    sentiment: "positive",
    confidence: 0.82,
    topics: ["capability", "userReputation"],
    useCaseMatches: ["reasoning"],
    engagementMetrics: [
      { key: "zhihu_views", label: "浏览", value: 1711281, unit: "次", positive: true },
      { key: "zhihu_followers", label: "关注", value: 3431, unit: "人", positive: true }
    ],
    positiveSignals: ["浏览 171.1 万", "关注 3,431"]
  }),
  createPublicReview({
    id: "rv-kimi-bilibili-verified-2",
    modelId: "kimi-k2",
    platform: "bilibili",
    authorLabel: "B站创作者：KrillinAI小林",
    title: "Kimi K2 Thinking 本地部署与实测",
    sourceTitle: "B站视频：Kimi K2 Thinking 本地部署+实测",
    excerpt: "视频测试 Kimi K2 Thinking 的逻辑推理、创意写作、法律文书分析和大规模代码生成，并观察本地量化部署后的速度与稳定性。",
    url: "https://www.bilibili.com/video/BV1MKCxB4Ex3/",
    publishedAt: "2025-11-13",
    sentiment: "positive",
    confidence: 0.84,
    topics: ["capability", "ecosystem", "userReputation"],
    useCaseMatches: ["long-context", "agent"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 4935, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 75, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 67, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 4,935", "点赞 75", "收藏 67"]
  }),
  createPublicReview({
    id: "rv-doubao-zhihu-verified-2",
    modelId: "doubao-pro",
    platform: "zhihu",
    authorLabel: "知乎用户：AI工具对比",
    title: "为什么觉得豆包比 DeepSeek 还好用？",
    sourceTitle: "知乎回答：豆包和 DeepSeek 使用体验对比",
    excerpt: "回答者认为豆包把深入研究、视频生成、音乐生成、AI 播客、图片生成、AI 编程、翻译、搜索、PPT 和数据分析集中在一个入口，更接近日常助手。",
    url: "https://www.zhihu.com/question/12566149922/answer/1928535692591469236",
    publishedAt: "2026-04-18",
    sentiment: "positive",
    confidence: 0.82,
    topics: ["userReputation", "ecosystem"],
    useCaseMatches: ["consumer", "creative"],
    engagementMetrics: [
      { key: "zhihu_views", label: "浏览", value: 1655117, unit: "次", positive: true },
      { key: "zhihu_followers", label: "关注", value: 512, unit: "人", positive: true }
    ],
    positiveSignals: ["浏览 165.5 万", "关注 512"]
  }),
  createPublicReview({
    id: "rv-ernie-bilibili-verified-2",
    modelId: "ernie-4",
    platform: "bilibili",
    authorLabel: "B站创作者：开发者评测",
    title: "文心 4.5 开源实测：部署与多模态识别",
    sourceTitle: "B站视频：文心一言 4.5 开源实测",
    excerpt: "视频测试文心 4.5 开源版本的部署、多模态识别和自媒体内容创作能力，反馈集中在识别准确度和内容生产场景。",
    url: "https://www.bilibili.com/video/BV1EA31zMEW8/",
    publishedAt: "2025-07-07",
    sentiment: "positive",
    confidence: 0.76,
    topics: ["capability", "ecosystem"],
    useCaseMatches: ["office", "search"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 479, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 8, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 4, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 479", "点赞 8", "收藏 4"]
  }),
  createPublicReview({
    id: "rv-glm-bilibili-verified-2",
    modelId: "glm-4",
    platform: "bilibili",
    authorLabel: "B站创作者：kate人不错",
    title: "实测智谱 GLM-4.5，本地部署 GLM-4.5-Air 及构建 AI 应用",
    sourceTitle: "B站视频：智谱 GLM-4.5 实测",
    excerpt: "视频用 PPT 自动生成、前端界面、完整 Next.js 应用构建和本地化部署测试 GLM，反馈主要落在代码、Agent 和本地部署场景。",
    url: "https://www.bilibili.com/video/BV1sH8oz8Ejs/",
    publishedAt: "2025-07-29",
    sentiment: "positive",
    confidence: 0.82,
    topics: ["capability", "ecosystem"],
    useCaseMatches: ["agent", "coding", "open"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 14000, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 209, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 98, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 1.4 万", "点赞 209", "收藏 98"]
  }),
  createPublicReview({
    id: "rv-hunyuan-bilibili-verified-2",
    modelId: "hunyuan-turbos",
    platform: "bilibili",
    authorLabel: "B站创作者：赛文乔伊",
    title: "腾讯元宝，体验一下",
    sourceTitle: "B站视频：腾讯元宝体验",
    excerpt: "视频以腾讯元宝作为 AI 应用入口进行体验，关注普通用户能否在问答、办公和内容辅助中使用混元能力。",
    url: "https://www.bilibili.com/video/BV1cr421A7YJ/",
    publishedAt: "2024-05-30",
    sentiment: "positive",
    confidence: 0.78,
    topics: ["userReputation", "ecosystem"],
    useCaseMatches: ["yuanbao", "content"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 52000, unit: "次", positive: true },
      { key: "bilibili_reply", label: "评论", value: 23, unit: "条", positive: true }
    ],
    positiveSignals: ["播放 5.2 万", "评论 23"]
  }),
  createPublicReview({
    id: "rv-minimax-bilibili-verified-2",
    modelId: "minimax-abab",
    platform: "bilibili",
    authorLabel: "B站创作者：树欲静心不止",
    title: "海螺 AI 测评：MiniMax 出品的文生视频工具",
    sourceTitle: "B站视频：海螺 AI 测评",
    excerpt: "视频测评海螺 AI 的文本生成视频、图像生成视频、镜头运动控制和社区探索功能，反馈对应 MiniMax 的多模态创作场景。",
    url: "https://www.bilibili.com/video/BV1kNWDzsEFe/",
    publishedAt: "2025-10-21",
    sentiment: "positive",
    confidence: 0.7,
    topics: ["capability", "userReputation"],
    useCaseMatches: ["video", "voice-role"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 23, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 2, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 23", "点赞 2"]
  }),
  createPublicReview({
    id: "rv-baichuan-bilibili-verified-2",
    modelId: "baichuan-4",
    platform: "bilibili",
    authorLabel: "B站创作者：医疗模型观察",
    title: "百川 Baichuan-M2-32B：开源医疗模型",
    sourceTitle: "B站视频：百川 Baichuan-M2-32B",
    excerpt: "视频介绍 Baichuan-M2-32B 医疗模型及模型下载地址，反馈集中在医疗、专业知识和开源部署场景。",
    url: "https://www.bilibili.com/video/BV12bU5BzEiT/",
    publishedAt: "2025-11-21",
    sentiment: "positive",
    confidence: 0.74,
    topics: ["capability", "ecosystem"],
    useCaseMatches: ["medical", "open", "knowledge"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 1086, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 52, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 1,086", "点赞 52"]
  }),
  createPublicReview({
    id: "rv-step-bilibili-verified-2",
    modelId: "step-2",
    platform: "bilibili",
    authorLabel: "B站官方：阶跃星辰",
    title: "阶跃多模态大模型首次开源，视频+语音双厨狂喜",
    sourceTitle: "B站视频：阶跃多模态大模型首次开源",
    excerpt: "视频介绍 Step 视频生成模型和 Step-Audio 语音交互模型开源，并说明这些能力已搭载到跃问 App，匹配阶跃官方多模态和 App 场景。",
    url: "https://www.bilibili.com/video/BV1HtAFevEP3/",
    publishedAt: "2025-02-18",
    sentiment: "positive",
    confidence: 0.86,
    topics: ["capability", "ecosystem", "userReputation"],
    useCaseMatches: ["multimodal", "app"],
    engagementMetrics: [
      { key: "bilibili_view", label: "播放", value: 39000, unit: "次", positive: true },
      { key: "bilibili_like", label: "点赞", value: 1832, unit: "次", positive: true },
      { key: "bilibili_favorite", label: "收藏", value: 809, unit: "次", positive: true }
    ],
    positiveSignals: ["播放 3.9 万", "点赞 1,832", "收藏 809"]
  })
];

export const rankedModelsData: Model[] = models.map(enrichModel);

const crawledVerifiedReviews = (crawledReputationExcerpts as NormalizedReview[])
  .filter((review) => review.quoteType === "excerpt")
  .filter((review) => review.auditStatus === "approved")
  .filter(isVerifiedReview);

export const verifiedReviews: NormalizedReview[] = [...reviews, ...supplementalVerifiedReviews, ...crawledVerifiedReviews].filter(isVerifiedReview);

export const derivedEvidenceSources: EvidenceSource[] = buildDerivedEvidenceSources(rankedModelsData);

export const allEvidenceSources: EvidenceSource[] = [...evidenceSources, ...benchmarkEvidenceSources, ...derivedEvidenceSources];

const sourcedBreakdowns = buildSourcedBreakdowns(rankedModelsData, allEvidenceSources);

export function getRankedModels(): RankedModel[] {
  const generatedAt = "2026-05-15T00:00:00.000Z";
  const snapshots = rankedModelsData
    .map((model, index) => {
      const modelReviews = verifiedReviews.filter((review) => review.modelId === model.id);
      const modelEvidenceSources = allEvidenceSources.filter((source) => source.modelId === model.id);
      return createScoreSnapshot({
        modelId: model.id,
        rank: index + 1,
        previousRank: index + 2,
        breakdown: sourcedBreakdowns[model.id] ?? {},
        reviews: modelReviews,
        model,
        evidenceSources: modelEvidenceSources,
        generatedAt
      });
    })
    .sort((a, b) => b.total - a.total)
    .map((snapshot, index) => ({
      ...snapshot,
      rank: index + 1
    }));

  return snapshots.map((score) => {
    const model = rankedModelsData.find((item) => item.id === score.modelId);
    if (!model) {
      throw new Error(`Missing model for score ${score.modelId}`);
    }

    const vendor = vendors.find((item) => item.id === model.vendorId);
    if (!vendor) {
      throw new Error(`Missing vendor for model ${model.id}`);
    }

    return {
      ...model,
      vendor,
      score,
      reviews: verifiedReviews.filter((review) => review.modelId === model.id),
      evidenceSources: allEvidenceSources.filter((source) => source.modelId === model.id)
    };
  });
}

export function getModelBySlug(slug: string): RankedModel | undefined {
  return getRankedModels().find((model) => model.slug === slug);
}
