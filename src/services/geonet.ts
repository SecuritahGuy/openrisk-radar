import { newEventId } from "../lib/ids";
import { readJsonResponse } from "../lib/http";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE = "https://api.geonet.org.nz/quake";

interface GeoNetProperties {
  publicID?: string;
  time?: string;
  updated?: string;
  magnitude?: number;
  depth?: number;
  locality?: string;
  quality?: string;
  earthquakeId?: string;
}

interface GeoNetFeature {
  type: "Feature";
  id?: string;
  geometry: { type: "Point"; coordinates: [number, number, number] };
  properties: GeoNetProperties;
}

interface GeoNetResponse {
  type: "FeatureCollection";
  features: GeoNetFeature[];
}

function geonetSeverity(mag: number): Severity {
  if (mag >= 7) return "Extreme";
  if (mag >= 5.5) return "Severe";
  if (mag >= 4) return "Moderate";
  return "Minor";
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

export function normalizeGeoNet(feature: GeoNetFeature): RiskEvent {
  const p = feature.properties;
  const coords = feature.geometry.coordinates;
  const mag = p.magnitude ?? 0;

  return {
    id: newEventId(),
    source: "GEONET",
    sourceEventId: p.publicID ?? p.earthquakeId ?? feature.id ?? "geonet",
    type: "Earthquake",
    category: "Seismic",
    severity: geonetSeverity(mag),
    headline: `M${mag} — ${p.locality ?? "New Zealand"}`,
    description: [
      `Magnitude ${mag} earthquake detected by GeoNet.`,
      `Depth: ${Math.abs(coords[2])} km.`,
      p.locality ? `Location: ${p.locality}.` : "",
    ].filter(Boolean).join(" "),
    geometryType: "Point",
    latitude: coords[1],
    longitude: coords[0],
    polygon: null,
    startedAt: p.time ?? new Date().toISOString(),
    expiresAt: null,
    updatedAt: p.updated ?? p.time ?? new Date().toISOString(),
    url: p.publicID
      ? `https://api.geonet.org.nz/quake/${p.publicID}`
      : "https://www.geonet.org.nz/earthquake",
    confidence: "Source reported",
    raw: feature as unknown as Record<string, unknown>,
  };
}

export async function fetchGeoNetQuakes(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<RiskEvent[]> {
  if (!isFinite(lat) || !isFinite(lng)) return [];

  const params = new URLSearchParams({ MMI: "0" });
  const res = await fetch(`${BASE}?${params}`);
  const data = await readJsonResponse<GeoNetResponse>(res, "GeoNet");
  if (!data.features?.length) return [];

  return data.features
    .filter((f) => haversineKm(lat, lng, f.geometry.coordinates[1], f.geometry.coordinates[0]) <= radiusKm)
    .map(normalizeGeoNet);
}
