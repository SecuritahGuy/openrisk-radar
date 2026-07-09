import { newEventId } from "../lib/ids";
import type { RiskEvent } from "../types/riskEvent";

const BASE = "https://earthquake.usgs.gov/fdsnws/event/1";

interface UsgsFeature {
  id: string;
  properties: {
    mag: number;
    place: string;
    time: number;
    updated: number;
    url: string;
    title: string;
    type: string;
    magType: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number, number];
  };
}

interface UsgsResponse {
  features: UsgsFeature[];
}

function normalize(feature: UsgsFeature): RiskEvent {
  const p = feature.properties;
  const [lng, lat] = feature.geometry.coordinates;
  const mag = p.mag ?? 0;

  return {
    id: newEventId(),
    source: "USGS",
    sourceEventId: feature.id,
    type: "Earthquake",
    category: "Seismic",
    severity: mag >= 6 ? "Extreme" : mag >= 5 ? "Severe" : mag >= 3 ? "Moderate" : "Minor",
    headline: p.title ?? `M${mag.toFixed(1)} - ${p.place}`,
    description: `Magnitude ${mag.toFixed(1)} ${p.type ?? "earthquake"} near ${p.place}.`,
    geometryType: "Point",
    latitude: lat,
    longitude: lng,
    polygon: null,
    startedAt: new Date(p.time).toISOString(),
    expiresAt: null,
    updatedAt: new Date(p.updated).toISOString(),
    url: p.url,
    confidence: "Source reported",
    raw: feature as unknown as Record<string, unknown>,
  };
}

export async function fetchEarthquakes(
  lat: number,
  lng: number,
  radiusKm: number,
  minMag = 1.0
): Promise<RiskEvent[]> {
  const params = new URLSearchParams({
    format: "geojson",
    latitude: lat.toString(),
    longitude: lng.toString(),
    maxradiuskm: radiusKm.toString(),
    minmagnitude: minMag.toString(),
    orderby: "magnitude",
  });
  const url = `${BASE}/query?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USGS API returned ${res.status}`);
  const data: UsgsResponse = await res.json();
  return (data.features ?? []).map(normalize);
}
