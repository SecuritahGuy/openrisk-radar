import { newEventId } from "../lib/ids";
import type { Severity } from "../types/riskEvent";
import type { SupplementalMetric, SupplementalRiskSignal } from "../types/supplementalRisk";

const CURRENT_STORMS_URL = "https://www.nhc.noaa.gov/CurrentStorms.json";

interface NhcCurrentStormsResponse {
  activeStorms?: Array<Record<string, unknown>>;
}

function stringValue(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return null;
}

function numberValue(record: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function parseStormTime(value: string | null): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function mapSeverity(classification: string | null, intensityKt: number | null): Severity {
  const normalized = classification?.toLowerCase() ?? "";
  if (normalized.includes("major") || (intensityKt != null && intensityKt >= 96)) {
    return "Extreme";
  }
  if (normalized.includes("hurricane") || (intensityKt != null && intensityKt >= 64)) {
    return "Severe";
  }
  if (normalized.includes("storm") || (intensityKt != null && intensityKt >= 34)) {
    return "Moderate";
  }
  return "Minor";
}

function normalize(storm: Record<string, unknown>): SupplementalRiskSignal {
  const id = stringValue(storm, ["id", "stormId", "stormid", "stormNumber"]) ?? newEventId();
  const name = stringValue(storm, ["name", "stormName", "stormname"]) ?? "Tropical cyclone";
  const classification = stringValue(storm, ["classification", "stormType", "type"]);
  const basin = stringValue(storm, ["basin", "basinName"]);
  const updatedAt = parseStormTime(
    stringValue(storm, ["lastUpdate", "lastupdate", "lastUpdated", "advisoryDate"])
  );
  const intensityKt = numberValue(storm, ["intensity", "maxWind", "maxwind", "windSpeed"]);
  const pressureMb = numberValue(storm, ["pressure", "minPressure"]);
  const latitude = numberValue(storm, ["latitude", "lat"]);
  const longitude = numberValue(storm, ["longitude", "lon", "lng"]);
  const url =
    stringValue(storm, ["publicAdvisory", "url", "link"]) ??
    "https://www.nhc.noaa.gov/";

  const metrics: SupplementalMetric[] = [
    ...(classification ? [{ label: "Classification", value: classification }] : []),
    ...(basin ? [{ label: "Basin", value: basin }] : []),
    ...(intensityKt != null ? [{ label: "Max wind", value: intensityKt, unit: "kt" }] : []),
    ...(pressureMb != null ? [{ label: "Pressure", value: pressureMb, unit: "mb" }] : []),
  ];

  return {
    id: newEventId(),
    source: "NHC",
    sourceEventId: id,
    category: "Tropical Cyclone",
    type: classification ?? "Tropical Cyclone",
    severity: mapSeverity(classification, intensityKt),
    headline: classification ? `${name} - ${classification}` : name,
    description: `National Hurricane Center active storm${basin ? ` in ${basin}` : ""}.`,
    geometry:
      latitude != null && longitude != null
        ? { type: "Point", latitude, longitude }
        : { type: "None" },
    startedAt: updatedAt,
    expiresAt: null,
    updatedAt,
    url,
    confidence: "Source reported",
    metrics,
    raw: storm,
  };
}

export async function fetchNhcActiveStorms(): Promise<SupplementalRiskSignal[]> {
  const res = await fetch(CURRENT_STORMS_URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`NHC current storms feed returned ${res.status}`);

  const data: NhcCurrentStormsResponse = await res.json();
  return (data.activeStorms ?? []).map(normalize);
}
