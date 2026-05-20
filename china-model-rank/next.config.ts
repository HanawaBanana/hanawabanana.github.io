import type { NextConfig } from "next";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH
  ? `/${process.env.NEXT_PUBLIC_BASE_PATH.replace(/^\/+|\/+$/g, "")}`
  : "";

const nextConfig: NextConfig = {
  output: "export",
  outputFileTracingRoot: __dirname,
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  ...(basePath ? { basePath, assetPrefix: basePath } : {})
};

export default nextConfig;
