import type { EventCategory, EventSource, RiskEvent, Severity } from "./riskEvent";

export type IncidentAgreement = "single-source" | "corroborated";

export interface IncidentContributor {
  source: EventSource;
  provider?: RiskEvent["provider"];
  sourceEventId: string;
  headline: string;
  updatedAt: string;
  url: string | null;
  correlationReason: string;
}

export interface RiskIncident {
  id: string;
  category: EventCategory;
  severity: Severity;
  agreement: IncidentAgreement;
  sources: EventSource[];
  startedAt: string;
  updatedAt: string;
  expiresAt: string | null;
  primaryEvent: RiskEvent;
  events: RiskEvent[];
}

export interface RiskIncidentMetadata {
  id: string;
  agreement: IncidentAgreement;
  eventCount: number;
  sources: EventSource[];
  providerCount: number;
  groupingMethod: "complete-link";
  contributors: IncidentContributor[];
}
