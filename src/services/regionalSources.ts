import { newEventId } from "../lib/ids";
import { readJsonResponse } from "../lib/http";
import type { EventProvider, RiskEvent, Severity } from "../types/riskEvent";

const CAL_FIRE_PROXY = "/api/regional/cal-fire";
const FL_FIRE = "https://services3.arcgis.com/XYg2eF8UuxZVuVmF/ArcGIS/rest/services/Florida_Forest_Service_-_Active_Wildfires/FeatureServer/0/query";
const OR_EVACUATION = "https://services.arcgis.com/uUvqNMGPm7axC2dD/ArcGIS/rest/services/Fire_Evacuation_Areas_Public/FeatureServer/0/query";
const NY_HABS = "https://services6.arcgis.com/DZHaqZm9cxOD4CWM/ArcGIS/rest/services/Current_HAB_Reports_7_3_19/FeatureServer/0/query";
const WI_BEACHES = "https://dnrmaps.wi.gov/arcgis2/rest/services/OGW_Beach_Monitoring/BEACH_MONITORING_LOCATIONS/MapServer/1/query";

export const REGIONAL_SOURCE_STATES = ["CA", "FL", "OR", "NY", "WI"] as const;

type RegionalState = (typeof REGIONAL_SOURCE_STATES)[number];

interface CalFireIncident {
  Name?: string;
  Updated?: string;
  Started?: string;
  AdminUnit?: string;
  County?: string;
  AcresBurned?: number;
  PercentContained?: number;
  Longitude?: number;
  Latitude?: number;
  Type?: string;
  UniqueId?: string;
  Url?: string;
  ConditionStatement?: string;
}

interface GeoJsonFeature {
  id?: string | number;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  } | null;
  properties?: Record<string, unknown>;
}

interface GeoJsonResponse {
  type?: string;
  features?: GeoJsonFeature[];
  error?: { message?: string };
}

export interface RegionalFeedResult {
  state: string;
  providers: EventProvider[];
  events: RiskEvent[];
}

const PROVIDERS: Record<RegionalState, EventProvider> = {
  CA: {
    id: "ca-cal-fire",
    label: "CAL FIRE",
    authority: "state",
    attributionUrl: "https://www.fire.ca.gov/incidents/",
  },
  FL: {
    id: "fl-forest-service",
    label: "Florida Forest Service",
    authority: "state",
    attributionUrl: "https://www.fdacs.gov/Forest-Wildfire",
  },
  OR: {
    id: "or-oem-evacuations",
    label: "Oregon Department of Emergency Management",
    authority: "state",
    attributionUrl: "https://oregon-oem-geo.hub.arcgis.com/",
  },
  NY: {
    id: "ny-dec-habs",
    label: "New York State DEC",
    authority: "state",
    attributionUrl: "https://dec.ny.gov/environmental-protection/water/water-quality/harmful-algal-blooms",
  },
  WI: {
    id: "wi-dnr-beaches",
    label: "Wisconsin DNR Beach Health",
    authority: "state",
    attributionUrl: "https://dnr.wisconsin.gov/topic/Beaches",
  },
};

function isRegionalState(state: string): state is RegionalState {
  return REGIONAL_SOURCE_STATES.includes(state.toUpperCase() as RegionalState);
}

export function supportsRegionalSources(state: string | null | undefined): boolean {
  return !!state && isRegionalState(state);
}

function numberValue(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function stringValue(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim();
}

function dateValue(value: unknown, fallback = new Date().toISOString()): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value).getTime();
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return fallback;
}

function distanceKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function pointInPolygon(latitude: number, longitude: number, polygon: number[][]): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [x, y] = polygon[index];
    const [previousX, previousY] = polygon[previous];
    const intersects =
      y > latitude !== previousY > latitude &&
      longitude < ((previousX - x) * (latitude - y)) / (previousY - y || Number.EPSILON) + x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function polygonNear(latitude: number, longitude: number, polygon: number[][], radiusKm: number): boolean {
  if (pointInPolygon(latitude, longitude, polygon)) return true;
  return polygon.some(([lng, lat]) => distanceKm(latitude, longitude, lat, lng) <= radiusKm);
}

