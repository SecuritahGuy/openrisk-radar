import { newEventId } from "../lib/ids";
import { readJsonResponse } from "../lib/http";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE = "https://gtm.crisisinfo.eu/api/geojson/active";
const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

export interface GtmProperties {
  guid?: string;
  event_time?: string;
  place?: string;
  magnitude?: string;
  focal_depth_km?: string;
  ocean_name?: string;
  ocean_region?: string;
  warning_level?: string;
  wave_height_m?: string;
  status?: string;
  source?: string;
}

export interface GtmFeature {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] } | { type: string; coordinates: unknown };
  properties: GtmProperties;
}

interface GtmResponse {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] } | { type: string; coordinates: unknown };
  properties: GtmProperties;
}

function gtmSeverity(level: string | undefined): Severity {
  switch ((level ?? "").toUpperCase()) {
    case "RED":
      return "Extreme";
    case "ORANGE":
      return "Severe";
    case "YELLOW":
      return "Moderate";
    default:
      return "Minor";
  }
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

export function normalizeGtm(feature: GtmFeature, nowIso: string): RiskEvent {
  const p = feature.properties;
  const coords = (feature.geometry as { coordinates: [number, number] }).coordinates;
  const lon = coords[0];
  const lat = coords[1];
  const magnitude = p.magnitude ? `M${p.magnitude}` : "Tsunami event";
  const place = p.place ?? p.ocean_name ?? "Open ocean";
  const startedAt = p.event_time ?? nowIso;
  const startedMs = new Date(startedAt).getTime();
  const expiresAt = Number.isFinite(startedMs)
    ? new Date(startedMs + ACTIVE_WINDOW_MS).toISOString()
    : new Date(new Date(nowIso).getTime() + ACTIVE_WINDOW_MS).toISOString();

  return {
    id: newEventId(),
    source: "GTM",
    sourceEventId: `gtm-${p.guid ?? nowIso}`,
    type: "Tsunami Alert",
    category: "Disaster",
    severity: gtmSeverity(p.warning_level),
    headline: `${p.warning_level ?? "Tsunami"} — ${magnitude} near ${place}`,
    description: [
      `Tsunami alert (${p.warning_level ?? "unknown"} level).`,
      p.magnitude ? `Origin magnitude ${p.magnitude}.` : "",
      p.focal_depth_km ? `Focal depth ${p.focal_depth_km} km.` : "",
      p.wave_height_m ? `Modelled wave height ${p.wave_height_m} m.` : "",
      place ? `Location: ${place}.` : "",
    ].filter(Boolean).join(" "),
    geometryType: "Point",
    latitude: lat,
    longitude: lon,
    polygon: null,
    startedAt,
    expiresAt,
    updatedAt: startedAt,
    url: "https://gtm.crisisinfo.eu/",
    confidence: "Source reported",
    provider: {
      id: "gtm-crisisinfo",
      label: "Global Tsunami Monitor",
      authority: "international",
      attributionUrl: "https://gtm.crisisinfo.eu/",
    },
    raw: feature as unknown as Record<string, unknown>,
  };
}

export async function fetchGlobalTsunamiAlerts(
  lat: number,
  lng: number,
  radiusKm = 20000
): Promise<RiskEvent[]> {
  const res = await fetch(BASE);
  const data = await readJsonResponse<GtmResponse>(res, "Global Tsunami Monitor");
  if (data.type !== "Feature" || data.geometry?.type !== "Point") return [];

  const feature = data as unknown as GtmFeature;
  const coords = (feature.geometry as { coordinates: [number, number] }).coordinates;
  const nowIso = new Date().toISOString();

  const eventTime = new Date(feature.properties.event_time ?? "").getTime();
  if (!Number.isFinite(eventTime) || Date.now() - eventTime > ACTIVE_WINDOW_MS) return [];

  if (haversineKm(lat, lng, coords[1], coords[0]) > radiusKm) return [];
  return [normalizeGtm(feature, nowIso)];
}
