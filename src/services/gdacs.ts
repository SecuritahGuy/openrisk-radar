import { newEventId } from "../lib/ids";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE = "https://www.gdacs.org";

type GdacsEventType = "EQ" | "TC" | "FL" | "VO" | "WF" | "DR";

interface EventTypeInfo {
  type: GdacsEventType;
  category: "Seismic" | "Tropical" | "Weather" | "Volcanic" | "Wildfire" | "Disaster";
  label: string;
}

const EVENT_TYPES: EventTypeInfo[] = [
  { type: "EQ", category: "Seismic", label: "Earthquake" },
  { type: "TC", category: "Tropical", label: "Tropical Cyclone" },
  { type: "FL", category: "Weather", label: "Flood" },
  { type: "VO", category: "Volcanic", label: "Volcano" },
  { type: "WF", category: "Wildfire", label: "Wildfire" },
  { type: "DR", category: "Disaster", label: "Drought" },
];

const TYPE_MAP: Record<string, EventTypeInfo> = {};
for (const et of EVENT_TYPES) {
  TYPE_MAP[et.type] = et;
}

interface GdacsProperties {
  name: string;
  description: string;
  link: string;
  alertlevel: string;
  alertscore: string;
  eventtype: string;
  eventid: string;
  episodeid: string;
  eventname: string;
  fromdate: string;
  todate: string;
  country: string;
  countrylist: string;
  iso3: string;
  severity: string;
  latitude: string;
  longitude: string;
  Class: string;
}

interface GdacsFeature {
  type: "Feature";
  id: string;
  properties: GdacsProperties;
  geometry: {
    type: "Point" | "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
}

interface GdacsResponse {
  type: "FeatureCollection";
  features: GdacsFeature[];
}

function parseDate(raw: string): string {
  try {
    const d = new Date(raw);
    return isNaN(d.getTime()) ? raw : d.toISOString();
  } catch {
    return raw;
  }
}

function mapSeverity(alertLevel: string, severityValue: number): Severity {
  switch (alertLevel) {
    case "Red":
      return "Extreme";
    case "Orange":
      return "Severe";
    case "Green":
      return severityValue > 0 ? "Moderate" : "Minor";
    default:
      return "Minor";
  }
}

function extractPolygon(feature: GdacsFeature): number[][] | null {
  if (feature.geometry.type !== "Polygon") return null;
  const coords = feature.geometry.coordinates as number[][][];
  if (!coords?.[0]) return null;
  return coords[0].map(([lng, lat]) => [lng, lat]);
}

function normalizeFeature(feature: GdacsFeature): RiskEvent | null {
  const p = feature.properties;

  if (!p.eventtype || !p.eventid) return null;

  const typeInfo = TYPE_MAP[p.eventtype];
  if (!typeInfo) return null;

  const severityVal = parseFloat(p.severity) || 0;
  const lat = parseFloat(p.latitude);
  const lng = parseFloat(p.longitude);
  const hasPoint = !isNaN(lat) && !isNaN(lng);

  const polygon = extractPolygon(feature);

  const headline = p.name || p.description || `${typeInfo.label} event`;
  const descParts = [p.description];
  if (p.country) descParts.push(`Country: ${p.country}`);
  if (p.eventname) descParts.push(`Name: ${p.eventname}`);
  const description = descParts.filter(Boolean).join(". ");

  return {
    id: newEventId(),
    source: "GDACS",
    sourceEventId: `${p.eventtype}${p.eventid}`,
    type: typeInfo.label,
    category: typeInfo.category,
    severity: mapSeverity(p.alertlevel, severityVal),
    headline,
    description,
    geometryType: polygon ? "Polygon" : hasPoint ? "Point" : "None",
    latitude: hasPoint ? lat : null,
    longitude: hasPoint ? lng : null,
    polygon,
    startedAt: parseDate(p.fromdate),
    expiresAt: p.todate ? parseDate(p.todate) : null,
    updatedAt: parseDate(p.fromdate),
    url: p.link || null,
    confidence: "Source reported",
    raw: feature as unknown as Record<string, unknown>,
  };
}

function haversineKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceKmBetween(
  lat: number,
  lng: number,
  feature: GdacsFeature
): number | null {
  const p = feature.properties;
  const fLat = parseFloat(p.latitude);
  const fLng = parseFloat(p.longitude);
  if (isNaN(fLat) || isNaN(fLng)) return null;
  return haversineKm(lat, lng, fLat, fLng);
}

export async function fetchGdacsEvents(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<RiskEvent[]> {
  const results: RiskEvent[] = [];
  const errors: string[] = [];

  const fetches = EVENT_TYPES.map(async ({ type }) => {
    try {
      const url = `${BASE}/xml/gdacs${type}.geojson`;
      const res = await fetch(url, {
        headers: { Accept: "application/geo+json" },
      });
      if (!res.ok) {
        errors.push(`GDACS ${type}: HTTP ${res.status}`);
        return;
      }
      const data: GdacsResponse = await res.json();
      for (const feature of data.features ?? []) {
        if (feature.properties.Class !== "Point_Centroid") continue;
        const dist = distanceKmBetween(lat, lng, feature);
        if (dist !== null && dist > radiusKm) continue;
        const event = normalizeFeature(feature);
        if (event) {
          results.push(event);
        }
      }
    } catch (err) {
      errors.push(`GDACS ${type}: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  });

  await Promise.all(fetches);

  return results;
}