function ringsFromGeometry(feature: GeoJsonFeature): number[][][] {
  const geometry = feature.geometry;
  if (!geometry?.coordinates) return [];
  if (geometry.type === "Polygon" && Array.isArray(geometry.coordinates)) {
    return geometry.coordinates as number[][][];
  }
  if (geometry.type === "MultiPolygon" && Array.isArray(geometry.coordinates)) {
    return (geometry.coordinates as number[][][][]).flat();
  }
  return [];
}

function primaryRing(feature: GeoJsonFeature): number[][] | null {
  const rings = ringsFromGeometry(feature)
    .filter((ring) => ring.length >= 3)
    .sort((a, b) => b.length - a.length);
  return rings[0] ?? null;
}

function pointFromFeature(feature: GeoJsonFeature): [number, number] | null {
  if (feature.geometry?.type !== "Point" || !Array.isArray(feature.geometry.coordinates)) return null;
  const [longitude, latitude] = feature.geometry.coordinates as number[];
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  return [longitude, latitude];
}

function polygonCenter(polygon: number[][]): [number, number] {
  const totals = polygon.reduce(
    (sum, [longitude, latitude]) => [sum[0] + longitude, sum[1] + latitude] as [number, number],
    [0, 0] as [number, number]
  );
  return [totals[0] / polygon.length, totals[1] / polygon.length];
}

function bbox(latitude: number, longitude: number, radiusKm: number): string {
  const latDelta = radiusKm / 111.32;
  const lngScale = Math.max(0.1, Math.cos((latitude * Math.PI) / 180));
  const lngDelta = radiusKm / (111.32 * lngScale);
  return [longitude - lngDelta, latitude - latDelta, longitude + lngDelta, latitude + latDelta].join(",");
}

function arcGisUrl(
  endpoint: string,
  where: string,
  latitude: number,
  longitude: number,
  radiusKm: number
): string {
  const params = new URLSearchParams({
    where,
    outFields: "*",
    returnGeometry: "true",
    outSR: "4326",
    f: "geojson",
    geometry: bbox(latitude, longitude, radiusKm),
    geometryType: "esriGeometryEnvelope",
    inSR: "4326",
    spatialRel: "esriSpatialRelIntersects",
    resultRecordCount: "500",
  });
  return `${endpoint}?${params}`;
}

async function fetchGeoJson(url: string, label: string): Promise<GeoJsonFeature[]> {
  const response = await fetch(url);
  const data = await readJsonResponse<GeoJsonResponse>(response, label);
  if (data.error) throw new Error(`${label}: ${data.error.message ?? "ArcGIS query failed"}`);
  return data.features ?? [];
}

function wildfireSeverity(acres: number, containment: number | null): Severity {
  if (acres >= 100_000 || (acres >= 10_000 && (containment ?? 0) < 25)) return "Extreme";
  if (acres >= 10_000 || (acres >= 1_000 && (containment ?? 0) < 25)) return "Severe";
  if (acres >= 1_000 || (acres >= 100 && (containment ?? 0) < 50)) return "Moderate";
  return "Minor";
}

