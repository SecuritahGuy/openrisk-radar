import { newEventId } from "../lib/ids";
import type { RiskEvent, Severity } from "../types/riskEvent";

const MAPSERVER =
  "https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather_summary/MapServer";

const MONITOR_RADIUS_FLOOR_MILES = 300;
const FORECAST_POINTS_LAYER = 5;
const OUTLOOK_2DAY_LAYER = 1;

interface GeoJsonFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: Record<string, unknown>;
}

interface GeoJsonResponse {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
}

interface StormData {
  stormname: string;
  stormtype: string;
  maxwind: number | null;
  mslp: number | null;
  lat: number;
  lon: number;
  tcdir: number | null;
  tcspd: number | null;
  advdate: string;
  advisnum: string | null;
  gust: number | null;
  ssnum: number | null;
  binnumber: string | null;
  basin: string;
  dvlbl: string | null;
}

function classificationName(stormtype: string): string {
  switch (stormtype.toUpperCase()) {
    case "DB":
      return "Disturbance";
    case "LO":
      return "Low";
    case "TD":
      return "Tropical Depression";
    case "TS":
      return "Tropical Storm";
    case "HU":
      return "Hurricane";
    case "MH":
      return "Major Hurricane";
    case "SD":
      return "Subtropical Depression";
    case "SS":
      return "Subtropical Storm";
    case "PTC":
      return "Post-Tropical Cyclone";
    default:
      return stormtype || "Tropical Cyclone";
  }
}

function stormSeverity(stormtype: string, maxwind: number | null): Severity {
  const wt = maxwind ?? 0;
  const st = stormtype.toUpperCase();
  if (st === "MH" || wt >= 96) return "Extreme";
  if (st === "HU" || wt >= 64) return "Severe";
  if (st === "TS" || st === "SS" || wt >= 34) return "Moderate";
  return "Minor";
}

function milesBetween(latA: number, lngA: number, latB: number, lngB: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthMiles = 3958.8;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) *
      Math.cos(toRad(latB)) *
      Math.sin(dLng / 2) ** 2;
  return earthMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function asNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function featuresToStorms(features: GeoJsonFeature[]): StormData[] {
  return features
    .filter((f) => {
      const p = f.properties;
      const name = p.stormname as string | undefined;
      return name && name.trim().length > 0;
    })
    .map((f) => {
      const p = f.properties;
      const coords = f.geometry.coordinates;
      return {
        stormname: (p.stormname as string) ?? "Unknown",
        stormtype: (p.stormtype as string) ?? "LO",
        maxwind: asNum(p.maxwind),
        mslp: asNum(p.mslp),
        lat: coords[1],
        lon: coords[0],
        tcdir: asNum(p.tcdir),
        tcspd: asNum(p.tcspd),
        advdate: (p.advdate as string) ?? new Date().toISOString(),
        advisnum: (p.advisnum as string) ?? null,
        gust: asNum(p.gust),
        ssnum: asNum(p.ssnum),
        binnumber: (p.binnumber as string) ?? null,
        basin: (p.basin as string) ?? "",
        dvlbl: (p.dvlbl as string) ?? null,
      };
    });
}

function layerUrl(layerId: number): string {
  return `${MAPSERVER}/${layerId}/query`;
}

async function fetchLayerGeoJson(layerId: number, where: string): Promise<GeoJsonFeature[]> {
  const url = `${layerUrl(layerId)}?where=${encodeURIComponent(where)}&outFields=*&returnGeometry=true&f=geojson`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data: GeoJsonResponse = await res.json();
  return data.features ?? [];
}

function normalizeStorm(s: StormData): RiskEvent {
  const classification = classificationName(s.stormtype);
  const intensity = s.maxwind;
  const pressure = s.mslp;
  const sourceId = s.binnumber
    ? `nhc-${s.basin}-${s.binnumber}`
    : `nhc-${s.stormname.replace(/\s+/g, "-").toLowerCase()}`;

  return {
    id: newEventId(),
    source: "NHC",
    sourceEventId: sourceId,
    type: classification,
    category: "Tropical",
    severity: stormSeverity(s.stormtype, s.maxwind),
    headline: `NHC ${classification} ${s.stormname}`,
    description: [
      `${classification} ${s.stormname} is at ${s.lat.toFixed(2)}, ${s.lon.toFixed(2)}.`,
      intensity != null ? `Maximum sustained winds are ${intensity} kt.` : "",
      pressure != null ? `Minimum central pressure is ${pressure} mb.` : "",
      s.tcdir != null && s.tcspd != null
        ? `Movement is ${s.tcdir} degrees at ${s.tcspd} kt.`
        : "",
    ].filter(Boolean).join(" "),
    geometryType: "Point",
    latitude: s.lat,
    longitude: s.lon,
    polygon: null,
    startedAt: s.advdate,
    expiresAt: null,
    updatedAt: s.advdate,
    url: "https://www.nhc.noaa.gov/cyclones/",
    confidence: "Source reported",
    raw: s as unknown as Record<string, unknown>,
  };
}

function normalizeDisturbance(feature: GeoJsonFeature): RiskEvent {
  const p = feature.properties;
  const coords = feature.geometry.coordinates;
  const prob2day = (p.prob2day as string) ?? "0%";
  const risk2day = (p.risk2day as string) ?? "Low";
  const prob7day = (p.prob7day as string) ?? "0%";
  const risk7day = (p.risk7day as string) ?? "Low";

  return {
    id: newEventId(),
    source: "NHC",
    sourceEventId: `nhc-outlook-${coords[1].toFixed(2)}-${coords[0].toFixed(2)}`,
    type: "Disturbance",
    category: "Tropical",
    severity: risk2day === "High" ? "Moderate" : risk2day === "Medium" ? "Minor" : "Minor",
    headline: `NHC Disturbance — ${prob2day} in 2 days, ${prob7day} in 7 days`,
    description: [
      `Tropical disturbance at ${coords[1].toFixed(2)}, ${coords[0].toFixed(2)}.`,
      `Two-day development probability: ${prob2day} (${risk2day}).`,
      `Seven-day development probability: ${prob7day} (${risk7day}).`,
    ].join(" "),
    geometryType: "Point",
    latitude: coords[1],
    longitude: coords[0],
    polygon: null,
    startedAt: new Date().toISOString(),
    expiresAt: null,
    updatedAt: new Date().toISOString(),
    url: "https://www.nhc.noaa.gov/gtwo.php",
    confidence: "Source reported",
    raw: p as unknown as Record<string, unknown>,
  };
}

export async function fetchNhcStorms(
  lat: number,
  lng: number,
  radiusMiles: number
): Promise<RiskEvent[]> {
  const monitorRadius = Math.max(radiusMiles, MONITOR_RADIUS_FLOOR_MILES);

  const namedStorms = featuresToStorms(
    await fetchLayerGeoJson(FORECAST_POINTS_LAYER, "fcstprd=0")
  );

  const outlookFeatures = await fetchLayerGeoJson(OUTLOOK_2DAY_LAYER, "1=1");

  const allStorms = namedStorms.filter((s) => {
    if (s.lat == null || s.lon == null) return false;
    return milesBetween(lat, lng, s.lat, s.lon) <= monitorRadius;
  });
  const allDisturbances = outlookFeatures.filter((f) => {
    const coords = f.geometry.coordinates;
    return milesBetween(lat, lng, coords[1], coords[0]) <= monitorRadius;
  });

  const events: RiskEvent[] = allStorms.map(normalizeStorm);
  const disturbances: RiskEvent[] = allDisturbances.map(normalizeDisturbance);

  return [...events, ...disturbances];
}
