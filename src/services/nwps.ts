import { newEventId } from "../lib/ids";
import type { Severity } from "../types/riskEvent";
import type { SupplementalMetric, SupplementalRiskSignal } from "../types/supplementalRisk";

const NWPS_BASE = "https://api.water.noaa.gov/nwps/v1";
const NWPS_PROXY = "/api/noaa/nwps";

interface NwpsGaugeStatus {
  primary: number;
  primaryUnit: string;
  secondary: number;
  secondaryUnit: string;
  floodCategory: string;
  validTime: string;
}

interface NwpsGauge {
  lid: string;
  name: string;
  latitude: number;
  longitude: number;
  pedts?: {
    observed?: string;
    forecast?: string;
  };
  status?: {
    observed?: NwpsGaugeStatus;
    forecast?: NwpsGaugeStatus;
  };
  rfc?: {
    abbreviation?: string;
    name?: string;
  };
  wfo?: {
    abbreviation?: string;
    name?: string;
  };
  state?: {
    abbreviation?: string;
    name?: string;
  };
}

interface NwpsGaugeListResponse {
  gauges?: NwpsGauge[];
}

interface NwpsStageflowDatum {
  validTime: string;
  generatedTime?: string;
  primary: number;
  secondary: number;
}

interface NwpsStageflow {
  issuedTime?: string;
  primaryName?: string;
  primaryUnits?: string;
  secondaryName?: string;
  secondaryUnits?: string;
  data?: NwpsStageflowDatum[];
}

interface NwpsStageflowResponse {
  forecast?: NwpsStageflow;
}

interface ForecastCandidate {
  gauge: NwpsGauge;
  stageflow: NwpsStageflow | null;
}

function bbox(lat: number, lng: number, radiusKm: number): string {
  const kmPerDeg = 111.32;
  const latDelta = radiusKm / kmPerDeg;
  const lngDelta = radiusKm / (kmPerDeg * Math.cos((lat * Math.PI) / 180));
  return [
    lng - lngDelta,
    lat - latDelta,
    lng + lngDelta,
    lat + latDelta,
  ].map((value) => value.toFixed(5)).join(",");
}

