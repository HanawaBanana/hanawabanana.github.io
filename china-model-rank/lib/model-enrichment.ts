import type { BaseModel, Model, OfficialUseCase, ProductVariant } from "@/lib/types";

type ModelMeta = {
  rankName: string;
  detailName: string;
  officialUseCases: OfficialUseCase[];
};

function makeUseCase(id: string, label: string, description: string, keywords: string[], weight: number, sourceUrl: string): OfficialUseCase {
  return { id, label, description, keywords, weight, sourceUrl };
}

const metaById: Record<string, ModelMeta> = {
  "qwen-max": {
    rankName: "千问",
    detailName: "通义千问",
    officialUseCases: [
      makeUseCase("coding", "代码与开发", "官方文档和开源生态覆盖代码、Agent 与工具调用。", ["代码", "编程", "开发", "agent", "工具调用", "部署"], 0.35, "https://github.com/QwenLM/Qwen3"),
      makeUseCase("writing", "中文写作与办公", "通义千问网页和 App 面向写作、总结、办公问答。", ["写作", "办公", "总结", "润色", "中文"], 0.3, "https://tongyi.aliyun.com"),
      makeUseCase("open", "开源本地部署", "Qwen 系列开源权重覆盖本地部署和二次开发。", ["开源", "本地", "权重", "部署", "显存"], 0.35, "https://huggingface.co/Qwen")
    ]
  },
  "deepseek-r1": {
    rankName: "DeepSeek",
    detailName: "DeepSeek",
    officialUseCases: [
      makeUseCase("reasoning", "复杂推理", "DeepSeek R1 定位推理模型，适合数学、代码和复杂问答。", ["推理", "数学", "复杂", "思考", "r1"], 0.45, "https://www.deepseek.com"),
      makeUseCase("coding", "代码辅助", "DeepSeek 系列常用于代码生成、解释和调试。", ["代码", "编程", "开发", "调试"], 0.25, "https://api-docs.deepseek.com"),
      makeUseCase("open-cost", "开源与低成本", "官方开放权重并提供高性价比 API。", ["开源", "便宜", "成本", "价格", "api"], 0.3, "https://github.com/deepseek-ai/DeepSeek-R1")
    ]
  },
  "kimi-k2": {
    rankName: "Kimi",
    detailName: "Kimi",
    officialUseCases: [
      makeUseCase("long-context", "长文档处理", "Kimi 用户心智集中在长文本、资料阅读和总结。", ["长文本", "长文档", "论文", "资料", "阅读", "总结"], 0.45, "https://kimi.moonshot.cn"),
      makeUseCase("search-writing", "搜索与写作", "Kimi 面向搜索增强问答、写作和资料整理。", ["搜索", "写作", "整理", "问答", "资料"], 0.35, "https://kimi.moonshot.cn"),
      makeUseCase("agent", "Agent 与编程", "Kimi K2 开源模型面向 Agentic Coding。", ["agent", "编程", "代码", "工具"], 0.2, "https://github.com/MoonshotAI/Kimi-K2")
    ]
  },
  "doubao-pro": {
    rankName: "豆包",
    detailName: "豆包",
    officialUseCases: [
      makeUseCase("consumer", "日常助手", "豆包 App 面向普通用户问答、写作和陪伴式助手。", ["日常", "助手", "问答", "普通人", "上手"], 0.3, "https://www.doubao.com"),
      makeUseCase("creative", "内容创作", "豆包在文案、图片、多模态创作入口上覆盖广。", ["文案", "创作", "修图", "图片", "视频", "多模态"], 0.4, "https://www.doubao.com"),
      makeUseCase("api", "企业 API 接入", "火山引擎提供豆包模型 API。", ["api", "接入", "开发", "火山", "成本"], 0.3, "https://www.volcengine.com/docs/82379/1544106")
    ]
  },
  "ernie-4": {
    rankName: "文心",
    detailName: "文心一言",
    officialUseCases: [
      makeUseCase("search", "搜索问答", "文心与百度搜索、知识问答入口结合紧密。", ["搜索", "问答", "知识", "百度"], 0.35, "https://yiyan.baidu.com"),
      makeUseCase("office", "办公与文档", "文心面向办公、总结、写作和企业知识服务。", ["办公", "文档", "总结", "写作", "企业"], 0.4, "https://yiyan.baidu.com"),
      makeUseCase("api", "千帆 API", "百度智能云千帆提供企业 API 接入。", ["api", "千帆", "接入", "稳定"], 0.25, "https://cloud.baidu.com/product/wenxinworkshop")
    ]
  },
  "glm-4": {
    rankName: "智谱",
    detailName: "智谱清言",
    officialUseCases: [
      makeUseCase("agent", "智能体与工具调用", "GLM 系列覆盖智能体、工具调用和应用开发。", ["智能体", "agent", "工具", "调用"], 0.4, "https://chatglm.cn"),
      makeUseCase("coding", "代码与开发", "GLM 系列常用于代码、API 和开发者场景。", ["代码", "编程", "开发", "api"], 0.3, "https://docs.bigmodel.cn"),
      makeUseCase("open", "开源生态", "THUDM/GLM 开源生态支持本地部署与研究。", ["开源", "本地", "部署", "glm"], 0.3, "https://github.com/THUDM/GLM-4")
    ]
  },
  "hunyuan-turbos": {
    rankName: "混元",
    detailName: "腾讯混元",
    officialUseCases: [
      makeUseCase("yuanbao", "腾讯元宝助手", "腾讯元宝承载普通用户问答、办公和内容入口。", ["元宝", "助手", "办公", "问答"], 0.35, "https://yuanbao.tencent.com"),
      makeUseCase("cloud", "腾讯云 API", "混元面向企业云 API 和产业接入。", ["腾讯云", "api", "企业", "接入", "稳定"], 0.4, "https://cloud.tencent.com/product/hunyuan"),
      makeUseCase("content", "内容与协作", "腾讯生态覆盖内容生成、协作和产品集成。", ["内容", "协作", "总结", "写作"], 0.25, "https://hunyuan.tencent.com")
    ]
  },
  "minimax-abab": {
    rankName: "MiniMax",
    detailName: "MiniMax",
    officialUseCases: [
      makeUseCase("voice-role", "语音与角色", "MiniMax 覆盖语音、角色互动和陪伴式应用。", ["语音", "角色", "配音", "对话"], 0.35, "https://www.minimaxi.com"),
      makeUseCase("video", "多模态创作", "海螺/ MiniMax 面向视频、图像和创作工具。", ["视频", "图像", "创作", "海螺"], 0.35, "https://www.minimaxi.com"),
      makeUseCase("open-api", "开源与 API", "MiniMax-M2.5 开源并提供 API 调用。", ["开源", "api", "token", "接入"], 0.3, "https://huggingface.co/MiniMaxAI/MiniMax-M2.5")
    ]
  },
  "baichuan-4": {
    rankName: "百川",
    detailName: "百川智能",
    officialUseCases: [
      makeUseCase("knowledge", "知识密集任务", "百川定位知识、行业和企业服务。", ["知识", "行业", "企业", "问答"], 0.4, "https://www.baichuan-ai.com"),
      makeUseCase("medical", "医疗与专业场景", "百川长期强调医疗和专业领域能力。", ["医疗", "专业", "行业"], 0.25, "https://www.baichuan-ai.com"),
      makeUseCase("open", "开源与部署", "Baichuan 开源模型用于本地部署和研究。", ["开源", "部署", "本地", "量化"], 0.35, "https://github.com/baichuan-inc")
    ]
  },
  "step-2": {
    rankName: "阶跃",
    detailName: "阶跃星辰",
    officialUseCases: [
      makeUseCase("multimodal", "多模态", "阶跃星辰主打多模态和视频相关模型能力。", ["多模态", "视频", "图像", "语音"], 0.45, "https://www.stepfun.com"),
      makeUseCase("app", "跃问 App", "跃问承载普通用户问答和自然语言应用体验。", ["跃问", "app", "问答", "应用"], 0.3, "https://yuewen.cn"),
      makeUseCase("agent", "智能体与复杂任务", "Step 系列关注复杂任务和智能体基础能力。", ["智能体", "agent", "复杂", "推理"], 0.25, "https://platform.stepfun.com/docs/zh/guides/models/text")
    ]
  }
};

export function enrichModel(model: BaseModel): Model {
  const meta = metaById[model.id];
  if (!meta) {
    return {
      ...model,
      rankName: model.name,
      detailName: model.name,
      productVariants: [],
      officialUseCases: []
    };
  }

  const productVariants: ProductVariant[] = [
    ...(model.freeAccessInfo.web?.length
      ? [{
          type: "software_app" as const,
          name: `${meta.rankName} App/网页`,
          description: model.freeAccessInfo.display,
          links: model.freeAccessInfo.web
        }]
      : []),
    {
      type: "api_model",
      name: model.pricing.api.model,
      description: model.pricing.display,
      links: [{ label: "价格来源", url: model.pricing.api.sourceUrl, note: model.pricing.api.retrievedAt }],
      pricing: model.pricing
    },
    ...(model.freeAccessInfo.openSourceModels?.length
      ? [{
          type: "open_source_model" as const,
          name: `${meta.rankName} 开源模型`,
          description: "可按链接查看开源权重、代码或模型说明。",
          links: model.freeAccessInfo.openSourceModels
        }]
      : [])
  ];

  return {
    ...model,
    rankName: meta.rankName,
    detailName: meta.detailName,
    productVariants,
    officialUseCases: meta.officialUseCases
  };
}
