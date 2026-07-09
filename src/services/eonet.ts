import { newEventId } from "../lib/ids";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE = "https://eonet.gsfc.nasa.gov/api/v3";

interface EonetSource {
  id: string;
  url: string;
}

interface EonetCategory {
  id: string;
  title: string;
}

interface EonetProperties {
  id: string;
  title: string;
  description: string | null;
  link: string;
  closed: string | null;
  date: string;
  magnitudeValue: number | null;
  magnitudeUnit: string | null;
  categories: EonetCategory[];
  sources: EonetSource[];
}

interface EonetFeature {
  type: "Feature";
  properties: EonetProperties;
  geometry: {
    type: "Point" | "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
}

interface EonetResponse {
  type: "FeatureCollection";
  features: EonetFeature[];
}

interface CategoryMapping {
  category: "Weather" | "Seismic" | "Disaster" | "Wildfire" | "Tropical" | "Volcanic" | "Ice" | "Landslide" | "Dust";
  label: string;
}

const CATEGORY_MAP: Record<string, CategoryMapping> = {
  drought: { category: "Disaster", label: "Drought" },
  dustHaze: { category: "Dust", label: "Dust and Haze" },
  earthquakes: { category: "Seismic", label: "Earthquake" },
  floods: { category: "Weather", label: "Flood" },
  landslides: { category: "Landslide", label: "Landslide" },
  manmade: { category: "Disaster", label: "Manmade Event" },
  seaLakeIce: { category: "Ice", label: "Sea and Lake Ice" },
  severeStorms: { category: "Weather", label: "Severe Storm" },
  snow: { category: "Weather", label: "Snow" },
  tempExtremes: { category: "Weather", label: "Temperature Extreme" },
  volcanoes: { category: "Volcanic", label: "Volcano" },
  waterColor: { category: "Disaster", label: "Water Color Event" },
  wildfires: { category: "Wildfire", label: "Wildfire" },
};

function mapSeverity(magnitude: number | null, unit: string | null): Severity {
  if (magnitude == null || magnitude === 0) return "Minor";
  if (unit === "kts" || unit === "kt") {
    if (magnitude >= 100) return "Extreme";
    if (magnitude >= 64) return "Severe";
    if (magnitude >= 34) return "Moderate";
    return "Minor";
  }
  if (unit === "acres" || unit === "hectares" || unit === "Ha") {
    if (magnitude >= 100000) return "Extreme";
    if (magnitude >= 10000) return "Severe";
    if (magnitude >= 1000) return "Moderate";
    return "Minor";
  }
  if (magnitude >= 1000) return "Extreme";
  if (magnitude >= 100) return "Severe";
  if (magnitude >= 10) return "Moderate";
  return "Minor";
}

function extractPolygon(feature: EonetFeature): number[][] | null {
  if (feature.geometry.type !== "Polygon") return null;
  const coords = feature.geometry.coordinates as number[][][];
  if (!coords?.[0]) return null;
  return coords[0].map(([lng, lat]) => [lng, lat]);
}

function normalizeFeature(feature: EonetFeature): RiskEvent | null {
  const p = feature.properties;
  if (!p.id || !p.categories || p.categories.length === 0) return null;

  const primary = p.categories[0];
  const mapping = CATEGORY_MAP[primary.id];
  if (!mapping) return null;

  const coords = feature.geometry.coordinates as number[];
  const isPoint = feature.geometry.type === "Point" && coords?.length >= 2;
  const lat = isPoint ? coords[1] : null;
  const lng = isPoint ? coords[0] : null;

  const polygon = extractPolygon(feature);

  const descParts: string[] = [];
  if (p.description) descParts.push(p.description);
  if (p.magnitudeValue != null && p.magnitudeUnit) {
    descParts.push(`Magnitude: ${p.magnitudeValue} ${p.magnitudeUnit}`);
  }
  if (p.sources?.length > 0) {
    descParts.push(`Source: ${p.sources.map((s) => s.id).join(", ")}`);
  }

  return {
    id: newEventId(),
    source: "EONET",
    sourceEventId: p.id,
    type: mapping.label,
    category: mapping.category,
    severity: mapSeverity(p.magnitudeValue, p.magnitudeUnit),
    headline: p.title || mapping.label,
    description: descParts.filter(Boolean).join(". "),
    geometryType: polygon ? "Polygon" : isPoint ? "Point" : "None",
    latitude: lat,
    longitude: lng,
    polygon,
    startedAt: p.date,
    expiresAt: p.closed || null,
    updatedAt: p.date,
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

export async function fetchEonetEvents(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<RiskEvent[]> {
  const url = `${BASE}/events/geojson`;
  const res = await fetch(url, {
    headers: { Accept: "application/geo+json" },
  });
  if (!res.ok) throw new Error(`EONET API returned ${res.status}`);

  const data: EonetResponse = await res.json();
  const results: RiskEvent[] = [];

  for (const feature of data.features ?? []) {
    const coords = feature.geometry.coordinates as number[];
    if (feature.geometry.type === "Point" && coords?.length >= 2) {
      const fLat = coords[1];
      const fLng = coords[0];
      if (haversineKm(lat, lng, fLat, fLng) > radiusKm) continue;
    }
    const event = normalizeFeature(feature);
    if (event) results.push(event);
  }

  return results;
}