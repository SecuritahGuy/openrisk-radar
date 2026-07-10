import type { Confidence, Severity } from "./riskEvent";

export type SupplementalSource =
  | "SPC"
  | "USGS_WATER"
  | "COOPS"
  | "NHC"
  | "AIRNOW"
  | "SPACE_WEATHER"
  | "DROUGHT"
  | "VOLCANO"
  | "GVP";

export type SupplementalCategory =
  | "Storm Outlook"
  | "River Gauge"
  | "Coastal Water"
  | "Air Quality"
  | "Space Weather"
  | "Drought"
  | "Volcano";

export type SupplementalGeometry =
  | {
      type: "Point";
      latitude: number;
      longitude: number;
    }
  | {
      type: "Polygon";
      polygon: number[][];
    }
  | {
      type: "MultiPolygon";
      polygons: number[][][];
    }
  | {
      type: "None";
    };

export interface SupplementalMetric {
  label: string;
  value: string | number;
  unit?: string;
}

export interface SupplementalRiskSignal {
  id: string;
  source: SupplementalSource;
  sourceEventId: string;
  category: SupplementalCategory;
  type: string;
  severity: Severity;
  headline: string;
  description: string;
  geometry: SupplementalGeometry;
  startedAt: string;
  expiresAt: string | null;
  updatedAt: string;
  url: string | null;
  confidence: Confidence;
  metrics: SupplementalMetric[];
  raw: Record<string, unknown>;
}