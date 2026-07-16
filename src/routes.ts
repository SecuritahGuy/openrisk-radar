export const LEARN_ARTICLE_PATHS = [
  "/learn/weather-alerts",
  "/learn/earthquakes",
  "/learn/wildfires",
  "/learn/floods",
  "/learn/alert-severity",
  "/learn/using-openriskradar",
] as const;

export type RouteKind = "home" | "dashboard" | "learn" | "article" | "data-sources" | "methodology" | "about" | "privacy" | "terms" | "contact" | "not-found";

export function routeKind(pathname: string): RouteKind {
  if (pathname === "/") return "home";
  if (pathname === "/app") return "dashboard";
  if (pathname === "/learn") return "learn";
  if ((LEARN_ARTICLE_PATHS as readonly string[]).includes(pathname)) return "article";
  if (pathname === "/data-sources") return "data-sources";
  if (pathname === "/methodology") return "methodology";
  if (pathname === "/about") return "about";
  if (pathname === "/privacy") return "privacy";
  if (pathname === "/terms") return "terms";
  if (pathname === "/contact") return "contact";
  return "not-found";
}
