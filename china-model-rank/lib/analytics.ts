import { createHash } from "crypto";

export type SourceType = "direct" | "organic_search" | "referral" | "campaign" | "internal" | "unknown";

export type TrafficSource = {
  sourceType: SourceType;
  searchEngine: "baidu" | "sogou" | "bing" | "google" | "other" | null;
};

const searchEngines = [
  { key: "baidu" as const, hosts: ["baidu.com", "m.baidu.com"] },
  { key: "sogou" as const, hosts: ["sogou.com", "weixin.sogou.com"] },
  { key: "bing" as const, hosts: ["bing.com", "cn.bing.com"] },
  { key: "google" as const, hosts: ["google.com", "google.com.hk", "google.com.sg"] }
];

export function classifyTrafficSource(input: {
  referrer?: string | null;
  siteUrl?: string;
  utmSource?: string | null;
  utmMedium?: string | null;
}): TrafficSource {
  if (input.utmSource || input.utmMedium) {
    return { sourceType: "campaign", searchEngine: null };
  }

  if (!input.referrer) {
    return { sourceType: "direct", searchEngine: null };
  }

  try {
    const referrer = new URL(input.referrer);
    const siteHost = input.siteUrl ? new URL(input.siteUrl).hostname : null;

    if (siteHost && referrer.hostname === siteHost) {
      return { sourceType: "internal", searchEngine: null };
    }

    const engine = searchEngines.find((item) => item.hosts.some((host) => referrer.hostname.endsWith(host)));
    if (engine) {
      return { sourceType: "organic_search", searchEngine: engine.key };
    }

    return { sourceType: "referral", searchEngine: null };
  } catch {
    return { sourceType: "unknown", searchEngine: null };
  }
}

export function stableHash(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  return createHash("sha256").update(value).digest("hex");
}
