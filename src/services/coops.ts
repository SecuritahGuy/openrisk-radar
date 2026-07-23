import { distanceMiles } from "../lib/geo";
import { newEventId } from "../lib/ids";
import type { SupplementalMetric, SupplementalRiskSignal } from "../types/supplementalRisk";

const METADATA_BASE = "https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi";
const DATA_BASE = "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter";
const MAX_OBSERVATION_AGE_MS = 6 * 60 * 60 * 1000;

interface CoopsStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  state?: string;
  tidal?: boolean;
  greatlakes?: boolean;
  floodlevels?: { self?: string };
}

interface CoopsStationsResponse {
  stations?: CoopsStation[];
}

interface CoopsDataResponse {
  metadata?: {
    id: string;
    name: string;
    lat: string;
    lon: string;
  };
  data?: Array<{
    t: string;
    v: string;
    s?: string;
    f?: string;
    q?: string;
  }>;
  error?: { message?: string };
}

let stationCache: CoopsStation[] | null = null;

function parseNoaaTime(value: string): string {
  const [date, time] = value.split(" ");
  if (!date || !time) return "";
  const parsed = new Date(`${date}T${time}:00Z`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
}

function observationIsCurrent(value: string, nowMs: number): boolean {
  const observedAt = Date.parse(value);
  return (
    Number.isFinite(observedAt) &&
    observedAt <= nowMs + 5 * 60_000 &&
    nowMs - observedAt <= MAX_OBSERVATION_AGE_MS
  );
}

function stationPoint(station: CoopsStation): { latitude: number; longitude: number } {
  return { latitude: station.lat, longitude: station.lng };
}

async function fetchStations(): Promise<CoopsStation[]> {
  if (stationCache) return stationCache;

  const res = await fetch(`${METADATA_BASE}/stations.json?type=waterlevels`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`NOAA CO-OPS station service returned ${res.status}`);

  const data: CoopsStationsResponse = await res.json();
  stationCache = (data.stations ?? []).filter(
    (station) =>
      station.id &&
      Number.isFinite(station.lat) &&
      Number.isFinite(station.lng)
  );
  return stationCache;
}

export async function fetchCoopsNearestStations(
  latitude: number,
  longitude: number,
  radiusKm: number,
  limit = 5
): Promise<CoopsStation[]> {
  const radiusMiles = radiusKm / 1.60934;
  const stations = await fetchStations();
  return stations
    .map((station) => ({
      station,
      distance: distanceMiles({ latitude, longitude }, stationPoint(station)),
    }))
    .filter((item) => item.distance <= radiusMiles)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .map((item) => item.station);
}

async function fetchLatestWaterLevel(station: CoopsStation): Promise<CoopsDataResponse | null> {
  const params = new URLSearchParams({
    date: "latest",
    station: station.id,
    product: "water_level",
    datum: "MLLW",
    time_zone: "gmt",
    units: "english",
    application: "OpenRiskRadar",
    format: "json",
  });
  const res = await fetch(`${DATA_BASE}?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`NOAA CO-OPS data service returned ${res.status}`);

  const data: CoopsDataResponse = await res.json();
  if (data.error) return null;
  return data;
}

export async function fetchCoopsWaterLevels(
  latitude: number,
  longitude: number,
  radiusKm: number,
  limit = 5
): Promise<SupplementalRiskSignal[]> {
  const stations = await fetchCoopsNearestStations(latitude, longitude, radiusKm, limit);
  const observations = await Promise.allSettled(
    stations.map(async (station) => ({
      station,
      observation: await fetchLatestWaterLevel(station),
    }))
  );

  return observations.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    const { station, observation } = result.value;
    const latest = observation?.data?.[0];
    if (!latest) return [];

    const waterLevel = Number(latest.v);
    const sigma = latest.s != null ? Number(latest.s) : null;
    const updatedAt = parseNoaaTime(latest.t);
    if (
      !Number.isFinite(waterLevel) ||
      !updatedAt ||
      !observationIsCurrent(updatedAt, Date.now())
    ) return [];
    const metrics: SupplementalMetric[] = [
      { label: "Water level", value: waterLevel, unit: "ft MLLW" },
      ...(sigma != null && Number.isFinite(sigma)
        ? [{ label: "Sigma", value: sigma, unit: "ft" }]
        : []),
      ...(latest.q ? [{ label: "Quality", value: latest.q }] : []),
    ];

    return [
      {
        id: newEventId(),
        source: "COOPS",
        sourceEventId: station.id,
        category: "Coastal Water",
        type: "Water Level",
        severity: "Minor",
        headline: `${station.name} water level`,
        description: `Latest NOAA CO-OPS water level observation for ${station.name}.`,
        geometry: {
          type: "Point",
          latitude: station.lat,
          longitude: station.lng,
        },
        startedAt: updatedAt,
        expiresAt: null,
        updatedAt,
        url: `https://tidesandcurrents.noaa.gov/stationhome.html?id=${station.id}`,
        confidence: "Source reported",
        metrics,
        raw: { station, observation } as unknown as Record<string, unknown>,
      },
    ];
  });
}
