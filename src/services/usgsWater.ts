import { newEventId } from "../lib/ids";
import type { Severity } from "../types/riskEvent";
import type { SupplementalRiskSignal, SupplementalMetric } from "../types/supplementalRisk";

const WATER_API = "https://api.waterdata.usgs.gov/ogcapi/v0/collections";

interface WaterDataFeature {
  type: "Feature";
  properties: {
    time_series_id: string;
    monitoring_location_id: string;
    parameter_code: string;
    statistic_id: string;
    time: string;
    value: string;
    unit_of_measure: string;
    approval_status: string;
    qualifier: string | null;
    last_modified: string;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number];
  } | null;
}

interface WaterDataResponse {
  type: "FeatureCollection";
  features: WaterDataFeature[];
  numberReturned: number;
  links: Record<string, unknown>[];
}

interface MonitoringLocation {
  id: string;
  monitoring_location_name: string;
  site_type_code: string;
  site_type: string;
  county_name: string;
  state_name: string;
  altitude: number | null;
}

interface MonitoringLocationFeature {
  type: "Feature";
  properties: MonitoringLocation;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
}

interface MonitoringLocationResponse {
  type: "FeatureCollection";
  features: MonitoringLocationFeature[];
}

const PARAM_CODES: Record<string, { label: string; unit: string }> = {
  "00060": { label: "Discharge", unit: "ft³/s" },
  "00065": { label: "Gauge Height", unit: "ft" },
  "00010": { label: "Water Temperature", unit: "°C" },
  "00045": { label: "Precipitation", unit: "in" },
  "00400": { label: "pH", unit: "pH" },
  "00095": { label: "Specific Conductance", unit: "µS/cm" },
  "00300": { label: "Dissolved Oxygen", unit: "mg/L" },
  "63680": { label: "Turbidity", unit: "FNU" },
};

export function paramInfo(code: string): { label: string; unit: string } {
  return PARAM_CODES[code] ?? { label: `Param ${code}`, unit: "" };
}

function dischargeSeverity(cfs: number): Severity {
  if (cfs >= 100000) return "Extreme";
  if (cfs >= 50000) return "Severe";
  if (cfs >= 10000) return "Moderate";
  return "Minor";
}

function distanceKm(
  lat: number,
  lng: number,
  feature: MonitoringLocationFeature
): number {
  const [siteLng, siteLat] = feature.geometry.coordinates;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(siteLat - lat);
  const dLng = toRad(siteLng - lng);
  const lat1 = toRad(lat);
  const lat2 = toRad(siteLat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchLatestReadings(siteId: string): Promise<WaterDataFeature[]> {
  const url = `${WATER_API}/latest-continuous/items?monitoring_location_id=${encodeURIComponent(siteId)}&limit=10`;
  const res = await fetch(url);
  if (!res.ok) return [];

  const json: WaterDataResponse = await res.json();
  return json.features ?? [];
}

export async function fetchNearbyMonitoringLocations(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<MonitoringLocationFeature[]> {
  const kmPerDeg = 111.32;
  const latDelta = radiusKm / kmPerDeg;
  const lngDelta = radiusKm / (kmPerDeg * Math.cos((lat * Math.PI) / 180));

  const west = lng - lngDelta;
  const south = lat - latDelta;
  const east = lng + lngDelta;
  const north = lat + latDelta;

  const url = `${WATER_API}/monitoring-locations/items?bbox=${west},${south},${east},${north}&limit=50`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`USGS Water monitoring locations API returned ${res.status}`);

  const json: MonitoringLocationResponse = await res.json();
  return json.features ?? [];
}

export async function fetchRiverConditions(
  lat: number,
  lng: number,
  radiusKm: number,
  locationName?: string
): Promise<SupplementalRiskSignal[]> {
  const locations = await fetchNearbyMonitoringLocations(lat, lng, radiusKm);
  const streamSites = locations.filter(
    (f) => f.properties.site_type_code === "ST" || f.properties.site_type_code === "ST-CA"
  ).sort((a, b) => distanceKm(lat, lng, a) - distanceKm(lat, lng, b));

  if (streamSites.length === 0) return [];

  const results = await Promise.allSettled(
    streamSites.slice(0, 20).map(async (site) => ({
      site,
      readings: await fetchLatestReadings(site.properties.id),
    }))
  );

  const signals: SupplementalRiskSignal[] = [];

  results.forEach((result) => {
    if (result.status !== "fulfilled") return;

    const { site, readings } = result.value;
    if (readings.length === 0) return;

    const info = site.properties;
    const siteId = info.id;

    const discharge = readings.find((r) => r.properties.parameter_code === "00060");
    const gaugeHeight = readings.find((r) => r.properties.parameter_code === "00065");
    const waterTemp = readings.find((r) => r.properties.parameter_code === "00010");

    const dischargeVal = discharge ? parseFloat(discharge.properties.value) : null;
    const heightVal = gaugeHeight ? parseFloat(gaugeHeight.properties.value) : null;
    const tempVal = waterTemp ? parseFloat(waterTemp.properties.value) : null;

    const sev = dischargeVal ? dischargeSeverity(dischargeVal) : "Minor";

    const metrics: SupplementalMetric[] = [];
    if (dischargeVal != null) {
      metrics.push({ label: "Discharge", value: dischargeVal, unit: "ft³/s" });
    }
    if (heightVal != null) {
      metrics.push({ label: "Gauge Height", value: heightVal, unit: "ft" });
    }
    if (tempVal != null) {
      metrics.push({ label: "Water Temp", value: tempVal, unit: "°C" });
    }

    const coordinates =
      readings.find((r) => r.geometry)?.geometry?.coordinates ??
      site.geometry.coordinates;
    const siteName = info.monitoring_location_name || siteId;
    const locationText = locationName || `${lat.toFixed(2)}, ${lng.toFixed(2)}`;

    const signal: SupplementalRiskSignal = {
      id: newEventId(),
      source: "USGS_WATER",
      sourceEventId: `usgs-water-${siteId}`,
      category: "River Gauge",
      type: "River Conditions",
      severity: sev,
      headline: `${siteName}: ${dischargeVal != null ? `${dischargeVal.toLocaleString()} ft³/s` : heightVal != null ? `${heightVal.toFixed(2)} ft` : "Active"}`,
      description: `River conditions at ${siteName} near ${locationText}. ${info.county_name ? `${info.county_name} County, ${info.state_name}.` : ""}`,
      geometry: coordinates
        ? { type: "Point", latitude: coordinates[1], longitude: coordinates[0] }
        : { type: "Point", latitude: lat, longitude: lng },
      startedAt: discharge?.properties.time ?? gaugeHeight?.properties.time ?? new Date().toISOString(),
      expiresAt: null,
      updatedAt: new Date().toISOString(),
      url: `https://waterdata.usgs.gov/monitoring-location/${siteId}`,
      confidence: "Source reported",
      metrics,
      raw: { siteId, siteName, readings: readings.map((r) => r.properties) } as unknown as Record<string, unknown>,
    };

    signals.push(signal);
  });

  signals.sort((a, b) => {
    const order = ["Extreme", "Severe", "Moderate", "Minor"];
    return order.indexOf(a.severity) - order.indexOf(b.severity);
  });

  return signals.slice(0, 10);
}

export async function fetchUsgsWaterObservations(
  lat: number,
  lng: number,
  radiusKm: number,
  limit = 8
): Promise<SupplementalRiskSignal[]> {
  const signals = await fetchRiverConditions(lat, lng, radiusKm);
  return signals.slice(0, limit);
}
