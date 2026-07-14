import type { RiskEvent, Severity } from "../types/riskEvent";
import { activeConcernEvents, severityRank } from "./riskInsights";

export interface VisitEventSnapshot {
  severity: Severity;
  updatedAt: string;
}

export type VisitSnapshot = Record<string, VisitEventSnapshot>;

export interface VisitChangeSummary {
  newCount: number;
  escalatedCount: number;
  updatedCount: number;
  resolvedCount: number;
}

function eventKey(event: RiskEvent): string {
  return `${event.source}:${event.sourceEventId}`;
}

export function createVisitSnapshot(events: RiskEvent[], nowMs = Date.now()): VisitSnapshot {
  return Object.fromEntries(
    activeConcernEvents(events, nowMs).map((event) => [
      eventKey(event),
      { severity: event.severity, updatedAt: event.updatedAt },
    ])
  );
}

export function compareVisitSnapshots(
  previous: VisitSnapshot,
  current: VisitSnapshot
): VisitChangeSummary {
  let newCount = 0;
  let escalatedCount = 0;
  let updatedCount = 0;

  for (const [key, event] of Object.entries(current)) {
    const prior = previous[key];
    if (!prior) newCount += 1;
    else if (severityRank(event.severity) > severityRank(prior.severity)) escalatedCount += 1;
    else if (event.updatedAt !== prior.updatedAt) updatedCount += 1;
  }

  const resolvedCount = Object.keys(previous).filter((key) => !current[key]).length;
  return { newCount, escalatedCount, updatedCount, resolvedCount };
}
