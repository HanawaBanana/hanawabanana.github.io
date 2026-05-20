import type { Model, PlatformKey, Vendor } from "@/lib/types";
import type { CrawlTarget } from "@/lib/crawler/types";

const scenarioTerms = [
  "好用",
  "评测",
  "对比",
  "价格",
  "代码",
  "写作",
  "推理",
  "体验",
  "开源",
  "部署",
  "使用感受",
  "实际使用",
  "解决问题",
  "真实体验",
  "用下来",
  "踩坑",
  "好不好用"
];

const platformSearchUrl: Record<PlatformKey, (keyword: string) => string> = {
  zhihu: (keyword) => `https://www.zhihu.com/search?q=${encodeURIComponent(keyword)}`,
  bilibili: (keyword) => `https://search.bilibili.com/all?keyword=${encodeURIComponent(keyword)}`,
  weibo: (keyword) => `https://s.weibo.com/weibo?q=${encodeURIComponent(keyword)}`,
  xiaohongshu: (keyword) => `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(keyword)}`,
  douyin: (keyword) => `https://www.douyin.com/search/${encodeURIComponent(keyword)}?type=general`,
  hupu: (keyword) => `https://bbs.hupu.com/search?q=${encodeURIComponent(keyword)}`,
  tieba: (keyword) => `https://tieba.baidu.com/f/search/res?ie=utf-8&qw=${encodeURIComponent(keyword)}`,
  wechat: (keyword) => `https://weixin.sogou.com/weixin?query=${encodeURIComponent(keyword)}`,
  media: (keyword) => `https://www.baidu.com/s?wd=${encodeURIComponent(keyword)}`
};

export function buildModelKeywords(model: Model, vendor?: Vendor): string[] {
  const base = new Set<string>();
  base.add(model.rankName ?? model.name);
  base.add(model.detailName ?? model.name);
  base.add(model.family);
  model.aliases.forEach((alias) => base.add(alias));
  if (vendor) {
    base.add(`${vendor.shortName} ${model.family}`);
    base.add(`${vendor.name} ${model.family}`);
    base.add(`${vendor.shortName} 大模型`);
  }

  const keywords = new Set<string>();
  [...base]
    .map((keyword) => keyword.trim())
    .filter(Boolean)
    .forEach((keyword) => {
      keywords.add(keyword);
      scenarioTerms.forEach((term) => keywords.add(`${keyword} ${term}`));
    });
  model.officialUseCases?.forEach((useCase) => {
    keywords.add(`${model.rankName ?? model.name} ${useCase.label} 体验`);
    useCase.keywords.slice(0, 4).forEach((keyword) => keywords.add(`${model.rankName ?? model.name} ${keyword} 用户评价`));
  });

  return [...keywords].slice(0, 36);
}

export function buildCrawlTargets(input: {
  models: Model[];
  vendors: Vendor[];
  platforms?: PlatformKey[];
}): CrawlTarget[] {
  const platforms = input.platforms ?? ["zhihu", "xiaohongshu", "weibo", "douyin", "hupu", "tieba", "bilibili"];

  return input.models.flatMap((model) => {
    const vendor = input.vendors.find((item) => item.id === model.vendorId);
    const keywords = buildModelKeywords(model, vendor);

    return platforms.flatMap((platform) =>
      keywords.map((keyword) => ({
        platform,
        keyword,
        modelId: model.id,
        modelName: model.rankName ?? model.name,
        aliases: model.aliases,
        url: platformSearchUrl[platform](keyword)
      }))
    );
  });
}

export function getSearchUrl(platform: PlatformKey, keyword: string) {
  return platformSearchUrl[platform](keyword);
}
