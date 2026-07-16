import { useEffect } from "react";

const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://openriskradar.com").replace(/\/$/, "");

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function Seo({ path, title, description, noIndex = false, type = "website", structuredData }: {
  path: string;
  title: string;
  description: string;
  noIndex?: boolean;
  type?: "website" | "article";
  structuredData?: Record<string, unknown> | Record<string, unknown>[];
}) {
  useEffect(() => {
    const canonical = `${SITE_URL}${path === "/" ? "/" : path}`;
    document.title = title;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[name="robots"]', "name", "robots", noIndex ? "noindex,follow" : "index,follow");
    setMeta('meta[property="og:title"]', "property", "og:title", title);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonical);
    setMeta('meta[property="og:type"]', "property", "og:type", type);
    setMeta('meta[property="og:image"]', "property", "og:image", `${SITE_URL}/og-image.png`);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", `${SITE_URL}/og-image.png`);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement("link");
      link.rel = "canonical";
      document.head.appendChild(link);
    }
    link.href = canonical;
    document.getElementById("route-structured-data")?.remove();
    if (structuredData) {
      const script = document.createElement("script");
      script.id = "route-structured-data";
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
  }, [description, noIndex, path, structuredData, title, type]);
  return null;
}
