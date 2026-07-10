export type EventSource = "NWS" | "USGS" | "USGS_WATER" | "FEMA" | "NIFC" | "SPC" | "NHC" | "GDACS" | "EONET" | "AIRNOW" | "COOPS" | "EMSC";
export type EventCategory = "Weather" | "Seismic" | "River Gauge" | "Disaster" | "Wildfire" | "Tropical" | "Volcanic" | "Ice" | "Landslide" | "Dust" | "Air Quality" | "Coastal Water";
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
