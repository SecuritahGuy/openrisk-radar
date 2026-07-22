import { newEventId } from "../lib/ids";
import { readJsonResponse } from "../lib/http";
import type { ResolvedLocation } from "../types/location";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE = "https://api.geonet.org.nz/quake";
const VOLCANO_BASE = "https://api.geonet.org.nz/volcano/val";

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

export interface GeoNetFeature {
  type: "Feature";
  id?: string;
  geometry: { type: "Point"; coordinates: [number, number] | [number, number, number] };
  properties: GeoNetProperties;
}

interface GeoNetResponse {
  type: "FeatureCollection";
  features: GeoNetFeature[];
}

interface GeoNetVolcanoProperties {
  acc: string;
  activity: string;
  hazards: string;
  level: number;
  volcanoID: string;
  volcanoTitle: string;
}

export interface GeoNetVolcanoFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: GeoNetVolcanoProperties;
}

interface GeoNetVolcanoResponse {
  type: "FeatureCollection";
  features: GeoNetVolcanoFeature[];
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

function geonetVolcanoSeverity(level: number): Severity {
  if (level >= 3) return "Extreme";
  if (level >= 2) return "Severe";
  if (level >= 1) return "Moderate";
  return "Minor";
}

export function normalizeGeoNet(feature: GeoNetFeature): RiskEvent {
  const p = feature.properties;
  const coords = feature.geometry.coordinates;
  const mag = p.magnitude ?? 0;
  const displayMagnitude = mag.toFixed(1);

  return {
    id: newEventId(),
    source: "GEONET",
    sourceEventId: p.publicID ?? p.earthquakeId ?? feature.id ?? "geonet",
    type: "Earthquake",
    category: "Seismic",
    severity: geonetSeverity(mag),
    headline: `M${displayMagnitude} — ${p.locality ?? "New Zealand"}`,
    description: [
      `Magnitude ${displayMagnitude} earthquake detected by GeoNet.`,
      `Depth: ${Math.abs(p.depth ?? coords[2] ?? 0).toFixed(1)} km.`,
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
    provider: {
      id: "geonet-nz",
      label: "GeoNet New Zealand",
      authority: "international",
      attributionUrl: "https://www.geonet.org.nz/",
    },
    raw: feature as unknown as Record<string, unknown>,
  };
}

export function supportsGeoNet(location: ResolvedLocation | null): boolean {
  if (!location) return false;
  return ["new zealand", "nz", "nzl"].includes(location.country.trim().toLowerCase());
}

export function normalizeGeoNetVolcano(
  feature: GeoNetVolcanoFeature,
  fetchedAt: string
): RiskEvent {
  const properties = feature.properties;
  const [longitude, latitude] = feature.geometry.coordinates;
  return {
    id: newEventId(),
    source: "GEONET",
    sourceEventId: `geonet-volcano-${properties.volcanoID}`,
    type: "Volcanic Alert Level",
    category: "Volcanic",
    severity: geonetVolcanoSeverity(properties.level),
    headline: `${properties.volcanoTitle}: Volcanic Alert Level ${properties.level}`,
    description: `${properties.activity} ${properties.hazards}`.replace(/\s+/g, " ").trim(),
    geometryType: "Point",
    latitude,
    longitude,
    polygon: null,
    startedAt: fetchedAt,
    expiresAt: null,
    updatedAt: fetchedAt,
    url: `https://www.geonet.org.nz/volcano/${properties.volcanoID}`,
    confidence: "Source reported",
    provider: {
      id: "geonet-nz",
      label: "GeoNet New Zealand",
      authority: "international",
      attributionUrl: "https://www.geonet.org.nz/",
    },
    raw: {
      ...properties,
      aviationColourCode: properties.acc,
      fetchedAt,
    },
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

export async function fetchGeoNetVolcanoAlerts(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<RiskEvent[]> {
  if (!isFinite(lat) || !isFinite(lng)) return [];
  const response = await fetch(VOLCANO_BASE);
  const data = await readJsonResponse<GeoNetVolcanoResponse>(response, "GeoNet volcanic alerts");
  if (!data.features?.length) return [];
  const fetchedAt = new Date().toISOString();
  return data.features
    .filter((feature) => feature.properties.level > 0)
    .filter((feature) => {
      const [longitude, latitude] = feature.geometry.coordinates;
      return haversineKm(lat, lng, latitude, longitude) <= radiusKm;
    })
    .map((feature) => normalizeGeoNetVolcano(feature, fetchedAt));
}
