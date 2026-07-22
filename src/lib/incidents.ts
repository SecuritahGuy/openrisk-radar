import { distanceMiles } from "./geo";
import { severityRank } from "./riskInsights";
import type { EventCategory, EventSource, RiskEvent } from "../types/riskEvent";
import type { RiskIncident, RiskIncidentMetadata } from "../types/riskIncident";

const SOURCE_PRIORITY: Record<EventSource, number> = {
  NWS: 100,
  METEOALARM: 100,
  NHC: 100,
  JMA: 100,
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
  WHO: 50,
  GTM: 60,
  DWD: 100,
  GEONET: 80,
  REGIONAL: 98,
  USDOT: 90,
};

const CORRELATION_RULES: Partial<Record<EventCategory, { miles: number; hours: number }>> = {
  Weather: { miles: 35, hours: 3 },
  Seismic: { miles: 40, hours: 0.5 },
  Wildfire: { miles: 30, hours: 36 },
  Tropical: { miles: 180, hours: 18 },
  Volcanic: { miles: 40, hours: 24 * 7 },
  "River Gauge": { miles: 3, hours: 6 },
  "Coastal Water": { miles: 80, hours: 12 },
  Transportation: { miles: 1, hours: 12 },
};

const COASTAL_ALERT_SOURCES = new Set<EventSource>([
  "NOAA_TSUNAMI",
  "GTM",
]);

function eventTime(event: RiskEvent): number | null {
  const value = new Date(event.startedAt || event.updatedAt).getTime();
  return Number.isFinite(value) ? value : null;
}

function point(event: RiskEvent): { latitude: number; longitude: number } | null {
  if (event.latitude == null || event.longitude == null) return null;
  return { latitude: event.latitude, longitude: event.longitude };
}

function polygonContainsPoint(
  polygon: number[][],
  target: { latitude: number; longitude: number }
): boolean {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const [x, y] = polygon[index];
    const [previousX, previousY] = polygon[previous];
    const intersects =
      y > target.latitude !== previousY > target.latitude &&
      target.longitude <
        ((previousX - x) * (target.latitude - y)) /
          (previousY - y || Number.EPSILON) +
          x;
    if (intersects) inside = !inside;
  }
  return inside;
}

function pointToPolygonMiles(
  target: { latitude: number; longitude: number },
  polygon: number[][]
): number {
  if (polygonContainsPoint(polygon, target)) return 0;
  return Math.min(
    ...polygon.map(([longitude, latitude]) =>
      distanceMiles(target, { latitude, longitude })
    )
  );
}

function eventDistanceMiles(a: RiskEvent, b: RiskEvent): number | null {
  const aPoint = point(a);
  const bPoint = point(b);
  if (!aPoint || !bPoint) return null;
  if (a.polygon && b.geometryType === "Point") {
    return pointToPolygonMiles(bPoint, a.polygon);
  }
  if (b.polygon && a.geometryType === "Point") {
    return pointToPolygonMiles(aPoint, b.polygon);
  }
  return distanceMiles(aPoint, bPoint);
}

function supportsCrossSourceCorrelation(event: RiskEvent): boolean {
  if (event.category === "Weather") {
    return !/outlook/i.test(event.type);
  }
  if (event.category === "Coastal Water") {
    return COASTAL_ALERT_SOURCES.has(event.source);
  }
  return true;
}

function providerIdentity(event: RiskEvent): string {
  return event.provider?.id ?? event.source;
}

function canCorrelate(a: RiskEvent, b: RiskEvent): boolean {
  const sameProvider = providerIdentity(a) === providerIdentity(b);
  if (sameProvider && a.sourceEventId === b.sourceEventId) return true;
  if (sameProvider || a.category !== b.category) return false;
  if (!supportsCrossSourceCorrelation(a) || !supportsCrossSourceCorrelation(b)) {
    return false;
  }

  const rule = CORRELATION_RULES[a.category];
  const milesApart = eventDistanceMiles(a, b);
  const aTime = eventTime(a);
  const bTime = eventTime(b);
  if (!rule || milesApart == null || aTime == null || bTime == null) return false;

  const hoursApart = Math.abs(aTime - bTime) / 3_600_000;
  return hoursApart <= rule.hours && milesApart <= rule.miles;
}

function comparePrimary(a: RiskEvent, b: RiskEvent): number {
  const priority = SOURCE_PRIORITY[b.source] - SOURCE_PRIORITY[a.source];
  if (priority !== 0) return priority;
  const severity = severityRank(b.severity) - severityRank(a.severity);
  if (severity !== 0) return severity;
  const updated = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  if (updated !== 0) return updated;
  return `${providerIdentity(a)}:${a.sourceEventId}`.localeCompare(
    `${providerIdentity(b)}:${b.sourceEventId}`
  );
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
    agreement: new Set(events.map(providerIdentity)).size > 1 ? "corroborated" : "single-source",
    sources,
    startedAt: validIso(events.map((event) => event.startedAt), "min") ?? primaryEvent.startedAt,
    updatedAt: validIso(events.map((event) => event.updatedAt), "max") ?? primaryEvent.updatedAt,
    expiresAt: validIso(events.map((event) => event.expiresAt), "max"),
    primaryEvent,
    events: sorted,
  };
}

function correlationReason(primary: RiskEvent, event: RiskEvent): string {
  if (primary === event) return "Selected as the authoritative primary record.";
  if (
    providerIdentity(primary) === providerIdentity(event) &&
    primary.sourceEventId === event.sourceEventId
  ) {
    return "Duplicate update of the same provider record.";
  }
  const miles = eventDistanceMiles(primary, event);
  const primaryTime = eventTime(primary);
  const eventTimestamp = eventTime(event);
  const minutes = primaryTime != null && eventTimestamp != null
    ? Math.round(Math.abs(primaryTime - eventTimestamp) / 60_000)
    : null;
  const spatial = miles == null
    ? "matching reported area"
    : miles < 0.1
      ? "overlapping reported area"
      : `${miles.toFixed(1)} miles from the primary record`;
  const temporal = minutes == null
    ? "within the category time window"
    : `${minutes} minute${minutes === 1 ? "" : "s"} apart`;
  return `${spatial}; ${temporal}.`;
}

export function buildRiskIncidents(events: RiskEvent[]): RiskIncident[] {
  const ordered = [...events].sort(comparePrimary);
  const groups: RiskEvent[][] = [];
  for (const event of ordered) {
    const group = groups.find((candidate) =>
      candidate.every((member) => canCorrelate(event, member))
    );
    if (group) group.push(event);
    else groups.push([event]);
  }
  return groups
    .map(createIncident)
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function incidentToEvent(incident: RiskIncident): RiskEvent {
  const metadata: RiskIncidentMetadata = {
    id: incident.id,
    agreement: incident.agreement,
    eventCount: incident.events.length,
    sources: incident.sources,
    providerCount: new Set(incident.events.map(providerIdentity)).size,
    groupingMethod: "complete-link",
    contributors: incident.events.map((event) => ({
      source: event.source,
      provider: event.provider,
      sourceEventId: event.sourceEventId,
      headline: event.headline,
      updatedAt: event.updatedAt,
      url: event.url,
      correlationReason: correlationReason(incident.primaryEvent, event),
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
