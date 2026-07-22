export type EventSource = "NWS" | "NOAA" | "NOAA_TSUNAMI" | "NWPS" | "USGS" | "USGS_SHAKEMAP" | "USGS_WATER" | "UK_EA" | "VOLCANO" | "DROUGHT" | "FEMA" | "NIFC" | "SPC" | "NHC" | "JMA" | "GDACS" | "EONET" | "AIRNOW" | "COOPS" | "EMSC" | "SPACE_WEATHER" | "METEOALARM" | "WHO" | "GTM" | "DWD" | "GEONET" | "REGIONAL" | "USDOT";
export type EventCategory = "Weather" | "Seismic" | "River Gauge" | "Disaster" | "Wildfire" | "Transportation" | "Tropical" | "Volcanic" | "Drought" | "Ice" | "Landslide" | "Dust" | "Air Quality" | "Coastal Water" | "Space Weather" | "Pollen" | "UV Index";
export type Severity = "Minor" | "Moderate" | "Severe" | "Extreme";
export type GeometryType = "Point" | "Polygon" | "None";
export type Confidence = "Source reported" | "Estimated" | "Unknown";

export interface EventProvider {
  id: string;
  label: string;
  authority: "local" | "state" | "federal" | "international";
  attributionUrl: string;
}

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
  provider?: EventProvider;
  raw: Record<string, unknown>;
}
