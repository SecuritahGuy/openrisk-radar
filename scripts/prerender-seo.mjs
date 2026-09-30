import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, "..", "dist");
const siteUrl = (process.env.VITE_SITE_URL || "https://openriskradar.com").replace(/\/$/, "");
const homeDescription = "Explore trusted public hazard feeds in a privacy-conscious dashboard and learn how to interpret weather, earthquake, wildfire, and flood information.";
const pages = [
  {
    path: "/",
    title: "OpenRisk Radar | Live Public Risk and Hazard Alerts",
    description: homeDescription,
    structuredData: [
      { "@context": "https://schema.org", "@type": "WebSite", name: "OpenRisk Radar", url: `${siteUrl}/`, description: "An open-source public risk and hazard situational-awareness website." },
      { "@context": "https://schema.org", "@type": "SoftwareApplication", name: "OpenRisk Radar", applicationCategory: "UtilitiesApplication", operatingSystem: "Web", url: `${siteUrl}/app`, isAccessibleForFree: true },
    ],
  },
  { path: "/app", title: "Live Risk Radar | OpenRisk Radar", description: "Search and explore public weather, earthquake, wildfire, flood, disaster, and environmental signals around a place." },
  { path: "/learn", title: "Learn About Risk | OpenRisk Radar", description: "Understand public alerts, hazard terminology, data sources, and the limitations behind the events displayed in OpenRisk Radar." },
  { path: "/data-sources", title: "Data Sources | OpenRisk Radar", description: "Review the public hazard, weather, environmental, mapping, and geocoding sources used by OpenRisk Radar, including handling and limitations." },
  { path: "/methodology", title: "Methodology | OpenRisk Radar", description: "Learn how OpenRisk Radar retrieves, normalizes, filters, correlates, caches, and displays public risk and hazard records." },
  { path: "/about", title: "About OpenRisk Radar", description: "OpenRisk Radar is an open-source, privacy-conscious project that organizes public hazard feeds for practical situational awareness." },
  { path: "/privacy", title: "Privacy | OpenRisk Radar", description: "Learn how OpenRisk Radar uses browser storage, location permission, public APIs, optional cloud watches, and hosting infrastructure." },
  { path: "/terms", title: "Terms | OpenRisk Radar", description: "Plain-language terms for informational use of OpenRisk Radar and its third-party public data." },
  { path: "/contact", title: "Contact | OpenRisk Radar", description: "Report OpenRisk Radar bugs, data-source issues, accessibility problems, or responsible security concerns through the appropriate channel." },
  { path: "/404", title: "Page Not Found | OpenRisk Radar", description: "The requested OpenRisk Radar page could not be found.", noIndex: true },
  { path: "/learn/weather-alerts", title: "How to Read Weather Alerts | OpenRisk Radar", description: "Understand watches, warnings, advisories, timing, geographic scope, and the alert fields that help put a weather hazard in context.", type: "article", reviewedAt: "2026-07-16" },
  { path: "/learn/earthquakes", title: "Earthquake Magnitude and Intensity | OpenRisk Radar", description: "Learn why magnitude, shaking intensity, depth, distance, and revisions all matter when interpreting an earthquake report.", type: "article", reviewedAt: "2026-07-16" },
  { path: "/learn/wildfires", title: "Understanding Wildfire Information | OpenRisk Radar", description: "Distinguish active-fire detections, incident points, perimeters, smoke information, weather warnings, and evacuation notices.", type: "article", reviewedAt: "2026-07-16" },
  { path: "/learn/air-quality", title: "How to Read Air Quality and AQI | OpenRisk Radar", description: "Understand AQI categories, pollutant readings, model estimates, and what an air-quality signal can—and cannot—tell you about conditions where you are.", type: "article", reviewedAt: "2026-09-30" },
  { path: "/learn/tsunami-alerts-readiness", title: "Tsunami Alerts: What They Mean and How to Prepare | OpenRisk Radar", description: "Learn what tsunami warnings, advisories, watches, and information statements mean, how natural warning signs matter, and where to find local evacuation guidance.", type: "article", reviewedAt: "2026-09-30" },
  { path: "/learn/floods", title: "Understanding Flood Alerts | OpenRisk Radar", description: "Learn the differences among flood watches, warnings, flash floods, river flooding, coastal flooding, and rainfall estimates.", type: "article", reviewedAt: "2026-07-16" },
  { path: "/learn/alert-severity", title: "How to Interpret Alert Severity | OpenRisk Radar", description: "Use severity alongside certainty, urgency, scope, recency, source authority, and your location.", type: "article", reviewedAt: "2026-07-16" },
  { path: "/learn/using-openriskradar", title: "Using OpenRisk Radar | OpenRisk Radar", description: "A practical guide to searching, filtering, reading event details, saving locations, refreshing feeds, and understanding limitations.", type: "article", reviewedAt: "2026-07-16" },
];

function escapeAttribute(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function setAttribute(html, pattern, attribute, value) {
  const escaped = escapeAttribute(value);
  return html.replace(pattern, (tag) => tag.replace(new RegExp(`${attribute}="[^"]*"`), `${attribute}="${escaped}"`));
}

const template = await readFile(join(dist, "index.html"), "utf8");
for (const page of pages) {
  const url = `${siteUrl}${page.path === "/" ? "/" : page.path}`;
  let html = template.replace(/<title>[^<]*<\/title>/, `<title>${escapeAttribute(page.title)}</title>`);
  html = setAttribute(html, /<meta name="description"[^>]*\/>/, "content", page.description);
  html = setAttribute(html, /<meta name="robots"[^>]*\/>/, "content", page.noIndex ? "noindex,follow" : "index,follow");
  html = setAttribute(html, /<meta property="og:title"[^>]*\/>/, "content", page.title);
  html = setAttribute(html, /<meta property="og:description"[^>]*\/>/, "content", page.description);
  html = setAttribute(html, /<meta property="og:url"[^>]*\/>/, "content", url);
  html = setAttribute(html, /<meta property="og:type"[^>]*\/>/, "content", page.type || "website");
  html = setAttribute(html, /<meta name="twitter:title"[^>]*\/>/, "content", page.title);
  html = setAttribute(html, /<meta name="twitter:description"[^>]*\/>/, "content", page.description);
  html = html.replace(/<link rel="canonical" href="[^"]*"\s*\/>/, `<link rel="canonical" href="${escapeAttribute(url)}" />`);
  const structuredData = page.type === "article"
    ? [
      { "@context": "https://schema.org", "@type": "Article", headline: page.title.replace(/ \| OpenRisk Radar$/, ""), description: page.description, dateModified: page.reviewedAt, author: { "@type": "Organization", name: "OpenRisk Radar Editorial" }, publisher: { "@type": "Organization", name: "OpenRisk Radar" }, mainEntityOfPage: url },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Home", item: `${siteUrl}/` }, { "@type": "ListItem", position: 2, name: "Learn", item: `${siteUrl}/learn` }, { "@type": "ListItem", position: 3, name: page.title.replace(/ \| OpenRisk Radar$/, ""), item: url }] },
    ]
    : page.structuredData;
  if (structuredData) {
    const safeJson = JSON.stringify(structuredData).replaceAll("<", "\\u003c");
    html = html.replace("</head>", `<script id="route-structured-data" type="application/ld+json">${safeJson}</script></head>`);
  }
  const outputPath = page.path === "/" ? join(dist, "index.html") : join(dist, page.path.slice(1), "index.html");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, html);
}

console.log(`Generated initial SEO metadata for ${pages.length} routes.`);
