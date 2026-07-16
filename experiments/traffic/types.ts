// EXPERIMENT ONLY — not imported by the OpenRiskRadar web app.
// Research scaffold for US traffic/road-hazard data integration.
// Validated independently via scripts; see experiments/traffic/README.md.

export type GeometryType =
  | "Point"
  | "LineString"
  | "MultiLineString"
  | "Polygon"
  | "MultiPolygon"
  | "None";

export type EventCategory = "Transportation";

export type Severity = "Minor" | "Moderate" | "Severe" | "Extreme";

export type Confidence = "Source reported" | "Estimated" | "Unknown";

export type TransportationEventType =
  | "Crash"
  | "Road Closure"
  | "Lane Closure"
  | "Work Zone"
  | "Flooded Road"
  | "Debris"
  | "Disabled Vehicle"
  | "Hazmat"
  | "Bridge Restriction"
  | "Winter Road Condition"
  | "Special Event"
  | "Truck Restriction";

export interface TransportationDetails {
  state: string;
  roadway: string | null;
  direction: string | null;
  startMilepost: number | null;
  endMilepost: number | null;
  lanesClosed: number | null;
  totalLanes: number | null;
  fullClosure: boolean;
  delayMinutes: number | null;
  detour: string | null;
  verified: boolean | null;
  planned: boolean;
}

export interface TrafficGeometry {
  type: GeometryType;
  coordinates: unknown | null;
}

export interface TransportationRiskEvent {
  id: string;
  source: string;
  sourceEventId: string;
  type: TransportationEventType;
  category: EventCategory;
  severity: Severity;
  headline: string;
  description: string;
  geometry: TrafficGeometry;
  startedAt: string;
  expiresAt: string | null;
  updatedAt: string;
  url: string | null;
  confidence: Confidence;
  transportation: TransportationDetails;
  raw: Record<string, unknown>;
}

export interface TrafficFlowSegment {
  id: string;
  geometry: { type: "LineString"; coordinates: [number, number][] };
  currentSpeedKph: number | null;
  freeFlowSpeedKph: number | null;
  congestion: "free" | "light" | "moderate" | "heavy" | "severe" | "closed";
  updatedAt: string;
}
