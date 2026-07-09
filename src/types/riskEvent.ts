export type EventSource = "NWS" | "USGS" | "FEMA" | "NIFC" | "SPC";
export type EventCategory = "Weather" | "Seismic" | "Disaster" | "Wildfire";
export type Severity = "Minor" | "Moderate" | "Severe" | "Extreme";
export type GeometryType = "Point" | "Polygon" | "None";
export type Confidence = "Source reported" | "Estimated" | "Unknown";

export interface RiskEvent {
  id: string;
  source: EventSource;
  sourceEventId: string;
  type: string;
  category: EventCategory;
  severity: Severity;
  headline: string;
  description: string;
  geometryType: GeometryType;
  latitude: number | null;
  longitude: number | null;
  polygon: number[][] | null;
  startedAt: string;
  expiresAt: string | null;
  updatedAt: string;
  url: string | null;
  confidence: Confidence;
  raw: Record<string, unknown>;
}
