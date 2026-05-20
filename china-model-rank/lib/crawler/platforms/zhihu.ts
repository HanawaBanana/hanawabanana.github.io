import type { CrawlTarget, SourceAdapter } from "@/lib/crawler/types";
import { fetchThirdPartyApi } from "@/lib/crawler/platforms/shared";

export const zhihuAdapter: SourceAdapter = {
  platform: "zhihu",
  async fetchItems(target: CrawlTarget) {
    return (
      (await fetchThirdPartyApi({
        endpoint: process.env.CRAWLER_DATA_API_ENDPOINT,
        apiKey: process.env.CRAWLER_DATA_API_KEY,
        platform: "zhihu",
        target
      })) ?? []
    );
  }
};
