import { newEventId } from "../lib/ids";
import type { Severity } from "../types/riskEvent";
import type { SupplementalRiskSignal } from "../types/supplementalRisk";

const BASE = "https://www.airnowapi.org/aq/observation/latLong/current";

interface AirNowObservation {
  DateObserved: string;
  HourObserved: number;
  LocalTimeZone: string;
  ReportingArea: string;
  StateCode: string;
  Latitude: number;
  Longitude: number;
  ParameterName: string;
  AQI: number;
  Category: {
    Number: number;
    Name: string;
  };
}

interface AirNowErrorResponse {
  WebServiceError?: Array<{ Message?: string }>;
}

function mapSeverity(aqi: number): Severity {
  if (aqi >= 201) return "Extreme";
  if (aqi >= 151) return "Severe";
  if (aqi >= 101) return "Moderate";
  return "Minor";
}

function observedTime(observation: AirNowObservation): string {
  const hour = String(observation.HourObserved).padStart(2, "0");
  const parsed = new Date(`${observation.DateObserved}T${hour}:00:00`);
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString();
}

function isAirNowError(data: unknown): data is AirNowErrorResponse {
  return (
    typeof data === "object" &&
    data != null &&
    "WebServiceError" in data
  );
}

function normalize(observation: AirNowObservation): SupplementalRiskSignal {
  const timestamp = observedTime(observation);
  const pollutant = observation.ParameterName;
  const area = observation.ReportingArea;

  return {
    id: newEventId(),
    source: "AIRNOW",
    sourceEventId: `${area}-${pollutant}-${timestamp}`,
    category: "Air Quality",
    type: pollutant,
    severity: mapSeverity(observation.AQI),
    headline: `${area}: ${pollutant} AQI ${observation.AQI}`,
    description: `AirNow ${pollutant} observation for ${area}, ${observation.StateCode}: ${observation.Category.Name}.`,
    geometry: {
      type: "Point",
      latitude: observation.Latitude,
      longitude: observation.Longitude,
    },
    startedAt: timestamp,
    expiresAt: null,
    updatedAt: timestamp,
    url: "https://www.airnow.gov/",
    confidence: "Source reported",
    metrics: [
      { label: "AQI", value: observation.AQI },
      { label: "Category", value: observation.Category.Name },
      { label: "Pollutant", value: pollutant },
    ],
    raw: observation as unknown as Record<string, unknown>,
  };
}

export async function fetchAirNowCurrentObservations(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  apiKey: string
): Promise<SupplementalRiskSignal[]> {
  if (!apiKey.trim()) {
    throw new Error("AirNow API key is required");
  }

  const params = new URLSearchParams({
    format: "application/json",
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    distance: Math.round(radiusMiles).toString(),
    API_KEY: apiKey,
  });
  const res = await fetch(`${BASE}?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`AirNow API returned ${res.status}`);

  const data: unknown = await res.json();
  if (isAirNowError(data)) {
    const message = data.WebServiceError?.[0]?.Message ?? "AirNow API error";
    throw new Error(message);
  }
  if (!Array.isArray(data)) return [];

  return (data as AirNowObservation[]).map(normalize);
}
