import type { MetadataRoute } from "next";
import { absoluteUrl, getSiteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/ops-console", "/admin", "/api/admin"]
      }
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: getSiteUrl()
  };
}
