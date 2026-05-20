export const siteName = "中国大模型排行榜";

export const defaultSiteUrl = "https://page.far-domain.top/china-model-rank";

function stripTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function stripSlashes(value: string) {
  return value.replace(/^\/+|\/+$/g, "");
}

export function getBasePath() {
  const explicit = process.env.NEXT_PUBLIC_BASE_PATH;
  if (typeof explicit === "string") {
    const normalized = stripSlashes(explicit);
    return normalized ? `/${normalized}` : "";
  }

  const repository = process.env.GITHUB_REPOSITORY?.split("/")[1];
  return repository ? `/${repository}` : "";
}

export function getSiteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return stripTrailingSlash(configured);
  }

  return defaultSiteUrl;
}

export function absoluteUrl(path = "/") {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath === "/" ? "" : normalizedPath}`;
}

export function assetPath(path: string) {
  const basePath = getBasePath();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${basePath}${normalizedPath}`;
}
