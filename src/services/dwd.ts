import { newEventId } from "../lib/ids";
import { readJsonResponse } from "../lib/http";
import type { ResolvedLocation } from "../types/location";
import type { RiskEvent, Severity } from "../types/riskEvent";

const WFS_BASE = "https://maps.dwd.de/geoserver/dwd/ows";
const WARNING_LAYER = "dwd:Warnungen_Gemeinden_vereinigt";
const WARNING_URL = "https://www.dwd.de/DE/wetter/warnungen_gemeinden/warnWetter_node.html";

type Position = [number, number];
type PolygonCoordinates = Position[][];
type MultiPolygonCoordinates = Position[][][];

export interface DwdWarningProperties {
  IDENTIFIER?: string;
  SENT?: string;
  EVENT?: string;
  SEVERITY?: string;
  EFFECTIVE?: string;
  ONSET?: string;
  EXPIRES?: string;
  HEADLINE?: string;
  DESCRIPTION?: string;
  INSTRUCTION?: string;
  WEB?: string;
  [key: string]: unknown;
}

export interface DwdWarningFeature {
  id?: string;
  type: "Feature";
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: PolygonCoordinates | MultiPolygonCoordinates;
  } | null;
  properties: DwdWarningProperties;
}

interface DwdFeatureCollection {
  type: "FeatureCollection";
  features?: DwdWarningFeature[];
}

function dwdSeverity(value: string | undefined): Severity {
  switch (value?.toLowerCase()) {
    case "extreme":
      return "Extreme";
    case "severe":
      return "Severe";
    case "moderate":
      return "Moderate";
    default:
      return "Minor";
  }
}

function cleanText(...values: Array<string | undefined>): string {
  return values
    .filter((value): value is string => Boolean(value))
    .join(" ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function exteriorRings(feature: DwdWarningFeature): Position[][] {
  if (!feature.geometry) return [];
  if (feature.geometry.type === "Polygon") {
    return [(feature.geometry.coordinates as PolygonCoordinates)[0] ?? []];
  }
  return (feature.geometry.coordinates as MultiPolygonCoordinates)
    .map((polygon) => polygon[0] ?? [])
    .filter((ring) => ring.length > 0);
}

function distanceKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const toRadians = Math.PI / 180;
  const dLat = (latB - latA) * toRadians;
  const dLng = (lngB - lngA) * toRadians;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(latA * toRadians) * Math.cos(latB * toRadians) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInRing(latitude: number, longitude: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [lngI, latI] = ring[i];
    const [lngJ, latJ] = ring[j];
    if (
      (latI > latitude) !== (latJ > latitude) &&
      longitude < ((lngJ - lngI) * (latitude - latI)) / (latJ - latI) + lngI
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function segmentDistanceKm(
  latitude: number,
  longitude: number,
  start: Position,
  end: Position
): number {
  const latitudeScale = 111.32;
  const longitudeScale = latitudeScale * Math.cos(latitude * Math.PI / 180);
  const ax = (start[0] - longitude) * longitudeScale;
  const ay = (start[1] - latitude) * latitudeScale;
  const bx = (end[0] - longitude) * longitudeScale;
  const by = (end[1] - latitude) * latitudeScale;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared));
  return Math.hypot(ax + t * dx, ay + t * dy);
}

export function dwdFeatureMatchesLocation(
  feature: DwdWarningFeature,
  latitude: number,
  longitude: number,
  radiusKm: number
): boolean {
  return exteriorRings(feature).some((ring) => {
    if (pointInRing(latitude, longitude, ring)) return true;
    for (let index = 0; index < ring.length; index += 1) {
      const next = ring[(index + 1) % ring.length];
      if (segmentDistanceKm(latitude, longitude, ring[index], next) <= radiusKm) return true;
    }
    return false;
  });
}

function nearestRing(feature: DwdWarningFeature, latitude: number, longitude: number): Position[] | null {
  const rings = exteriorRings(feature);
  if (rings.length === 0) return null;
  return rings.reduce((nearest, ring) => {
    const ringDistance = Math.min(...ring.map(([lng, lat]) => distanceKm(latitude, longitude, lat, lng)));
    const nearestDistance = Math.min(...nearest.map(([lng, lat]) => distanceKm(latitude, longitude, lat, lng)));
    return ringDistance < nearestDistance ? ring : nearest;
  });
}

export function supportsDwd(location: ResolvedLocation | null): boolean {
  if (!location) return false;
  const country = location.country.trim().toLowerCase();
  return country === "germany" || country === "deutschland" || country === "de" || country === "deu";
}

export function normalizeDwdFeature(
  feature: DwdWarningFeature,
  latitude: number,
  longitude: number
): RiskEvent {
  const properties = feature.properties;
  const startedAt = properties.ONSET ?? properties.EFFECTIVE ?? properties.SENT ?? new Date().toISOString();
  const updatedAt = properties.SENT ?? properties.EFFECTIVE ?? startedAt;
  const headline = properties.HEADLINE ?? properties.EVENT ?? "DWD weather warning";
  const description = cleanText(properties.DESCRIPTION, properties.INSTRUCTION) || headline;
  const ring = nearestRing(feature, latitude, longitude);

  return {
    id: newEventId(),
    source: "DWD",
    sourceEventId: properties.IDENTIFIER ?? feature.id ?? `dwd-${headline}-${startedAt}`,
    type: properties.EVENT ?? "Severe Weather",
    category: "Weather",
    severity: dwdSeverity(properties.SEVERITY),
    headline,
    description: description.slice(0, 1200),
    geometryType: ring ? "Polygon" : "None",
    latitude: null,
    longitude: null,
    polygon: ring,
    startedAt,
    expiresAt: properties.EXPIRES ?? null,
    updatedAt,
    url: properties.WEB ?? WARNING_URL,
    confidence: "Source reported",
    provider: {
      id: "dwd-de",
      label: "Deutscher Wetterdienst",
      authority: "international",
      attributionUrl: "https://www.dwd.de/DE/wetter/warnungen_aktuell/warnlagebericht/warnlagebericht_node.html",
    },
    raw: properties,
  };
}

function requestBounds(latitude: number, longitude: number, radiusKm: number): string {
  const latitudeDelta = radiusKm / 111.32;
  const longitudeDelta = radiusKm / (111.32 * Math.max(0.2, Math.cos(latitude * Math.PI / 180)));
  return [
    longitude - longitudeDelta,
    latitude - latitudeDelta,
    longitude + longitudeDelta,
    latitude + latitudeDelta,
    "EPSG:4326",
  ].join(",");
}

export async function fetchDwdWarnings(
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<RiskEvent[]> {
  const params = new URLSearchParams({
    service: "WFS",
    version: "2.0.0",
    request: "GetFeature",
    typeNames: WARNING_LAYER,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    bbox: requestBounds(latitude, longitude, radiusKm),
  });
  const response = await fetch(`${WFS_BASE}?${params.toString()}`);
  const payload = await readJsonResponse<DwdFeatureCollection>(response, "DWD warnings");
  const matched = (payload.features ?? []).filter((feature) =>
    dwdFeatureMatchesLocation(feature, latitude, longitude, radiusKm)
  );
  const unique = new Map<string, DwdWarningFeature>();
  for (const feature of matched) {
    const key = feature.properties.IDENTIFIER ?? feature.id ?? JSON.stringify(feature.properties);
    if (!unique.has(key)) unique.set(key, feature);
  }
  return [...unique.values()].map((feature) => normalizeDwdFeature(feature, latitude, longitude));
}
