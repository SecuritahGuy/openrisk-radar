import { newEventId } from "../lib/ids";
import { readTextResponse } from "../lib/http";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE_JSONP = "https://www.dwd.de/DWD/warnungen/warnapp/json/warnings.json";

interface DwdWarning {
  state?: string;
  regionName?: string;
  level?: number;
  type?: number;
  start?: number;
  end?: number;
  description?: string;
  headline?: string;
  instruction?: string;
  event?: string;
}

interface DwdWarningsPayload {
  time?: number;
  warnings?: Record<string, DwdWarning[]>;
}

function dwdSeverity(level: number | undefined): Severity {
  switch (level) {
    case 4:
      return "Extreme";
    case 3:
      return "Severe";
    case 2:
      return "Moderate";
    default:
      return "Minor";
  }
}

function stripJsonp(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("DWD returned an unrecognized JSONP payload");
  return text.slice(start, end + 1);
}

function isInGermany(lat: number, lng: number): boolean {
  return lat >= 47 && lat <= 55.1 && lng >= 5.8 && lng <= 15.1;
}

export function normalizeDwd(warning: DwdWarning): RiskEvent {
  const start = warning.start ? new Date(warning.start).toISOString() : new Date().toISOString();
  const end = warning.end ? new Date(warning.end).toISOString() : null;
  const headline = warning.headline ?? warning.event ?? "DWD weather warning";

  return {
    id: newEventId(),
    source: "DWD",
    sourceEventId: `dwd-${warning.regionName ?? warning.state}-${warning.start ?? ""}`,
    type: warning.event ?? "Severe Weather",
    category: "Weather",
    severity: dwdSeverity(warning.level),
    headline,
    description: (warning.description ?? warning.instruction ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 600) || headline,
    geometryType: "None",
    latitude: null,
    longitude: null,
    polygon: null,
    startedAt: start,
    expiresAt: end,
    updatedAt: start,
    url: "https://www.dwd.de/DE/wetter/warnungen_gemeinden/warnWetter_node.html",
    confidence: "Source reported",
    raw: warning as unknown as Record<string, unknown>,
  };
}

export async function fetchDwdWarnings(
  lat: number,
  lng: number
): Promise<RiskEvent[]> {
  const res = await fetch(BASE_JSONP);
  const text = await readTextResponse(res, "DWD Warnapp");
  const payload = JSON.parse(stripJsonp(text)) as DwdWarningsPayload;

  const all = Object.values(payload.warnings ?? {}).flat();
  if (all.length === 0) return [];

  if (!isInGermany(lat, lng)) return [];

  return all.map(normalizeDwd);
}
