import { newEventId } from "../lib/ids";
import type { Severity } from "../types/riskEvent";
import type { SupplementalRiskSignal, SupplementalMetric } from "../types/supplementalRisk";

const GEOJSON_URL = "https://volcanoes.usgs.gov/vsc/api/volcanoApi/geojson";
const ELEVATED_URL = "https://volcanoes.usgs.gov/vsc/api/volcanoApi/elevated";

interface VolcanoGeoProperties {
  volcanoName: string;
  vnum: string;
  volcanoCd: string;
  volcanoUrl: string;
  region: string;
  obs: string;
  alertLevel: string;
  colorCode: string;
  nvewsThreat: string;
  noticeId: string | null;
  noticeSynopsis: string | null;
  noticeUrl: string | null;
  alertDate: string | null;
  colorDate: string | null;
}

interface VolcanoGeoFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: VolcanoGeoProperties;
}

interface VolcanoGeoResponse {
  type: "FeatureCollection";
  features: VolcanoGeoFeature[];
}

export interface VolcanoElevated {
  vName: string;
  vnum: string;
  volcanoCd: string;
  obs: string;
  lat: number;
  long: number;
  alertLevel: string;
  colorCode: string;
  alertLevelPrev: string;
  colorCodePrev: string;
  nvewsThreat: string;
  noticeSynopsis: string;
  noticeUrl: string;
  alertDate: string;
}

const ALERT_SEVERITY: Record<string, Severity> = {
  WARNING: "Extreme",
  WATCH: "Severe",
  ADVISORY: "Moderate",
  NORMAL: "Minor",
  UNASSIGNED: "Minor",
};

const COLOR_SEVERITY: Record<string, Severity> = {
  RED: "Extreme",
  ORANGE: "Severe",
  YELLOW: "Moderate",
  GREEN: "Minor",
  UNASSIGNED: "Minor",
};

const COLOR_ORDER: Record<string, number> = {
  RED: 4,
  ORANGE: 3,
  YELLOW: 2,
  GREEN: 1,
  UNASSIGNED: 0,
};

function severityForAlert(alertLevel: string, colorCode: string): Severity {
  return ALERT_SEVERITY[alertLevel] ?? COLOR_SEVERITY[colorCode] ?? "Minor";
}

export function normalizeElevatedVolcano(
  volcano: VolcanoElevated,
  observedAt: string
): SupplementalRiskSignal {
  const severity = severityForAlert(volcano.alertLevel, volcano.colorCode);
  const metrics: SupplementalMetric[] = [
    { label: "Alert Level", value: volcano.alertLevel },
    { label: "Color Code", value: volcano.colorCode },
    { label: "Previous Level", value: volcano.alertLevelPrev },
    { label: "Threat Rating", value: volcano.nvewsThreat },
  ];

  return {
    id: newEventId(),
    source: "VOLCANO",
    sourceEventId: `usgs-volcano-${volcano.vnum}`,
    category: "Volcano",
    type: `Volcano: ${volcano.alertLevel}/${volcano.colorCode}`,
    severity,
    headline: `${volcano.vName}: ${volcano.alertLevel}/${volcano.colorCode}`,
    description: volcano.noticeSynopsis || `Volcano ${volcano.vName} is at ${volcano.alertLevel} (${volcano.colorCode}) alert level.`,
    geometry: { type: "Point", latitude: volcano.lat, longitude: volcano.long },
    startedAt: volcano.alertDate || observedAt,
    expiresAt: null,
    updatedAt: observedAt,
    url: volcano.noticeUrl || `https://volcanoes.usgs.gov/vsc/api/volcanoApi/volcano?vnum=${volcano.vnum}`,
    confidence: "Source reported",
    metrics,
    raw: volcano as unknown as Record<string, unknown>,
  };
}

export async function fetchElevatedVolcanoes(): Promise<SupplementalRiskSignal[]> {
  const res = await fetch(ELEVATED_URL);
  if (!res.ok) throw new Error(`USGS Volcano API returned ${res.status}`);

  const data: VolcanoElevated[] = await res.json();
  if (!data || data.length === 0) return [];

  const observedAt = new Date().toISOString();
  return data.map((volcano) => normalizeElevatedVolcano(volcano, observedAt));
}

export async function fetchNearbyVolcanoes(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<SupplementalRiskSignal[]> {
  const elevated = await fetchElevatedVolcanoes();

  return elevated.filter((v) => {
    if (v.geometry.type !== "Point") return false;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(v.geometry.latitude - lat);
    const dLng = toRad(v.geometry.longitude - lng);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat)) * Math.cos(toRad(v.geometry.latitude)) * Math.sin(dLng / 2) ** 2;
    const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return dist <= radiusKm;
  });
}

export async function fetchAllVolcanoStatus(): Promise<SupplementalRiskSignal[]> {
  const res = await fetch(GEOJSON_URL);
  if (!res.ok) throw new Error(`USGS Volcano GeoJSON API returned ${res.status}`);

  const data: VolcanoGeoResponse = await res.json();
  if (!data.features || data.features.length === 0) return [];

  const signals: SupplementalRiskSignal[] = [];

  for (const feature of data.features) {
    const p = feature.properties;
    if (p.alertLevel === "UNASSIGNED" && p.colorCode === "UNASSIGNED") continue;

    const sev = severityForAlert(p.alertLevel, p.colorCode);
    const coords = feature.geometry.coordinates;

    const metrics: SupplementalMetric[] = [
      { label: "Alert Level", value: p.alertLevel },
      { label: "Color Code", value: p.colorCode },
      { label: "Threat Rating", value: p.nvewsThreat },
    ];

    signals.push({
      id: newEventId(),
      source: "VOLCANO",
      sourceEventId: `usgs-volcano-${p.vnum}`,
      category: "Volcano",
      type: `Volcano: ${p.alertLevel}/${p.colorCode}`,
      severity: sev,
      headline: `${p.volcanoName}: ${p.alertLevel}/${p.colorCode} (${p.region})`,
      description: p.noticeSynopsis || `Volcano ${p.volcanoName} in ${p.region} is at ${p.alertLevel} (${p.colorCode}) alert level.`,
      geometry: { type: "Point", latitude: coords[1], longitude: coords[0] },
      startedAt: p.alertDate || new Date().toISOString(),
      expiresAt: null,
      updatedAt: new Date().toISOString(),
      url: p.noticeUrl || p.volcanoUrl || "https://volcanoes.usgs.gov/",
      confidence: "Source reported",
      metrics,
      raw: p as unknown as Record<string, unknown>,
    });
  }

  signals.sort((a, b) => {
    const aColor = COLOR_ORDER[(a.raw as { colorCode?: string }).colorCode as string] ?? 0;
    const bColor = COLOR_ORDER[(b.raw as { colorCode?: string }).colorCode as string] ?? 0;
    return bColor - aColor;
  });

  return signals;
}
