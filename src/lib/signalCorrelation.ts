import type {
  EventCategory,
  EventSource,
  RiskEvent,
  Severity,
} from "../types/riskEvent";
import { activeConcernEvents, severityRank } from "./riskInsights";

export type SignalAgreement = "corroborated" | "single-source" | "stale";

export interface CorrelatedSignal {
  id: string;
  label: string;
  agreement: SignalAgreement;
  agreementLabel: string;
  severity: Severity;
  sources: EventSource[];
  eventCount: number;
  latestUpdatedAt: string | null;
  summary: string;
  events: RiskEvent[];
}

const STALE_MS = 24 * 60 * 60 * 1000;

const CATEGORY_LABELS: Record<EventCategory, string> = {
  Weather: "Weather hazard",
  Seismic: "Seismic activity",
  "River Gauge": "River conditions",
  Disaster: "Disaster context",
  Wildfire: "Wildfire conditions",
  Tropical: "Tropical weather",
  Volcanic: "Volcanic activity",
  Drought: "Drought conditions",
  Ice: "Ice conditions",
  Landslide: "Landslide risk",
  Dust: "Dust conditions",
  "Air Quality": "Air quality",
  "Coastal Water": "Coastal water",
  "Space Weather": "Space weather",
  Pollen: "Pollen levels",
  "UV Index": "UV exposure",
};

function signalKey(event: RiskEvent): string {
  if (event.source === "SPC" || event.source === "NWS") return "weather";
  if (event.source === "NHC") return "tropical";
  if (
    event.source === "NIFC" ||
    event.source === "AIRNOW" ||
    event.source === "DROUGHT"
  ) {
    return "fire-air-drought";
  }
  if (event.source === "USGS" || event.source === "EMSC") return "seismic";
  if (event.source === "USGS_WATER" || event.source === "NWPS" || event.source === "COOPS") return "water";
  if (event.source === "VOLCANO") return "volcano";
  if (event.source === "SPACE_WEATHER") return "space-weather";
  return event.category;
}

function signalLabel(key: string, events: RiskEvent[]): string {
  switch (key) {
    case "weather":
      return "Weather hazard";
    case "tropical":
      return "Tropical weather";
    case "fire-air-drought":
      return "Fire, air & drought";
    case "seismic":
      return "Seismic activity";
    case "water":
      return "Water conditions";
    case "volcano":
      return "Volcanic activity";
    case "space-weather":
      return "Space weather";
    default:
      return CATEGORY_LABELS[events[0]?.category] ?? "Risk signal";
  }
}

function latestUpdatedAt(events: RiskEvent[]): string | null {
  const latest = events
    .map((event) => new Date(event.updatedAt).getTime())
    .filter((time) => !Number.isNaN(time))
    .sort((a, b) => b - a)[0];
  return latest == null ? null : new Date(latest).toISOString();
}

function maxSeverity(events: RiskEvent[]): Severity {
  return (
    [...events].sort(
      (a, b) => severityRank(b.severity) - severityRank(a.severity)
    )[0]?.severity ?? "Minor"
  );
}

function sortSignalEvents(events: RiskEvent[]): RiskEvent[] {
  return [...events].sort((a, b) => {
    const severityDelta = severityRank(b.severity) - severityRank(a.severity);
    if (severityDelta !== 0) return severityDelta;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });
}

function summarizeAgreement(
  label: string,
  agreement: SignalAgreement,
  sources: EventSource[],
  eventCount: number
): string {
  if (agreement === "stale") {
    return `${label} has ${eventCount} stale signal${eventCount !== 1 ? "s" : ""}; latest update is over 24 hours old.`;
  }
  if (agreement === "corroborated") {
    return `${label} is corroborated by ${sources.length} sources: ${sources.join(", ")}.`;
  }
  return `${label} is currently single-source from ${sources[0]}.`;
}

export function buildSignalCorrelations(
  events: RiskEvent[],
  nowMs = Date.now()
): CorrelatedSignal[] {
  const groups = new Map<string, RiskEvent[]>();

  for (const event of activeConcernEvents(events, nowMs)) {
    const key = signalKey(event);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  return Array.from(groups.entries())
    .map(([key, groupEvents]) => {
      const sources = Array.from(
        new Set(groupEvents.map((event) => event.source))
      ).sort();
      const latest = latestUpdatedAt(groupEvents);
      const latestMs = latest ? new Date(latest).getTime() : null;
      const isStale = latestMs == null || nowMs - latestMs > STALE_MS;
      const agreement: SignalAgreement = isStale
        ? "stale"
        : sources.length > 1
          ? "corroborated"
          : "single-source";
      const label = signalLabel(key, groupEvents);
      const agreementLabel =
        agreement === "corroborated"
          ? "Corroborated"
          : agreement === "stale"
            ? "Stale"
            : "Single source";

      return {
        id: key,
        label,
        agreement,
        agreementLabel,
        severity: maxSeverity(groupEvents),
        sources,
        eventCount: groupEvents.length,
        latestUpdatedAt: latest,
        summary: summarizeAgreement(
          label,
          agreement,
          sources,
          groupEvents.length
        ),
        events: sortSignalEvents(groupEvents),
      };
    })
    .sort((a, b) => {
      const agreementRank = { corroborated: 3, "single-source": 2, stale: 1 };
      const agreementDelta =
        agreementRank[b.agreement] - agreementRank[a.agreement];
      if (agreementDelta !== 0) return agreementDelta;

      const severityDelta = severityRank(b.severity) - severityRank(a.severity);
      if (severityDelta !== 0) return severityDelta;

      return b.eventCount - a.eventCount;
    });
}

export function summarizeSourceAgreement(
  events: RiskEvent[],
  nowMs = Date.now()
): string {
  const correlations = buildSignalCorrelations(events, nowMs);
  const top = correlations[0];

  if (!top) return "No active hazard feeds are reporting in this radius.";

  const corroboratedCount = correlations.filter(
    (signal) => signal.agreement === "corroborated"
  ).length;
  const staleCount = correlations.filter(
    (signal) => signal.agreement === "stale"
  ).length;

  if (corroboratedCount > 0) {
    return `${corroboratedCount} concern${corroboratedCount !== 1 ? "s" : ""} corroborated across multiple sources. ${top.summary}`;
  }
  if (staleCount === correlations.length) {
    return `${staleCount} concern${staleCount !== 1 ? "s" : ""} appear stale; verify before acting.`;
  }
  return `${correlations.length} concern${correlations.length !== 1 ? "s" : ""} active, but none are corroborated across sources yet. ${top.summary}`;
}
