import { newEventId } from "../lib/ids";
import type { SupplementalRiskSignal, SupplementalMetric } from "../types/supplementalRisk";
import type { Severity } from "../types/riskEvent";

const BASE = "https://environment.data.gov.uk/flood-monitoring/id/floods";

interface UkFloodArea {
  notation: string;
  polygon: string;
  county?: string;
}

interface UkFloodItem {
  description: string;
  eaAreaName: string;
  floodArea: UkFloodArea;
  severity: string;
  severityLevel: number;
  message: string;
  timeRaised: string;
  timeMessage?: string;
  timeSeverityChanged?: string;
}

interface UkFloodResponse {
  items: UkFloodItem[];
}

function ukFloodSeverity(level: number): Severity {
  if (level === 1) return "Extreme";
  if (level === 2) return "Severe";
  return "Moderate";
}

export async function fetchUkFloods(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<SupplementalRiskSignal[]> {
  const params = new URLSearchParams({
    lat: lat.toString(),
    long: lng.toString(),
    dist: Math.round(radiusKm).toString(),
  });

  const url = `${BASE}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`UK Flood API returned ${res.status}`);

  const json: UkFloodResponse = await res.json();
  if (!json.items?.length) return [];

  const signals: SupplementalRiskSignal[] = [];

  for (const item of json.items) {
    if (item.severityLevel === 4) continue;
    const sev = ukFloodSeverity(item.severityLevel);
    const metrics: SupplementalMetric[] = [
      { label: "Severity Level", value: item.severityLevel },
    ];

    const polygon: number[][] | null = parseUkFloodPolygon(item.floodArea?.polygon);

    signals.push({
      id: newEventId(),
      source: "UK_EA",
      sourceEventId: `uk-flood-${item.floodArea?.notation ?? item.timeRaised}`,
      category: "River Gauge",
      type: "Flood Warning",
      severity: sev,
      headline: `${item.severity} — ${item.eaAreaName || item.floodArea?.county || "UK"}`,
      description: item.message?.length > 0
        ? item.message.replace(/<[^>]*>/g, "").slice(0, 300)
        : item.description?.slice(0, 300) ?? "UK flood warning in effect.",
      geometry: polygon
        ? { type: "Polygon", polygon }
        : { type: "Point", latitude: lat, longitude: lng },
      startedAt: item.timeRaised,
      expiresAt: null,
      updatedAt: item.timeSeverityChanged ?? item.timeMessage ?? item.timeRaised,
      url: "https://environment.data.gov.uk/flood-monitoring",
      confidence: "Source reported",
      metrics,
      raw: item as unknown as Record<string, unknown>,
    });
  }

  return signals;
}

function parseUkFloodPolygon(wkt: string | undefined): number[][] | null {
  if (!wkt) return null;
  const match = wkt.match(/POLYGON\s*\(\(([^)]+)\)\)/);
  if (!match) return null;
  const points = match[1].split(",").map((pt) => {
    const [lon, lat] = pt.trim().split(/\s+/).map(Number);
    if (isNaN(lat) || isNaN(lon)) return null;
    return [lon, lat] as [number, number];
  });
  return points.every((p) => p !== null) ? (points as number[][]) : null;
}
