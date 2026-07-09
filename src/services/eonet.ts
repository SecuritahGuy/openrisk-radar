import type { GlobalEvent, GlobalCategory } from "../types/globalEvent";

const BASE = "https://eonet.gsfc.nasa.gov/api/v3";

const CATEGORY_MAP: Record<string, GlobalCategory> = {
  earthquakes: "earthquake",
  floods: "flood",
  volcanoes: "volcano",
  wildfires: "wildfire",
  severeStorms: "severe_storm",
  seaLakeIce: "sea_lake_ice",
  landslides: "landslide",
  drought: "drought",
  dustHaze: "dust_haze",
  snow: "snow",
  tempExtremes: "temp_extreme",
  manmade: "manmade",
  waterColor: "other",
};

interface EonetCategory {
  id: string;
  title: string;
}

interface EonetSource {
  id: string;
  url: string;
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
    type: "Point" | "Polygon";
    coordinates: number[] | number[][] | number[][][];
  } | null;
}

interface EonetResponse {
  type: "FeatureCollection";
  features: EonetFeature[];
}

export async function fetchEonetEvents(
  options?: {
    category?: string;
    limit?: number;
    days?: number;
    bbox?: [number, number, number, number];
  }
): Promise<GlobalEvent[]> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.days) params.set("days", String(options.days));
  if (options?.category) params.set("category", options.category);
  if (options?.bbox) {
    const [minLon, minLat, maxLon, maxLat] = options.bbox;
    params.set("bbox", `${minLon},${minLat},${maxLon},${maxLat}`);
  }

  const qs = params.toString();
  const url = `${BASE}/events/geojson${qs ? `?${qs}` : ""}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`EONET API returned ${res.status}`);

  const data: EonetResponse = await res.json();
  if (!data.features?.length) return [];

  const results: GlobalEvent[] = [];

  for (const feature of data.features) {
    const p = feature.properties;
    const coords = extractCoords(feature.geometry);

    const category = mapCategory(p.categories);

    results.push({
      id: p.id,
      source: "EONET",
      sourceId: p.id,
      category,
      title: p.title,
      description: p.description,
      severity: "Unknown",
      severityScore: p.magnitudeValue,
      severityUnit: p.magnitudeUnit,
      coordinates: coords,
      country: null,
      iso3: null,
      startedAt: p.date,
      endedAt: p.closed,
      updatedAt: p.date,
      url: p.link,
      raw: p as unknown as Record<string, unknown>,
    });
  }

  return results;
}

function mapCategory(categories: EonetCategory[]): GlobalCategory {
  for (const c of categories) {
    const mapped = CATEGORY_MAP[c.id];
    if (mapped) return mapped;
  }
  return "other";
}

function extractCoords(
  geometry: EonetFeature["geometry"]
): [number, number] | null {
  if (!geometry) return null;

  if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
    const [lng, lat] = geometry.coordinates as number[];
    if (isFinite(lng) && isFinite(lat)) return [lng, lat];
  }

  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    const ring = geometry.coordinates[0];
    if (Array.isArray(ring) && ring.length > 0) {
      const [lng, lat] = ring[0] as number[];
      if (isFinite(lng) && isFinite(lat)) return [lng, lat];
    }
  }

  return null;
}
