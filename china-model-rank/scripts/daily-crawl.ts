import { adapterRegistry } from "@/lib/crawler/adapters";
import { normalizeRawItem } from "@/lib/crawler/normalize";
import type { CrawlTarget } from "@/lib/crawler/types";
import { rankedModelsData } from "@/lib/data";

const targets: CrawlTarget[] = rankedModelsData.slice(0, 3).map((model) => ({
  platform: "media",
  keyword: model.rankName,
  modelId: model.id,
  url: model.vendorId === "deepseek" ? "https://www.deepseek.com" : "https://example.com"
}));

async function main() {
  const normalized = [];

  for (const target of targets) {
    const adapter = adapterRegistry[target.platform];
    if (!adapter) {
      console.warn(`No adapter for ${target.platform}`);
      continue;
    }

    try {
      const items = await adapter.fetchItems(target);
      normalized.push(...items.map(normalizeRawItem));
    } catch (error) {
      console.error(`Crawl failed for ${target.keyword}`, error);
    }
  }

  console.log(JSON.stringify({ count: normalized.length, items: normalized }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
