import { newEventId } from "../lib/ids";
import type { RiskEvent, Severity } from "../types/riskEvent";

const URL = "https://www.nhc.noaa.gov/CurrentStorms.json";
const MONITOR_RADIUS_FLOOR_MILES = 300;

interface NhcProductLink {
  advNum?: string;
  issuance?: string;
  fileUpdateTime?: string;
  url?: string;
}

interface NhcStorm {
  id: string;
  binNumber: string;
  name: string;
  classification: string;
  intensity: string;
  pressure: string;
  latitude: string;
  longitude: string;
  latitudeNumeric: number;
  longitudeNumeric: number;
  movementDir: number;
  movementSpeed: number;
  lastUpdate: string;
  publicAdvisory: NhcProductLink | null;
  forecastDiscussion: NhcProductLink | null;
  forecastGraphics: NhcProductLink | null;
}

interface NhcResponse {
  activeStorms: NhcStorm[];
}

function classificationName(classification: string): string {
  switch (classification.toUpperCase()) {
    case "DB":
      return "Disturbance";
    case "LO":
      return "Low";
    case "TD":
      return "Tropical Depression";
    case "TS":
      return "Tropical Storm";
    case "HU":
      return "Hurricane";
    case "MH":
      return "Major Hurricane";
    case "SD":
      return "Subtropical Depression";
    case "SS":
      return "Subtropical Storm";
    case "PTC":
      return "Post-Tropical Cyclone";
    default:
      return classification || "Tropical Cyclone";
  }
}

function severityForStorm(storm: NhcStorm): Severity {
  const intensity = Number(storm.intensity);
  const classification = storm.classification.toUpperCase();
  if (classification === "MH" || intensity >= 96) return "Extreme";
  if (classification === "HU" || intensity >= 64) return "Severe";
  if (classification === "TS" || classification === "SS" || intensity >= 34) {
    return "Moderate";
  }
  return "Minor";
}

function milesBetween(latA: number, lngA: number, latB: number, lngB: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthMiles = 3958.8;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) *
      Math.cos(toRad(latB)) *
      Math.sin(dLng / 2) ** 2;
  return earthMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalize(storm: NhcStorm): RiskEvent {
  const classification = classificationName(storm.classification);
  const intensity = Number(storm.intensity);
  const pressure = Number(storm.pressure);
  const advisory = storm.publicAdvisory ?? storm.forecastGraphics ?? storm.forecastDiscussion;

  return {
    id: newEventId(),
    source: "NHC",
    sourceEventId: storm.id,
    type: classification,
    category: "Tropical",
    severity: severityForStorm(storm),
    headline: `NHC ${classification} ${storm.name}`,
    description: [
      `${classification} ${storm.name} is at ${storm.latitude}, ${storm.longitude}.`,
      Number.isFinite(intensity) ? `Maximum sustained winds are ${intensity} kt.` : "",
      Number.isFinite(pressure) ? `Minimum central pressure is ${pressure} mb.` : "",
      Number.isFinite(storm.movementDir) && Number.isFinite(storm.movementSpeed)
        ? `Movement is ${storm.movementDir} degrees at ${storm.movementSpeed} kt.`
        : "",
    ].filter(Boolean).join(" "),
    geometryType: "Point",
    latitude: storm.latitudeNumeric,
    longitude: storm.longitudeNumeric,
    polygon: null,
    startedAt: storm.lastUpdate,
    expiresAt: null,
    updatedAt: advisory?.issuance ?? storm.lastUpdate,
    url: advisory?.url ?? "https://www.nhc.noaa.gov/cyclones/",
    confidence: "Source reported",
    raw: storm as unknown as Record<string, unknown>,
  };
}

export async function fetchNhcStorms(
  lat: number,
  lng: number,
  radiusMiles: number
): Promise<RiskEvent[]> {
  const res = await fetch(URL, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`NHC API returned ${res.status}`);
  const data: NhcResponse = await res.json();
  const monitorRadius = Math.max(radiusMiles, MONITOR_RADIUS_FLOOR_MILES);

  return (data.activeStorms ?? [])
    .filter((storm) =>
      milesBetween(lat, lng, storm.latitudeNumeric, storm.longitudeNumeric) <=
      monitorRadius
    )
    .map(normalize);
}
