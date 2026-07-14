import { distanceMiles } from "./geo";
import { severityRank } from "./riskInsights";
import type { EventCategory, EventSource, RiskEvent } from "../types/riskEvent";
import type { RiskIncident, RiskIncidentMetadata } from "../types/riskIncident";

const SOURCE_PRIORITY: Record<EventSource, number> = {
  NWS: 100,
  METEOALARM: 100,
  NHC: 100,
  USGS: 95,
  NIFC: 95,
  NWPS: 95,
  NOAA_TSUNAMI: 95,
  UK_EA: 95,
  USGS_WATER: 90,
  COOPS: 90,
  VOLCANO: 90,
  FEMA: 85,
  SPC: 85,
  NOAA: 80,
  EMSC: 80,
  AIRNOW: 75,
  DROUGHT: 75,
  SPACE_WEATHER: 75,
  GDACS: 55,
  EONET: 45,
  USGS_SHAKEMAP: 40,
};

const CORRELATION_RULES: Partial<Record<EventCategory, { miles: number; hours: number }>> = {
  Seismic: { miles: 40, hours: 0.5 },
  Wildfire: { miles: 30, hours: 36 },
  Tropical: { miles: 180, hours: 18 },
  Volcanic: { miles: 40, hours: 24 * 7 },
  "River Gauge": { miles: 3, hours: 6 },
};

function eventTime(event: RiskEvent): number | null {
  const value = new Date(event.startedAt || event.updatedAt).getTime();
  return Number.isFinite(value) ? value : null;
}

function point(event: RiskEvent): { latitude: number; longitude: number } | null {
  if (event.latitude == null || event.longitude == null) return null;
  return { latitude: event.latitude, longitude: event.longitude };
}

function canCorrelate(a: RiskEvent, b: RiskEvent): boolean {
  if (a.source === b.source && a.sourceEventId === b.sourceEventId) return true;
  if (a.source === b.source || a.category !== b.category) return false;

  const rule = CORRELATION_RULES[a.category];
  const aPoint = point(a);
  const bPoint = point(b);
  const aTime = eventTime(a);
  const bTime = eventTime(b);
  if (!rule || !aPoint || !bPoint || aTime == null || bTime == null) return false;

  const hoursApart = Math.abs(aTime - bTime) / 3_600_000;
  return hoursApart <= rule.hours && distanceMiles(aPoint, bPoint) <= rule.miles;
}

function comparePrimary(a: RiskEvent, b: RiskEvent): number {
  const priority = SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source];
  if (priority !== 0) return priority;
  const severity = severityRank(b.severity) - severityRank(a.severity);
  if (severity !== 0) return severity;
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function validIso(values: Array<string | null>, select: "min" | "max"): string | null {
  const times = values
    .filter((value): value is string => !!value)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite);
  if (times.length === 0) return null;
  const time = select === "min" ? Math.min(...times) : Math.max(...times);
  return new Date(time).toISOString();
}

function createIncident(events: RiskEvent[]): RiskIncident {
  const sorted = [...events].sort(comparePrimary);
  const primaryEvent = sorted[0];
  const sources = [...new Set(sorted.map((event) => event.source))].sort();
  const anchor = `${primaryEvent.source}:${primaryEvent.sourceEventId}`;
  return {
    id: `incident-${stableHash(anchor)}`,
    category: primaryEvent.category,
    severity: [...events].sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity)
    )[0].severity,
    agreement: sources.length > 1 ? "corroborated" : "single-source",
    sources,
    startedAt: validIso(events.map((event) => event.startedAt), "min") ?? primaryEvent.startedAt,
    updatedAt: validIso(events.map((event) => event.updatedAt), "max") ?? primaryEvent.updatedAt,
    expiresAt: validIso(events.map((event) => event.expiresAt), "max"),
    primaryEvent,
    events: sorted,
  };
}

export function buildRiskIncidents(events: RiskEvent[]): RiskIncident[] {
  const groups: RiskEvent[][] = [];
  for (const event of events) {
    const matching = groups.find((group) => group.some((candidate) => canCorrelate(event, candidate)));
    if (matching) matching.push(event);
    else groups.push([event]);
  }
  return groups.map(createIncident);
}

export function incidentToEvent(incident: RiskIncident): RiskEvent {
  const metadata: RiskIncidentMetadata = {
    id: incident.id,
    agreement: incident.agreement,
    eventCount: incident.events.length,
    sources: incident.sources,
    contributors: incident.events.map((event) => ({
      source: event.source,
      sourceEventId: event.sourceEventId,
      headline: event.headline,
      updatedAt: event.updatedAt,
      url: event.url,
    })),
  };
  return {
    ...incident.primaryEvent,
    id: incident.id,
    severity: incident.severity,
    startedAt: incident.startedAt,
    updatedAt: incident.updatedAt,
    expiresAt: incident.expiresAt,
    raw: { ...incident.primaryEvent.raw, openRiskIncident: metadata },
  };
}

export function canonicalIncidentEvents(events: RiskEvent[]): RiskEvent[] {
  return buildRiskIncidents(events).map(incidentToEvent);
}

export function incidentMetadata(event: RiskEvent): RiskIncidentMetadata | null {
  const metadata = event.raw.openRiskIncident;
  if (!metadata || typeof metadata !== "object") return null;
  return metadata as RiskIncidentMetadata;
}
