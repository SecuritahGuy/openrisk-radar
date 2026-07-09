import { newEventId } from "../lib/ids";
import type { Severity } from "../types/riskEvent";
import type { SupplementalRiskSignal } from "../types/supplementalRisk";

const BASE =
  "https://mapservices.weather.noaa.gov/vector/rest/services/outlooks/SPC_wx_outlks/MapServer";

const DAY_LAYER: Record<1 | 2 | 3, number> = {
  1: 1,
  2: 9,
  3: 17,
};

interface SpcFeature {
  id?: string | number;
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
  properties: {
    objectid?: number;
    valid?: string;
    expire?: string;
    issue?: string;
    label?: string;
    label2?: string;
    dn?: number;
    idp_source?: string;
  };
}

interface SpcResponse {
  features?: SpcFeature[];
}

function parseSpcTimestamp(value: string | undefined): string | null {
  if (!value || !/^\d{12}$/.test(value)) return null;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(4, 6)) - 1;
  const day = Number(value.slice(6, 8));
  const hour = Number(value.slice(8, 10));
  const minute = Number(value.slice(10, 12));
  return new Date(Date.UTC(year, month, day, hour, minute)).toISOString();
}

function mapSeverity(label: string | undefined): Severity {
  switch (label) {
    case "HIGH":
      return "Extreme";
    case "MDT":
      return "Severe";
    case "ENH":
    case "SLGT":
      return "Moderate";
    default:
      return "Minor";
  }
}

function normalizePolygon(feature: SpcFeature): SupplementalRiskSignal["geometry"] {
  if (!feature.geometry) return { type: "None" };

  if (feature.geometry.type === "Polygon") {
    const outerRing = feature.geometry.coordinates[0] ?? [];
    return { type: "Polygon", polygon: outerRing };
  }

  const polygons = feature.geometry.coordinates
    .map((polygon) => polygon[0] ?? [])
    .filter((ring) => ring.length >= 3);

  return polygons.length > 0 ? { type: "MultiPolygon", polygons } : { type: "None" };
}

function normalize(feature: SpcFeature, day: 1 | 2 | 3): SupplementalRiskSignal {
  const p = feature.properties;
  const valid = parseSpcTimestamp(p.valid);
  const expire = parseSpcTimestamp(p.expire);
  const issue = parseSpcTimestamp(p.issue);
  const label = p.label ?? "OUTLOOK";
  const labelText = p.label2 ?? `${label} Risk`;

  return {
    id: newEventId(),
    source: "SPC",
    sourceEventId: String(p.objectid ?? feature.id ?? `${day}-${label}`),
    category: "Storm Outlook",
    type: `Day ${day} Convective Outlook`,
    severity: mapSeverity(label),
    headline: `SPC Day ${day}: ${labelText}`,
    description: `Storm Prediction Center day ${day} convective outlook area: ${labelText}.`,
    geometry: normalizePolygon(feature),
    startedAt: valid ?? issue ?? new Date().toISOString(),
    expiresAt: expire,
    updatedAt: issue ?? valid ?? new Date().toISOString(),
    url: "https://www.spc.noaa.gov/products/outlook/",
    confidence: "Source reported",
    metrics: [
      { label: "Risk", value: labelText },
      ...(p.dn != null ? [{ label: "SPC rank", value: p.dn }] : []),
    ],
    raw: feature as unknown as Record<string, unknown>,
  };
}

export async function fetchSpcConvectiveOutlooks(
  days: Array<1 | 2 | 3> = [1, 2, 3]
): Promise<SupplementalRiskSignal[]> {
  const responses = await Promise.all(
    days.map(async (day) => {
      const params = new URLSearchParams({
        where: "1=1",
        outFields: "*",
        f: "geojson",
        returnGeometry: "true",
      });
      const url = `${BASE}/${DAY_LAYER[day]}/query?${params}`;
      const res = await fetch(url, {
        headers: { Accept: "application/geo+json, application/json" },
      });
      if (!res.ok) throw new Error(`SPC API returned ${res.status}`);
      const data: SpcResponse = await res.json();
      return (data.features ?? []).map((feature) => normalize(feature, day));
    })
  );

  return responses.flat();
}
