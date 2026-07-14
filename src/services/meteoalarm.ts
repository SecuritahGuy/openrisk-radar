import { newEventId } from "../lib/ids";
import type { RiskEvent, Severity } from "../types/riskEvent";
import type { ResolvedLocation } from "../types/location";

const FEED_PROXY = "/api/meteoalarm/alerts";

const COUNTRY_SLUGS: Record<string, string> = {
  "Austria": "austria",
  "Belgium": "belgium",
  "Bulgaria": "bulgaria",
  "Croatia": "croatia",
  "Cyprus": "cyprus",
  "Czech Republic": "czechia",
  "Czechia": "czechia",
  "Denmark": "denmark",
  "Estonia": "estonia",
  "Finland": "finland",
  "France": "france",
  "Germany": "germany",
  "Greece": "greece",
  "Hungary": "hungary",
  "Iceland": "iceland",
  "Ireland": "ireland",
  "Italy": "italy",
  "Latvia": "latvia",
  "Lithuania": "lithuania",
  "Luxembourg": "luxembourg",
  "Malta": "malta",
  "Netherlands": "netherlands",
  "Norway": "norway",
  "Poland": "poland",
  "Portugal": "portugal",
  "Romania": "romania",
  "Serbia": "serbia",
  "Slovakia": "slovakia",
  "Slovenia": "slovenia",
  "Spain": "spain",
  "Sweden": "sweden",
  "Switzerland": "switzerland",
  "United Kingdom": "united-kingdom",
  "United Kingdom of Great Britain and Northern Ireland": "united-kingdom",
  "Bosnia and Herzegovina": "bosnia-herzegovina",
  "Moldova": "moldova",
  "Montenegro": "montenegro",
  "North Macedonia": "republic-of-north-macedonia",
  "Ukraine": "ukraine",
};

function isoDate(value: string | null, fallback: string | null = null): string | null {
  const date = value ? new Date(value) : null;
  if (date && Number.isFinite(date.getTime())) return date.toISOString();
  return fallback;
}

function normalizedWords(value: string): string[] {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(county|parish|borough|city|kreis|stadt|region|province)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => word.length >= 4);
}

export function alertMatchesLocation(areaDescription: string, location: ResolvedLocation): boolean {
  const areaWords = new Set(normalizedWords(areaDescription));
  const locationWords = [location.city, location.county ?? "", location.state]
    .flatMap(normalizedWords);
  return locationWords.some((word) => areaWords.has(word));
}

export function supportsMeteoalarm(location: ResolvedLocation | null): boolean {
  return !!location && COUNTRY_SLUGS[location.country] != null;
}

function capSeverityToSeverity(sev: string | null): Severity {
  switch (sev?.toLowerCase()) {
    case "extreme": return "Extreme";
    case "severe": return "Severe";
    case "moderate": return "Moderate";
    default: return "Minor";
  }
}

function mapEventType(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("thunderstorm") || t.includes("storm")) return "Severe Thunderstorm";
  if (t.includes("rain") || t.includes("flood") || t.includes("precipitation")) return "Heavy Rain";
  if (t.includes("snow") || t.includes("ice") || t.includes("blizzard")) return "Snow/Ice";
  if (t.includes("wind") || t.includes("storm surge")) return "Wind";
  if (t.includes("heat") || t.includes("temperature") || t.includes("warm")) return "Extreme Heat";
  if (t.includes("cold") || t.includes("frost") || t.includes("freeze")) return "Extreme Cold";
  if (t.includes("fire") || t.includes("wildfire")) return "Wildfire";
  if (t.includes("fog")) return "Fog";
  if (t.includes("avalanche")) return "Avalanche";
  if (t.includes("coastal")) return "Coastal Event";
  return type || "Weather Alert";
}

const CAP_NS = "urn:oasis:names:tc:emergency:cap:1.2";

function parseEntry(entry: Element, location: ResolvedLocation, nowMs = Date.now()): RiskEvent | null {
  const getCap = (tag: string): string | null => {
    const el = entry.getElementsByTagNameNS(CAP_NS, tag)[0];
    return el?.textContent?.trim() ?? null;
  };

  const identifier = getCap("identifier");
  if (!identifier) return null;

  const eventType = getCap("event") || "Weather Alert";
  const severity = capSeverityToSeverity(getCap("severity"));
  const certainty = getCap("certainty") || "Unknown";
  const areaDesc = getCap("areaDesc") || "";
  const sent = getCap("sent");
  const expires = getCap("expires");
  const effective = getCap("effective");
  const urgency = getCap("urgency") || "Unknown";
  const messageType = getCap("message_type") || "Alert";
  const status = getCap("status") || "Actual";

  if (messageType.toLowerCase() === "cancel") return null;
  if (status.toLowerCase() !== "actual") return null;
  if (!alertMatchesLocation(areaDesc, location)) return null;

  const titleEl = entry.querySelector("title");
  const title = titleEl?.textContent?.trim() ?? `${eventType} — ${areaDesc}`;

  const linkEl = entry.querySelector("link[hreflang='en']") || entry.querySelector("link[title]") || entry.querySelector("link[rel='alternate']");
  const linkHref = linkEl?.getAttribute("href") ?? "https://meteoalarm.org";

  const fallbackNow = new Date(nowMs).toISOString();
  const startedAt = isoDate(effective ?? sent, fallbackNow) ?? fallbackNow;
  const expiresAt = isoDate(expires);
  if (expiresAt && new Date(expiresAt).getTime() <= nowMs) return null;

  return {
    id: newEventId(),
    source: "METEOALARM",
    sourceEventId: identifier,
    type: mapEventType(eventType),
    category: "Weather",
    severity,
    headline: title,
    description: `${eventType} — ${areaDesc}. Certainty: ${certainty}. Urgency: ${urgency}.`,
    geometryType: "None",
    latitude: null,
    longitude: null,
    polygon: null,
    startedAt,
    expiresAt,
    updatedAt: startedAt,
    url: linkHref,
    confidence: "Source reported",
    raw: {
      identifier,
      event: eventType,
      severity,
      certainty,
      areaDesc,
      sent,
      expires,
      effective,
      urgency,
      messageType,
      status,
    },
  };
}

export async function fetchMeteoalarmAlerts(
  location: ResolvedLocation
): Promise<RiskEvent[]> {
  const slug = COUNTRY_SLUGS[location.country];
  if (!slug) return [];

  const url = `${FEED_PROXY}?country=${encodeURIComponent(slug)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Meteoalarm returned HTTP ${res.status}`);

  const xml = await res.text();
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Meteoalarm returned invalid XML");
  const entries = doc.getElementsByTagNameNS("http://www.w3.org/2005/Atom", "entry");

  if (!entries.length) return [];

  const results = new Map<string, RiskEvent>();
  for (const entry of entries) {
    const event = parseEntry(entry, location);
    if (event) results.set(event.sourceEventId, event);
  }

  return [...results.values()];
}
