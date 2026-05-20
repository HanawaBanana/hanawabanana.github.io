import { richBilibiliAdapter } from "@/lib/crawler/platforms/rich-bilibili";
import { createRichBrowserAdapter } from "@/lib/crawler/platforms/rich-browser";
import { richHupuAdapter } from "@/lib/crawler/platforms/rich-hupu";
import type { RichPlatformAdapter } from "@/lib/crawler/rich-types";
import type { PlatformKey } from "@/lib/types";

export const richAdapterRegistry: Partial<Record<PlatformKey, RichPlatformAdapter>> = {
  bilibili: richBilibiliAdapter,
  hupu: richHupuAdapter,
  zhihu: createRichBrowserAdapter("zhihu"),
  xiaohongshu: createRichBrowserAdapter("xiaohongshu"),
  weibo: createRichBrowserAdapter("weibo"),
  douyin: createRichBrowserAdapter("douyin"),
  tieba: createRichBrowserAdapter("tieba")
};

export const richReputationPlatforms: PlatformKey[] = [
  "zhihu",
  "xiaohongshu",
  "douyin",
  "weibo",
  "hupu",
  "tieba",
  "bilibili"
];