function distanceKm(lat: number, lng: number, gauge: NwpsGauge): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(gauge.latitude - lat);
  const dLng = toRad(gauge.longitude - lng);
  const lat1 = toRad(lat);
  const lat2 = toRad(gauge.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function floodSeverity(category: string): Severity {
  switch (category) {
    case "major":
      return "Extreme";
    case "moderate":
      return "Severe";
    case "minor":
      return "Moderate";
    case "action":
      return "Minor";
    default:
      return "Minor";
  }
}

function floodLabel(category: string): string {
  switch (category) {
    case "major":
      return "Major flooding forecast";
    case "moderate":
      return "Moderate flooding forecast";
    case "minor":
      return "Minor flooding forecast";
    case "action":
      return "Action stage forecast";
    default:
      return "Forecast available";
  }
}

function isElevatedForecast(category: string): boolean {
  return category === "action" || category === "minor" || category === "moderate" || category === "major";
}

async function fetchJson<T>(url: string): Promise<T> {
  const endpoint = import.meta.env.PROD
    ? `${NWPS_PROXY}?path=${encodeURIComponent(url.slice(NWPS_BASE.length))}`
    : url;
  const res = await fetch(endpoint, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`NWPS API returned ${res.status}`);
  return res.json() as Promise<T>;
}

async function fetchStageflow(lid: string): Promise<NwpsStageflow | null> {
  const data = await fetchJson<NwpsStageflowResponse>(
    `${NWPS_BASE}/gauges/${encodeURIComponent(lid)}/stageflow`
  );
  return data.forecast ?? null;
}

function maxForecast(stageflow: NwpsStageflow | null): NwpsStageflowDatum | null {
  const data = stageflow?.data ?? [];
  return data.reduce<NwpsStageflowDatum | null>((max, datum) => {
    if (!Number.isFinite(datum.primary)) return max;
    if (!max || datum.primary > max.primary) return datum;
    return max;
  }, null);
}

function toSignal(candidate: ForecastCandidate, locationName?: string): SupplementalRiskSignal {
  const { gauge, stageflow } = candidate;
  const forecast = gauge.status?.forecast;
  const observed = gauge.status?.observed;
  const category = forecast?.floodCategory ?? "unknown";
  const max = maxForecast(stageflow);
  const primaryUnit = forecast?.primaryUnit || stageflow?.primaryUnits || "";
  const secondaryUnit = forecast?.secondaryUnit || stageflow?.secondaryUnits || "";
  const metrics: SupplementalMetric[] = [];

  if (forecast && Number.isFinite(forecast.primary) && forecast.primary > -900) {
    metrics.push({ label: "Forecast Stage", value: forecast.primary, unit: forecast.primaryUnit });
  }
  if (max && Number.isFinite(max.primary) && max.primary > -900) {
    metrics.push({ label: "Peak Forecast", value: max.primary, unit: primaryUnit });
  }
  if (forecast && Number.isFinite(forecast.secondary) && forecast.secondary > -900) {
    metrics.push({ label: "Forecast Flow", value: forecast.secondary, unit: secondaryUnit });
  }
  if (observed && Number.isFinite(observed.primary) && observed.primary > -900) {
    metrics.push({ label: "Observed Stage", value: observed.primary, unit: observed.primaryUnit });
  }

  const locationText = locationName ? ` near ${locationName}` : "";
  const headline = `${gauge.name}: ${floodLabel(category)}`;
  const peakText = max
    ? ` Peak forecast ${max.primary.toLocaleString()}${primaryUnit ? ` ${primaryUnit}` : ""} around ${new Date(max.validTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric" })}.`
    : "";

  return {
    id: newEventId(),
    source: "NWPS",
    sourceEventId: `nwps-${gauge.lid}`,
    category: "River Gauge",
    type: "River Forecast",
    severity: floodSeverity(category),
    headline,
    description: `NWPS river forecast for ${gauge.name}${locationText}.${peakText}`,
    geometry: { type: "Point", latitude: gauge.latitude, longitude: gauge.longitude },
    startedAt: forecast?.validTime ?? stageflow?.issuedTime ?? new Date().toISOString(),
    expiresAt: null,
    updatedAt: forecast?.validTime ?? stageflow?.issuedTime ?? new Date().toISOString(),
    url: `https://water.noaa.gov/gauges/${encodeURIComponent(gauge.lid)}`,
    confidence: "Source reported",
    metrics,
    raw: {
      siteId: gauge.lid,
      siteName: gauge.name,
      rfc: gauge.rfc,
      wfo: gauge.wfo,
      state: gauge.state,
      forecastStatus: forecast,
      observedStatus: observed,
      peakForecast: max,
      forecastSeries: stageflow?.data?.slice(0, 20) ?? [],
    } as unknown as Record<string, unknown>,
  };
}

export async function fetchNwpsRiverForecasts(
  lat: number,
  lng: number,
  radiusKm: number,
  locationName?: string
): Promise<SupplementalRiskSignal[]> {
  const [xmin, ymin, xmax, ymax] = bbox(lat, lng, radiusKm).split(",");
  const params = new URLSearchParams({
    "bbox.xmin": xmin,
    "bbox.ymin": ymin,
    "bbox.xmax": xmax,
    "bbox.ymax": ymax,
    srid: "4326",
  });
  const data = await fetchJson<NwpsGaugeListResponse>(`${NWPS_BASE}/gauges?${params}`);
  const gauges = (data.gauges ?? [])
    .filter((gauge) => gauge.pedts?.forecast && gauge.status?.forecast)
    .sort((a, b) => distanceKm(lat, lng, a) - distanceKm(lat, lng, b))
    .slice(0, 20);

  const elevated = gauges.filter((gauge) =>
    isElevatedForecast(gauge.status?.forecast?.floodCategory ?? "")
  );
  if (elevated.length === 0) return [];

  const candidates = await Promise.allSettled(
    elevated.slice(0, 8).map(async (gauge) => ({
      gauge,
      stageflow: await fetchStageflow(gauge.lid).catch(() => null),
    }))
  );

  return candidates
    .filter((result): result is PromiseFulfilledResult<ForecastCandidate> => result.status === "fulfilled")
    .map((result) => toSignal(result.value, locationName))
    .sort((a, b) => {
      const order: Severity[] = ["Extreme", "Severe", "Moderate", "Minor"];
      return order.indexOf(a.severity) - order.indexOf(b.severity);
    });
}
