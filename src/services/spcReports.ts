import Papa from "papaparse";
import { distanceMiles } from "../lib/geo";
import { readTextResponse } from "../lib/http";
import { newEventId } from "../lib/ids";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE = "https://www.spc.noaa.gov/climo/reports";
const REPORT_URL = "https://www.spc.noaa.gov/climo/reports/today.html";

type SpcReportKind = "tornado" | "hail" | "wind";

interface SpcReportRow {
  Time: string;
  F_Scale?: string;
  Size?: string;
  Speed?: string;
  Location: string;
  County: string;
  State: string;
  Lat: string;
  Lon: string;
  Comments: string;
}

export interface SpcReportOptions {
  now?: Date;
}

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function numeric(value: string | undefined): number | null {
  const normalized = clean(value);
  if (!normalized || normalized.toUpperCase() === "UNK") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function reportTimeIso(raw: string, now: Date): string {
  const value = clean(raw).padStart(4, "0");
  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(2, 4));
  const candidate = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hour,
      minute
    )
  );
  if (candidate.getTime() > now.getTime() + 60 * 60 * 1000) {
    candidate.setUTCDate(candidate.getUTCDate() - 1);
  }
  return candidate.toISOString();
}

function tornadoSeverity(scale: string): Severity {
  const rating = Number(scale.match(/(?:EF|F)(\d)/i)?.[1] ?? -1);
  if (rating >= 3) return "Extreme";
  return "Severe";
}

function reportSeverity(kind: SpcReportKind, row: SpcReportRow): Severity {
  if (kind === "tornado") return tornadoSeverity(clean(row.F_Scale));
  const value = numeric(kind === "hail" ? row.Size : row.Speed) ?? 0;
  if (kind === "hail") {
    if (value >= 300) return "Extreme";
    if (value >= 200) return "Severe";
    return "Moderate";
  }
  if (value >= 100) return "Extreme";
  if (value >= 75) return "Severe";
  return "Moderate";
}

function reportType(kind: SpcReportKind): string {
  if (kind === "tornado") return "Tornado Report";
  if (kind === "hail") return "Hail Report";
  return "Wind Report";
}

function measurement(kind: SpcReportKind, row: SpcReportRow): string | null {
  if (kind === "tornado") {
    const scale = clean(row.F_Scale);
    return scale && scale !== "UNK" ? scale : null;
  }
  const value = numeric(kind === "hail" ? row.Size : row.Speed);
  if (value == null) return null;
  return kind === "hail"
    ? `${(value / 100).toFixed(2)} in hail`
    : `${value} mph wind`;
}

function normalize(
  kind: SpcReportKind,
  row: SpcReportRow,
  now: Date
): RiskEvent | null {
  const latitude = numeric(row.Lat);
  const longitude = numeric(row.Lon);
  if (latitude == null || longitude == null) return null;

  const startedAt = reportTimeIso(row.Time, now);
  const type = reportType(kind);
  const location = [clean(row.Location), clean(row.County), clean(row.State)]
    .filter(Boolean)
    .join(", ");
  const measured = measurement(kind, row);
  const comments = clean(row.Comments);

  return {
    id: newEventId(),
    source: "SPC",
    sourceEventId: [kind, startedAt, latitude, longitude].join("-"),
    type,
    category: "Weather",
    severity: reportSeverity(kind, row),
    headline: `${type}${location ? ` near ${location}` : ""}`,
    description: [measured, comments].filter(Boolean).join(". ") ||
      `Preliminary ${type.toLowerCase()} from the Storm Prediction Center.`,
    geometryType: "Point",
    latitude,
    longitude,
    polygon: null,
    startedAt,
    expiresAt: null,
    updatedAt: startedAt,
    url: REPORT_URL,
    confidence: "Source reported",
    raw: { ...row, reportKind: kind } as Record<string, unknown>,
  };
}

async function fetchReportKind(
  kind: SpcReportKind,
  now: Date
): Promise<RiskEvent[]> {
  const suffix = kind === "tornado" ? "torn" : kind;
  const response = await fetch(`${BASE}/today_${suffix}.csv`, {
    headers: { Accept: "text/csv" },
  });
  const text = await readTextResponse(response, `SPC ${kind} reports`);
  const parsed = Papa.parse<SpcReportRow>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? `Unable to parse SPC ${kind} reports`);
  }
  return parsed.data.flatMap((row) => {
    const event = normalize(kind, row, now);
    return event ? [event] : [];
  });
}

export async function fetchSpcStormReports(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  options: SpcReportOptions = {}
): Promise<RiskEvent[]> {
  const now = options.now ?? new Date();
  const reports = (
    await Promise.all(
      (["tornado", "hail", "wind"] as const).map((kind) =>
        fetchReportKind(kind, now)
      )
    )
  ).flat();

  return reports
    .filter(
      (event) =>
        event.latitude != null &&
        event.longitude != null &&
        distanceMiles(
          { latitude, longitude },
          { latitude: event.latitude, longitude: event.longitude }
        ) <= radiusMiles
    )
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
}
