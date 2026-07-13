import { newEventId } from "../lib/ids";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE = "https://www.seismicportal.eu/fdsnws/event/1/query";

export interface EmscProperties {
  source_id: string;
  source_catalog: string;
  lastupdate: string;
  time: string;
  flynn_region: string;
  lat: number;
  lon: number;
  depth: number;
  evtype: string;
  auth: string;
  mag: number;
  magtype: string;
  unid: string;
}

export interface EmscFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number, number];
  };
  properties: EmscProperties;
}

interface EmscResponse {
  type: "FeatureCollection";
  metadata: { count: number };
  features: EmscFeature[];
}

export function emscSeverity(mag: number): Severity {
  if (mag >= 7) return "Extreme";
  if (mag >= 5.5) return "Severe";
  if (mag >= 4) return "Moderate";
  return "Minor";
}

export function normalize(feature: EmscFeature): RiskEvent {
  const p = feature.properties;
  const coords = feature.geometry.coordinates;
  const mag = p.mag;

  return {
    id: newEventId(),
    source: "EMSC",
    sourceEventId: p.unid,
    type: "Earthquake",
    category: "Seismic",
    severity: emscSeverity(mag),
    headline: `M${mag} ${p.magtype} — ${p.flynn_region}`,
    description: [
      `Magnitude ${mag} (${p.magtype}) earthquake detected by ${p.auth}.`,
      `Depth: ${Math.abs(coords[2])} km.`,
      `Region: ${p.flynn_region}.`,
    ].join(" "),
    geometryType: "Point",
    latitude: coords[1],
    longitude: coords[0],
    polygon: null,
    startedAt: p.time,
    expiresAt: null,
    updatedAt: p.lastupdate,
    url: `https://www.emsc-csem.org/Earthquake_information/earthquake.php?id=${p.source_id}`,
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

export async function fetchEmscEvents(
  lat: number,
  lng: number,
  radiusKm: number,
  minMag = 2.5
): Promise<RiskEvent[]> {
  if (!isFinite(lat) || !isFinite(lng)) {
    return [];
  }

  const kmPerDeg = 111.32;
  const latDelta = radiusKm / kmPerDeg;
  const lngDelta = radiusKm / (kmPerDeg * Math.cos((lat * Math.PI) / 180));

  const params = new URLSearchParams({
    format: "json",
    minlatitude: (lat - latDelta).toString(),
    maxlatitude: (lat + latDelta).toString(),
    minlongitude: (lng - lngDelta).toString(),
    maxlongitude: (lng + lngDelta).toString(),
    minmagnitude: minMag.toString(),
    limit: "200",
  });

  const url = `${BASE}?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text().catch(() => "(no body)");
    throw new Error(`EMSC API returned ${res.status}: ${body}`);
  }

  const data: EmscResponse = await res.json();
  if (!data.features || data.features.length === 0) return [];

  return data.features
    .filter((f) => {
      const coords = f.geometry.coordinates;
      return haversineKm(lat, lng, coords[1], coords[0]) <= radiusKm;
    })
    .map(normalize);
}
