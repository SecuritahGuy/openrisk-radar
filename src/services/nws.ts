import { newEventId } from "../lib/ids";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE = "https://api.weather.gov";

function parsePolygon(raw: string | null): number[][] | null {
  if (!raw) return null;
  try {
    const pairs = raw.trim().split(/\s+/);
    if (pairs.length < 3) return null;
    return pairs.map((p) => {
      const [lat, lng] = p.split(",").map(Number);
      return [lng, lat];
    });
  } catch {
    return null;
  }
}

function mapSeverity(nwsSeverity: string): Severity {
  switch (nwsSeverity) {
    case "Extreme":
      return "Extreme";
    case "Severe":
      return "Severe";
    case "Moderate":
      return "Moderate";
    default:
      return "Minor";
  }
}

interface NwsFeature {
  id: string;
  properties: {
    id: string;
    event: string;
    headline: string | null;
    description: string | null;
    severity: string;
    urgency: string;
    certainty: string;
    effective: string;
    expires: string | null;
    sent: string;
    status: string;
    category: string;
    areaDesc: string;
    polygon: string | null;
    parameter: Record<string, string[] | null> | null;
  };
}

interface NwsResponse {
  features: NwsFeature[];
}

function normalize(feature: NwsFeature, pointMatch = false): RiskEvent {
  const p = feature.properties;
  const poly = parsePolygon(p.polygon);
  const [lng, lat] = poly && poly.length > 0
    ? poly[0]
    : [null, null];

  return {
    id: newEventId(),
    source: "NWS",
    sourceEventId: p.id,
    type: p.event || "Weather Alert",
    category: "Weather",
    severity: mapSeverity(p.severity),
    headline: p.headline ?? p.event ?? "Weather Alert",
    description: p.description ?? "",
    geometryType: poly ? "Polygon" : "None",
    latitude: lat,
    longitude: lng,
    polygon: poly,
    startedAt: p.effective,
    expiresAt: p.expires,
    updatedAt: p.sent,
    url: feature.id,
    confidence: "Source reported",
    raw: {
      ...feature,
      openRiskScope: { nwsPointMatch: pointMatch },
    } as unknown as Record<string, unknown>,
  };
}

export async function fetchNwsAlerts(state: string): Promise<RiskEvent[]> {
  const url = `${BASE}/alerts/active?area=${encodeURIComponent(state)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": "OpenRisk-Radar/1.0 (+https://openriskradar.com)",
    },
  });
  if (!res.ok) throw new Error(`NWS API returned ${res.status}`);
  const data: NwsResponse = await res.json();
  return (data.features ?? []).map((feature) => normalize(feature));
}

export async function fetchNwsAlertsForPoint(
  latitude: number,
  longitude: number
): Promise<RiskEvent[]> {
  const url = `${BASE}/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/geo+json",
      "User-Agent": "OpenRisk-Radar/1.0 (+https://openriskradar.com)",
    },
  });
  if (!res.ok) throw new Error(`NWS point API returned ${res.status}`);
  const data: NwsResponse = await res.json();
  return (data.features ?? []).map((feature) => normalize(feature, true));
}
