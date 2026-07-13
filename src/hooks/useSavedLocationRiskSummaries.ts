import { useQueries } from "@tanstack/react-query";
import type { CurrentWeather } from "../services/weather";
import { fetchCurrentWeather } from "../services/weather";
import { fetchOpenMeteoWeather } from "../services/openMeteo";
import { fetchNwsAlertsForPoint } from "../services/nws";
import { fetchEarthquakes } from "../services/usgs";
import { fetchWildfires } from "../services/nifc";
import { fetchSpcOutlooks } from "../services/spc";
import type { Location, RadiusOption, ResolvedLocation } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import {
  attentionEvents,
  buildRiskSummary,
  type RiskSummary,
} from "../lib/riskInsights";
import { buildImpactSummary, type ImpactSummary } from "../lib/impactInsights";

export interface SavedLocationRiskSummary {
  locationId: string;
  risk: RiskSummary;
  impact: ImpactSummary;
  topEvent: RiskEvent | null;
  currentWeather: CurrentWeather | null;
  eventCount: number;
  liveSourceCount: number;
  errorCount: number;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
}

interface SavedLocationSummaryPayload {
  events: RiskEvent[];
  currentWeather: CurrentWeather | null;
  liveSourceCount: number;
  errorCount: number;
  errors: string[];
}

function toResolvedLocation(location: Location): ResolvedLocation {
  return {
    city: location.city,
    state: location.state,
    postalCode: location.postalCode,
    country: location.country,
    latitude: location.latitude,
    longitude: location.longitude,
    county: location.county,
    stateFips: location.stateFips,
    countyFips: location.countyFips,
  };
}

function toRadiusKm(miles: number): number {
  return miles * 1.60934;
}

function toRadiusOption(miles: number): RadiusOption {
  if (miles <= 10) return 10;
  if (miles <= 25) return 25;
  if (miles <= 50) return 50;
  return 100;
}

async function settleEvents(
  label: string,
  promise: Promise<RiskEvent[]>
): Promise<{ label: string; events: RiskEvent[]; error: string | null }> {
  try {
    return { label, events: await promise, error: null };
  } catch (error) {
    return {
      label,
      events: [],
      error: error instanceof Error ? error.message : `${label} failed`,
    };
  }
}

async function settleWeather(
  location: Location
): Promise<{ weather: CurrentWeather | null; error: string | null }> {
  try {
    const weather = await fetchCurrentWeather(
      location.latitude,
      location.longitude
    ).catch(() => fetchOpenMeteoWeather(location.latitude, location.longitude));
    return { weather, error: null };
  } catch (error) {
    return {
      weather: null,
      error: error instanceof Error ? error.message : "Weather failed",
    };
  }
}

async function fetchSavedLocationSummary(
  location: Location
): Promise<SavedLocationSummaryPayload> {
  const radiusMiles = location.radiusMiles || 50;
  const radiusKm = toRadiusKm(radiusMiles);
  const [nws, usgs, nifc, spc, weather] = await Promise.all([
    settleEvents(
      "NWS",
      fetchNwsAlertsForPoint(location.latitude, location.longitude)
    ),
    settleEvents(
      "USGS",
      fetchEarthquakes(location.latitude, location.longitude, radiusKm)
    ),
    settleEvents(
      "NIFC",
      fetchWildfires(location.latitude, location.longitude, radiusKm)
    ),
    settleEvents(
      "SPC",
      fetchSpcOutlooks(location.latitude, location.longitude, radiusMiles)
    ),
    settleWeather(location),
  ]);

  const eventResults = [nws, usgs, nifc, spc];
  const events = eventResults.flatMap((result) => result.events);
  const errors = [
    ...eventResults
      .filter((result) => result.error)
      .map((result) => `${result.label}: ${result.error}`),
    weather.error ? `Weather: ${weather.error}` : null,
  ].filter((value): value is string => value != null);

  return {
    events,
    currentWeather: weather.weather,
    liveSourceCount:
      eventResults.filter((result) => result.events.length > 0).length +
      (weather.weather ? 1 : 0),
    errorCount: errors.length,
    errors,
  };
}

export function useSavedLocationRiskSummaries(
  savedLocations: Location[]
): SavedLocationRiskSummary[] {
  const queries = useQueries({
    queries: savedLocations.map((location) => ({
      queryKey: [
        "saved-location-risk-summary",
        location.id,
        location.latitude,
        location.longitude,
        location.radiusMiles,
      ],
      queryFn: () => fetchSavedLocationSummary(location),
      staleTime: 120_000,
      retry: 1,
      enabled: savedLocations.length > 0,
    })),
  });

  return savedLocations.map((location, index) => {
    const query = queries[index];
    const payload = query.data;
    const events = payload?.events ?? [];
    const resolvedLocation = toResolvedLocation(location);
    const radius = toRadiusOption(location.radiusMiles || 50);
    const risk = buildRiskSummary(events);
    const impact = buildImpactSummary(events, resolvedLocation, radius);

    return {
      locationId: location.id,
      risk,
      impact,
      topEvent: attentionEvents(events, resolvedLocation, 1)[0] ?? null,
      currentWeather: payload?.currentWeather ?? null,
      eventCount: events.length,
      liveSourceCount: payload?.liveSourceCount ?? 0,
      errorCount: payload?.errorCount ?? 0,
      isLoading: query.isLoading,
      isFetching: query.isFetching,
      error:
        payload?.errors.join("; ") ||
        (query.error instanceof Error ? query.error.message : null),
    };
  });
}
