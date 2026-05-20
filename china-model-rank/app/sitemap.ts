import type { MetadataRoute } from "next";
import { getRankedModels } from "@/lib/data";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1
    },
    {
      url: absoluteUrl("/compare"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8
    },
    {
      url: absoluteUrl("/methodology"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7
    },
    ...getRankedModels().map((model) => ({
      url: absoluteUrl(`/models/${model.slug}`),
      lastModified: new Date(model.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.85
    }))
  ];
}