export function normalizeCalFire(incident: CalFireIncident): RiskEvent | null {
  const latitude = numberValue(incident.Latitude);
  const longitude = numberValue(incident.Longitude);
  if (latitude == null || longitude == null) return null;
  const acres = numberValue(incident.AcresBurned) ?? 0;
  const containment = numberValue(incident.PercentContained);
  const updatedAt = dateValue(incident.Updated ?? incident.Started);
  const name = incident.Name?.trim() || "California wildfire";
  return {
    id: newEventId(),
    source: "REGIONAL",
    sourceEventId: incident.UniqueId ?? `cal-fire-${name}-${incident.Started ?? updatedAt}`,
    type: incident.Type ?? "Wildfire",
    category: "Wildfire",
    severity: wildfireSeverity(acres, containment),
    headline: `${name} — ${acres.toLocaleString()} acres`,
    description: [
      `${name} in ${incident.County ?? "California"}.`,
      `${acres.toLocaleString()} acres burned.`,
      containment == null ? "Containment not reported." : `${containment}% contained.`,
      incident.AdminUnit ? `Managed by ${incident.AdminUnit}.` : "",
      incident.ConditionStatement ?? "",
    ].filter(Boolean).join(" "),
    geometryType: "Point",
    latitude,
    longitude,
    polygon: null,
    startedAt: dateValue(incident.Started, updatedAt),
    expiresAt: null,
    updatedAt,
    url: incident.Url ?? PROVIDERS.CA.attributionUrl,
    confidence: "Source reported",
    provider: PROVIDERS.CA,
    raw: incident as unknown as Record<string, unknown>,
  };
}

export function normalizeFloridaWildfire(feature: GeoJsonFeature): RiskEvent | null {
  const point = pointFromFeature(feature);
  const properties = feature.properties ?? {};
  if (!point) return null;
  const acres = numberValue(properties.Size) ?? 0;
  const containment = numberValue(properties.Contained);
  const status = stringValue(properties.Status) ?? "Active";
  if (/contained|out/i.test(status) || (containment ?? 0) >= 100) return null;
  const updatedAt = dateValue(properties.StatusUpdatedTimestamp);
  const name = stringValue(properties.Name) ?? "Florida wildfire";
  return {
    id: newEventId(),
    source: "REGIONAL",
    sourceEventId: stringValue(properties.GlobalID) ?? String(feature.id ?? properties.ObjectId ?? name),
    type: stringValue(properties.Category) ?? "Wildfire",
    category: "Wildfire",
    severity: wildfireSeverity(acres, containment),
    headline: `${name} — ${acres.toLocaleString()} acres`,
    description: [
      `${status} wildfire in ${stringValue(properties.AdminDivision) ?? "Florida"}.`,
      `${acres.toLocaleString()} acres.`,
      containment == null ? "Containment not reported." : `${containment}% contained.`,
      stringValue(properties.protectingunit) ? `Protecting unit: ${stringValue(properties.protectingunit)}.` : "",
    ].filter(Boolean).join(" "),
    geometryType: "Point",
    latitude: point[1],
    longitude: point[0],
    polygon: null,
    startedAt: updatedAt,
    expiresAt: null,
    updatedAt,
    url: PROVIDERS.FL.attributionUrl,
    confidence: "Source reported",
    provider: PROVIDERS.FL,
    raw: { ...properties, geometry: feature.geometry },
  };
}

