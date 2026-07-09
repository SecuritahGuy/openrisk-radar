import type { ResolvedLocation } from "../types/location";
import type { EventSource, RiskEvent, Severity } from "../types/riskEvent";

export const EVENT_SOURCES: EventSource[] = ["NWS", "USGS", "FEMA", "NIFC", "SPC"];
export const EVENT_SEVERITIES: Severity[] = [
  "Extreme",
  "Severe",
  "Moderate",
  "Minor",
];

export type SourceFilters = Record<EventSource, boolean>;
export type SeverityFilters = Record<Severity, boolean>;

export interface RiskSummary {
  level: "Clear" | "Guarded" | "Elevated" | "High" | "Critical";
  score: number;
  topDriver: string;
  criticalCount: number;
  severeCount: number;
  moderateCount: number;
  activeCount: number;
  expiringCount: number;
}

export function defaultSourceFilters(): SourceFilters {
  return {
    NWS: true,
    USGS: true,
    FEMA: true,
    NIFC: true,
    SPC: true,
  };
}

export function defaultSeverityFilters(): SeverityFilters {
  return {
    Extreme: true,
    Severe: true,
    Moderate: true,
    Minor: true,
  };
}

export function sourceColor(source: EventSource): string {
  switch (source) {
    case "NWS":
      return "#f57c00";
    case "USGS":
      return "#2e7d32";
    case "FEMA":
      return "#7b1fa2";
    case "NIFC":
      return "#d84315";
    case "SPC":
      return "#00897b";
  }
}

export function severityColor(severity: Severity): string {
  switch (severity) {
    case "Extreme":
      return "#b71c1c";
    case "Severe":
      return "#d84315";
    case "Moderate":
      return "#f57c00";
    case "Minor":
      return "#757575";
  }
}

export function severityRank(severity: Severity): number {
  switch (severity) {
    case "Extreme":
      return 4;
    case "Severe":
      return 3;
    case "Moderate":
      return 2;
    case "Minor":
      return 1;
  }
}

export function distanceMiles(
  location: ResolvedLocation | null,
  event: RiskEvent
): number | null {
  if (
    !location ||
    event.latitude == null ||
    event.longitude == null
  ) {
    return null;
  }

  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthMiles = 3958.8;
  const dLat = toRad(event.latitude - location.latitude);
  const dLon = toRad(event.longitude - location.longitude);
  const lat1 = toRad(location.latitude);
  const lat2 = toRad(event.latitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(miles: number | null): string {
  if (miles == null) return "Area";
  if (miles < 1) return "<1 mi";
  return `${Math.round(miles)} mi`;
}

export function expiresLabel(event: RiskEvent): string {
  if (event.source === "FEMA" && !event.expiresAt) return "Historical";
  if (!event.expiresAt) return "Open";

  const expires = new Date(event.expiresAt);
  if (Number.isNaN(expires.getTime())) return "Open";

  const diffMs = expires.getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const mins = Math.round(diffMs / 60_000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}

export function isExpiringSoon(event: RiskEvent): boolean {
  if (!event.expiresAt) return false;
  const expires = new Date(event.expiresAt).getTime();
  if (Number.isNaN(expires)) return false;
  const diffMs = expires - Date.now();
  return diffMs > 0 && diffMs <= 12 * 60 * 60 * 1000;
}

export function filterEvents(
  events: RiskEvent[],
  sourceFilters: SourceFilters,
  severityFilters: SeverityFilters
): RiskEvent[] {
  return events.filter(
    (event) => sourceFilters[event.source] && severityFilters[event.severity]
  );
}

export function attentionEvents(
  events: RiskEvent[],
  location: ResolvedLocation | null,
  limit = 5
): RiskEvent[] {
  return [...events]
    .sort((a, b) => {
      const severityDelta = severityRank(b.severity) - severityRank(a.severity);
      if (severityDelta !== 0) return severityDelta;

      const expiringDelta = Number(isExpiringSoon(b)) - Number(isExpiringSoon(a));
      if (expiringDelta !== 0) return expiringDelta;

      const aDistance = distanceMiles(location, a) ?? Number.POSITIVE_INFINITY;
      const bDistance = distanceMiles(location, b) ?? Number.POSITIVE_INFINITY;
      if (aDistance !== bDistance) return aDistance - bDistance;

      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    })
    .slice(0, limit);
}

export function buildRiskSummary(events: RiskEvent[]): RiskSummary {
  const criticalCount = events.filter((e) => e.severity === "Extreme").length;
  const severeCount = events.filter((e) => e.severity === "Severe").length;
  const moderateCount = events.filter((e) => e.severity === "Moderate").length;
  const expiringCount = events.filter(isExpiringSoon).length;
  const sourceCounts = EVENT_SOURCES.map((source) => ({
    source,
    count: events.filter((event) => event.source === source).length,
  })).sort((a, b) => b.count - a.count);

  const score =
    criticalCount * 40 +
    severeCount * 18 +
    moderateCount * 7 +
    expiringCount * 8 +
    events.length;

  const level =
    criticalCount > 0 || score >= 90
      ? "Critical"
      : severeCount > 2 || score >= 55
        ? "High"
        : severeCount > 0 || moderateCount > 2 || score >= 25
          ? "Elevated"
          : events.length > 0
            ? "Guarded"
            : "Clear";

  const topSource = sourceCounts.find((item) => item.count > 0);
  const topDriver =
    criticalCount > 0
      ? `${criticalCount} extreme signal${criticalCount !== 1 ? "s" : ""}`
      : severeCount > 0
        ? `${severeCount} severe signal${severeCount !== 1 ? "s" : ""}`
        : topSource
          ? `${topSource.count} ${topSource.source} signal${topSource.count !== 1 ? "s" : ""}`
          : "No active signals";

  return {
    level,
    score,
    topDriver,
    criticalCount,
    severeCount,
    moderateCount,
    activeCount: events.length,
    expiringCount,
  };
}
