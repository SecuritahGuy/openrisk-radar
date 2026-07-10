import { newEventId } from "../lib/ids";
import type { Severity } from "../types/riskEvent";
import type { SupplementalRiskSignal, SupplementalMetric } from "../types/supplementalRisk";

const USDM_URL = "https://mesonet.agron.iastate.edu/geojson/usdm.py";

interface UsdmFeatureProperties {
  date: string;
  dm: number;
}

interface UsdmFeature {
  type: "Feature";
  id: number;
  properties: UsdmFeatureProperties;
  geometry: {
    type: "MultiPolygon";
    coordinates: number[][][][];
  };
}

interface UsdmResponse {
  type: "FeatureCollection";
  features: UsdmFeature[];
}

const DM_LABELS: Record<number, string> = {
  0: "D0 — Abnormally Dry",
  1: "D1 — Moderate Drought",
  2: "D2 — Severe Drought",
  3: "D3 — Extreme Drought",
  4: "D4 — Exceptional Drought",
};

const DM_SEVERITY: Record<number, Severity> = {
  0: "Minor",
  1: "Moderate",
  2: "Severe",
  3: "Severe",
  4: "Extreme",
};

function pointInMultiPolygon(
  point: [number, number],
  multiPolygon: number[][][][]
): boolean {
  const [lng, lat] = point;
  for (const polygon of multiPolygon) {
    for (const ring of polygon) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1];
        const xj = ring[j][0], yj = ring[j][1];
        if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      if (inside) return true;
    }
  }
  return false;
}

export async function fetchDroughtMonitor(): Promise<SupplementalRiskSignal[]> {
  const res = await fetch(USDM_URL);
  if (!res.ok) throw new Error(`US Drought Monitor API returned ${res.status}`);

  const json: UsdmResponse = await res.json();
  if (!json.features || json.features.length === 0) return [];

  const signals: SupplementalRiskSignal[] = [];

  for (const feature of json.features) {
    const { dm, date } = feature.properties;
    const label = DM_LABELS[dm] ?? `Drought Level ${dm}`;
    const sev = DM_SEVERITY[dm] ?? "Minor";

    const polygons = feature.geometry.coordinates.map((polygon) =>
      polygon[0].map((coord) => [coord[0], coord[1]] as [number, number])
    );

    const metrics: SupplementalMetric[] = [
      { label: "Drought Level", value: `D${dm}` },
      { label: "Date", value: date },
    ];

    const signal: SupplementalRiskSignal = {
      id: newEventId(),
      source: "DROUGHT",
      sourceEventId: `usdm-${dm}-${date}`,
      category: "Drought",
      type: label,
      severity: sev,
      headline: `${label} — ${sev}`,
      description: `US Drought Monitor rating for areas affected at this severity level. Updated weekly.`,
      geometry: {
        type: "MultiPolygon",
        polygons: polygons,
      },
      startedAt: `${date}T00:00:00Z`,
      expiresAt: null,
      updatedAt: `${date}T00:00:00Z`,
      url: "https://droughtmonitor.unl.edu/",
      confidence: "Source reported",
      metrics,
      raw: feature as unknown as Record<string, unknown>,
    };

    signals.push(signal);
  }

  signals.sort((a, b) => {
    const order = ["Extreme", "Severe", "Moderate", "Minor"];
    return order.indexOf(a.severity) - order.indexOf(b.severity);
  });

  return signals;
}

export function getDroughtLevelAtPoint(
  signals: SupplementalRiskSignal[],
  lat: number,
  lng: number
): { level: number; label: string } | null {
  for (const signal of signals) {
    if (signal.source !== "DROUGHT") continue;
    const geom = signal.geometry;
    if (geom.type !== "MultiPolygon") continue;

    const dm = parseInt(signal.sourceEventId.split("-")[1] ?? "0");
    if (pointInMultiPolygon([lng, lat], signal.raw as unknown as number[][][][])) {
      return { level: dm, label: DM_LABELS[dm] ?? `D${dm}` };
    }
  }
  return null;
}

export { DM_LABELS };