export function normalizeOregonEvacuation(feature: GeoJsonFeature): RiskEvent | null {
  const polygon = primaryRing(feature);
  const properties = feature.properties ?? {};
  if (!polygon) return null;
  const level = numberValue(properties.Fire_Evacuation_Level) ?? 1;
  const levelLabel = level >= 3 ? "GO" : level >= 2 ? "SET" : "READY";
  const severity: Severity = level >= 3 ? "Extreme" : level >= 2 ? "Severe" : "Moderate";
  const fireName = stringValue(properties.Fire_Name) ?? stringValue(properties.HazardType) ?? "Emergency";
  const updatedAt = dateValue(properties.last_edited_date ?? properties.created_date);
  const center = polygonCenter(polygon);
  const population = numberValue(properties.PopulationWithin);
  const structures = numberValue(properties.StructuresWithin);
  return {
    id: newEventId(),
    source: "REGIONAL",
    sourceEventId: stringValue(properties.GlobalID) ?? String(feature.id ?? properties.OBJECTID ?? fireName),
    type: "Evacuation Zone",
    category: "Disaster",
    severity,
    headline: `${levelLabel} evacuation — ${fireName}`,
    description: [
      `Level ${Math.min(3, Math.max(1, level))} (${levelLabel}) evacuation area in ${stringValue(properties.County) ?? "Oregon"}.`,
      population == null ? "" : `Estimated population within: ${population.toLocaleString()}.`,
      structures == null ? "" : `Structures within: ${structures.toLocaleString()}.`,
    ].filter(Boolean).join(" "),
    geometryType: "Polygon",
    latitude: center[1],
    longitude: center[0],
    polygon,
    startedAt: dateValue(properties.created_date, updatedAt),
    expiresAt: null,
    updatedAt,
    url: PROVIDERS.OR.attributionUrl,
    confidence: "Source reported",
    provider: PROVIDERS.OR,
    raw: { ...properties, geometry: feature.geometry },
  };
}

export function normalizeNyHab(feature: GeoJsonFeature): RiskEvent | null {
  const point = pointFromFeature(feature);
  const properties = feature.properties ?? {};
  if (!point) return null;
  const status = stringValue(properties.HAB_STATUS) ?? "Reported";
  const water = stringValue(properties.water_name) ?? "New York waterbody";
  const updatedAt = dateValue(properties.date_time);
  return {
    id: newEventId(),
    source: "REGIONAL",
    sourceEventId: stringValue(properties.globalid) ?? String(feature.id ?? properties.objectid ?? water),
    type: "Harmful Algal Bloom",
    category: "Coastal Water",
    severity: /confirmed/i.test(status) ? "Moderate" : "Minor",
    headline: `${status} harmful algal bloom — ${water}`,
    description: [
      `${status} harmful algal bloom report at ${water}.`,
      stringValue(properties.county) ? `County: ${stringValue(properties.county)}.` : "",
      stringValue(properties.extent_bloom) ? `Extent: ${stringValue(properties.extent_bloom)}.` : "",
    ].filter(Boolean).join(" "),
    geometryType: "Point",
    latitude: point[1],
    longitude: point[0],
    polygon: null,
    startedAt: updatedAt,
    expiresAt: null,
    updatedAt,
    url: PROVIDERS.NY.attributionUrl,
    confidence: "Source reported",
    provider: PROVIDERS.NY,
    raw: { ...properties, geometry: feature.geometry },
  };
}

export function normalizeWisconsinBeach(feature: GeoJsonFeature): RiskEvent | null {
  const point = pointFromFeature(feature);
  const properties = feature.properties ?? {};
  if (!point) return null;
  const status = stringValue(properties.MAP_STATUS) ?? "Unknown";
  if (/^open$/i.test(status)) return null;
  const beach = stringValue(properties.OGW_BEACH_NAME_TEXT) ?? "Wisconsin beach";
  const updatedAt = dateValue(properties.SAMPLEDATE);
  return {
    id: newEventId(),
    source: "REGIONAL",
    sourceEventId: `wi-beach-${String(properties.BEACH_SEQ_NO ?? properties.OBJECTID ?? beach)}`,
    type: "Beach Advisory",
    category: "Coastal Water",
    severity: /closed/i.test(status) ? "Severe" : "Moderate",
    headline: `${status} — ${beach}`,
    description: [
      `${beach} is listed as ${status.toLowerCase()} by Wisconsin DNR.`,
      stringValue(properties.ECOLIVALUE) ? `E. coli: ${stringValue(properties.ECOLIVALUE)}.` : "",
      stringValue(properties.WATERTEMP) ? `Water temperature: ${stringValue(properties.WATERTEMP)}.` : "",
      stringValue(properties.ISSUED) ? `Issued: ${stringValue(properties.ISSUED)}.` : "",
    ].filter(Boolean).join(" "),
    geometryType: "Point",
    latitude: point[1],
    longitude: point[0],
    polygon: null,
    startedAt: updatedAt,
    expiresAt: null,
    updatedAt,
    url: PROVIDERS.WI.attributionUrl,
    confidence: "Source reported",
    provider: PROVIDERS.WI,
    raw: { ...properties, geometry: feature.geometry },
  };
}

