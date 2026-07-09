export type GlobalSource = "GDACS" | "EONET";

export type GlobalCategory =
  | "earthquake"
  | "tropical_cyclone"
  | "flood"
  | "volcano"
  | "drought"
  | "wildfire"
  | "severe_storm"
  | "sea_lake_ice"
  | "landslide"
  | "dust_haze"
  | "snow"
  | "temp_extreme"
  | "manmade"
  | "other";

export interface GlobalEvent {
  id: string;
  source: GlobalSource;
  sourceId: string;
  category: GlobalCategory;
  title: string;
  description: string | null;
  severity: "Red" | "Orange" | "Green" | "Unknown";
  severityScore: number | null;
  severityUnit: string | null;
  coordinates: [number, number] | null;
  country: string | null;
  iso3: string | null;
  startedAt: string;
  endedAt: string | null;
  updatedAt: string;
  url: string | null;
  raw: Record<string, unknown>;
}
