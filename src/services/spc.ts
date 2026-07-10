import { newEventId } from "../lib/ids";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE =
  "https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer";

const DAY_LAYERS = [
  { day: 1, layer: 1 },
  { day: 2, layer: 9 },
  { day: 3, layer: 17 },
] as const;

interface SpcProperties {
  objectid: number;
  dn: number;
  valid: string;
  expire: string;
  issue: string;
  label: string;
  label2: string;
  idp_source: string;
}

interface SpcFeature {
  id?: string | number;
  type: "Feature";
  properties: SpcProperties;
  geometry:
    | {
        type: "Polygon";
        coordinates: number[][][];
      }
    | {
        type: "MultiPolygon";
        coordinates: number[][][][];
      }
    | null;
}

interface SpcResponse {
  features: SpcFeature[];
}

function ymdhmToIso(value: string): string {
  const match = value.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:00Z`;
}

function labelSeverity(label: string): Severity {
  switch (label.toUpperCase()) {
    case "HIGH":
    case "MDT":
      return "Extreme";
    case "ENH":
      return "Severe";
    case "SLGT":
      return "Moderate";
    default:
      return "Minor";
  }
}

function labelName(label: string): string {
  switch (label.toUpperCase()) {
    case "TSTM":
      return "General Thunderstorms";
    case "MRGL":
      return "Marginal Risk";
    case "SLGT":
      return "Slight Risk";
    case "ENH":
      return "Enhanced Risk";
    case "MDT":
      return "Moderate Risk";
    case "HIGH":
      return "High Risk";
    default:
      return label;
  }
}

function pointInPolygon(lng: number, lat: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
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

function polygonNearLocation(
  polygon: number[][],
  lat: number,
  lng: number,
  radiusMiles: number
): boolean {
  return polygon.some(
    ([polyLng, polyLat]) => milesBetween(lat, lng, polyLat, polyLng) <= radiusMiles
  );
}

function polygonRings(feature: SpcFeature): number[][][] {
  if (!feature.geometry) return [];
  if (feature.geometry.type === "Polygon") {
    const outerRing = feature.geometry.coordinates[0];
    return outerRing ? [outerRing] : [];
  }
  return feature.geometry.coordinates
    .map((polygon) => polygon[0])
    .filter(Boolean);
}

function normalize(
  feature: SpcFeature,
  polygon: number[][],
  day: number,
  index: number
): RiskEvent {
  const p = feature.properties;
  const riskName = labelName(p.label);
  const valid = ymdhmToIso(p.valid);
  const issue = ymdhmToIso(p.issue);
  const expire = ymdhmToIso(p.expire);

  return {
    id: newEventId(),
    source: "SPC",
    sourceEventId: `${p.idp_source}-${p.objectid}-${index}`,
    type: `Day ${day} Convective Outlook`,
    category: "Weather",
    severity: labelSeverity(p.label),
    headline: `SPC Day ${day} ${riskName}`,
    description:
      p.label2 ||
      `${riskName} for severe convective weather in the Day ${day} outlook period.`,
    geometryType: "Polygon",
    latitude: null,
    longitude: null,
    polygon,
    startedAt: valid,
    expiresAt: expire,
    updatedAt: issue,
    url: "https://www.spc.noaa.gov/products/outlook/",
    confidence: "Source reported",
    raw: {
      ...p,
      day,
    } as Record<string, unknown>,
  };
}

async function fetchSpcLayer(
  layer: number,
  day: number,
  lat: number,
  lng: number,
  radiusMiles: number
): Promise<RiskEvent[]> {
  const params = new URLSearchParams({
    where: "1=1",
    outFields: "*",
    returnGeometry: "true",
    f: "geojson",
    outSR: "4326",
  });
  const res = await fetch(`${BASE}/${layer}/query?${params}`);
  if (!res.ok) throw new Error(`SPC API returned ${res.status}`);
  const data: SpcResponse = await res.json();

  return (data.features ?? []).flatMap((feature) =>
    polygonRings(feature)
      .filter(
        (polygon) =>
          polygon.length >= 3 &&
          (pointInPolygon(lng, lat, polygon) ||
            polygonNearLocation(polygon, lat, lng, radiusMiles))
      )
      .map((polygon, index) => normalize(feature, polygon, day, index))
  );
}

export async function fetchSpcOutlooks(
  lat: number,
  lng: number,
  radiusMiles: number
): Promise<RiskEvent[]> {
  const results = await Promise.all(
    DAY_LAYERS.map(({ layer, day }) =>
      fetchSpcLayer(layer, day, lat, lng, radiusMiles)
    )
  );
  return results.flat();
}