async function fetchCalifornia(latitude: number, longitude: number, radiusKm: number): Promise<RiskEvent[]> {
  const response = await fetch(CAL_FIRE_PROXY);
  const data = await readJsonResponse<CalFireIncident[]>(response, "CAL FIRE");
  return data
    .map(normalizeCalFire)
    .filter((event): event is RiskEvent => !!event)
    .filter((event) => distanceKm(latitude, longitude, event.latitude!, event.longitude!) <= radiusKm);
}

async function fetchFlorida(latitude: number, longitude: number, radiusKm: number): Promise<RiskEvent[]> {
  const features = await fetchGeoJson(
    arcGisUrl(FL_FIRE, "Status <> 'Contained'", latitude, longitude, radiusKm),
    "Florida Forest Service"
  );
  return features
    .map(normalizeFloridaWildfire)
    .filter((event): event is RiskEvent => !!event)
    .filter((event) => distanceKm(latitude, longitude, event.latitude!, event.longitude!) <= radiusKm);
}

async function fetchOregon(latitude: number, longitude: number, radiusKm: number): Promise<RiskEvent[]> {
  const features = await fetchGeoJson(
    arcGisUrl(OR_EVACUATION, "Fire_Evacuation_Level >= 1", latitude, longitude, radiusKm),
    "Oregon Evacuation Areas"
  );
  return features
    .map(normalizeOregonEvacuation)
    .filter((event): event is RiskEvent => !!event)
    .filter((event) => polygonNear(latitude, longitude, event.polygon!, radiusKm));
}

async function fetchNewYork(latitude: number, longitude: number, radiusKm: number): Promise<RiskEvent[]> {
  const features = await fetchGeoJson(
    arcGisUrl(NY_HABS, "HAB_STATUS IN ('Confirmed','Suspected')", latitude, longitude, radiusKm),
    "New York DEC HABs"
  );
  return features
    .map(normalizeNyHab)
    .filter((event): event is RiskEvent => !!event)
    .filter((event) => distanceKm(latitude, longitude, event.latitude!, event.longitude!) <= radiusKm);
}

async function fetchWisconsin(latitude: number, longitude: number, radiusKm: number): Promise<RiskEvent[]> {
  const features = await fetchGeoJson(
    arcGisUrl(WI_BEACHES, "MAP_STATUS <> 'Open'", latitude, longitude, radiusKm),
    "Wisconsin DNR Beaches"
  );
  return features
    .map(normalizeWisconsinBeach)
    .filter((event): event is RiskEvent => !!event)
    .filter((event) => distanceKm(latitude, longitude, event.latitude!, event.longitude!) <= radiusKm);
}

export async function fetchRegionalEvents(
  state: string,
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<RegionalFeedResult> {
  const normalizedState = state.toUpperCase();
  if (!isRegionalState(normalizedState)) {
    return { state: normalizedState, providers: [], events: [] };
  }

  const fetcher: Record<RegionalState, () => Promise<RiskEvent[]>> = {
    CA: () => fetchCalifornia(latitude, longitude, radiusKm),
    FL: () => fetchFlorida(latitude, longitude, radiusKm),
    OR: () => fetchOregon(latitude, longitude, radiusKm),
    NY: () => fetchNewYork(latitude, longitude, radiusKm),
    WI: () => fetchWisconsin(latitude, longitude, radiusKm),
  };

  return {
    state: normalizedState,
    providers: [PROVIDERS[normalizedState]],
    events: await fetcher[normalizedState](),
  };
}
