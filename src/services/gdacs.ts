import type { GlobalEvent, GlobalCategory } from "../types/globalEvent";

const FEED_BASE = "https://www.gdacs.org/xml/gdacs";

const TYPE_MAP: Record<string, GlobalCategory> = {
  EQ: "earthquake",
  TC: "tropical_cyclone",
  FL: "flood",
  VO: "volcano",
  DR: "drought",
  WF: "wildfire",
};

function mapSeverity(alertLevel: string | null): GlobalEvent["severity"] {
  switch (alertLevel?.toLowerCase()) {
    case "red":
      return "Red";
    case "orange":
      return "Orange";
    case "green":
      return "Green";
    default:
      return "Unknown";
  }
}

function parseTimestamp(raw: string | null): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

interface GdacsProperties {
  eventtype: string;
  eventid: number;
  episodeid: number;
  eventname?: string;
  name?: string;
  description?: string;
  alertlevel?: string;
  alertscore?: string | number;
  country?: string;
  countrylist?: string;
  iso3?: string;
  fromdate?: string;
  todate?: string;
  severity?: string;
  link?: string;
  Class?: string;
  [key: string]: unknown;
}

interface GdacsFeature {
  type: "Feature";
  id: string;
  properties: GdacsProperties;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  } | null;
}

interface GdacsFeed {
  type: "FeatureCollection";
  features: GdacsFeature[];
}

export async function fetchGdacsEvents(
  eventTypes?: GlobalCategory[]
): Promise<GlobalEvent[]> {
  const typesToFetch = eventTypes ?? ["earthquake", "tropical_cyclone", "flood", "volcano", "drought", "wildfire"];

  const reverseMap: Record<string, string> = {};
  for (const [code, category] of Object.entries(TYPE_MAP)) {
    reverseMap[category] = code;
  }

  const results: GlobalEvent[] = [];

  for (const category of typesToFetch) {
    const code = reverseMap[category];
    if (!code) continue;

    const url = `${FEED_BASE}${code}.geojson`;
    const res = await fetch(url);
    if (!res.ok) continue;

    const data: GdacsFeed = await res.json();
    if (!data.features?.length) continue;

    const seen = new Set<string>();

    for (const feature of data.features) {
      const p = feature.properties;
      const episodeKey = `${p.eventtype}-${p.eventid}-${p.episodeid}`;
      if (seen.has(episodeKey)) continue;
      seen.add(episodeKey);

      const isCentroid = p.Class === "Point_Centroid";
      if (!isCentroid) continue;

      const coords = feature.geometry?.coordinates ?? null;

      results.push({
        id: episodeKey,
        source: "GDACS",
        sourceId: String(p.eventid),
        category: TYPE_MAP[p.eventtype] ?? "other",
        title: p.name ?? p.eventname ?? `GDACS ${p.eventtype} alert`,
        description: p.description ?? null,
        severity: mapSeverity(p.alertlevel),
        severityScore: p.severity ? safeParseFloat(p.severity) : null,
        severityUnit: guessUnit(p.eventtype),
        coordinates: coords,
        country: p.country ?? p.countrylist ?? null,
        iso3: p.iso3 || null,
        startedAt: parseTimestamp(p.fromdate),
        endedAt: p.todate ? parseTimestamp(p.todate) : null,
        updatedAt: parseTimestamp(p.fromdate),
        url: p.link ?? null,
        raw: p as unknown as Record<string, unknown>,
      });
    }
  }

  return results;
}

function safeParseFloat(v: string | number): number | null {
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function guessUnit(eventType: string): string | null {
  switch (eventType) {
    case "EQ":
      return "M";
    case "TC":
      return "km/h";
    case "VO":
      return "VEI";
    default:
      return null;
  }
}
