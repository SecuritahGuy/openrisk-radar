import { useQueries } from "@tanstack/react-query";
import type { CurrentWeather } from "../services/weather";
import { fetchCurrentWeather } from "../services/weather";
import { fetchOpenMeteoWeather } from "../services/openMeteo";
import { fetchRegionalEvents, supportsRegionalSources } from "../services/regionalSources";
import { fetchTransportationEvents } from "../services/transportation";
import { createLocationFeedContext, fetchLocationEventFeeds } from "../services/locationEventFeeds";
import type { Location, RadiusOption, ResolvedLocation } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import {
  attentionEvents,
  buildRiskSummary,
  type RiskSummary,
} from "../lib/riskInsights";
import {
  buildImpactSummary,
  currentImpactConcernEvents,
  type ImpactSummary,
} from "../lib/impactInsights";
import { canonicalIncidentEvents } from "../lib/incidents";
import { eventMatchesWatch, watchPreferencesFor } from "../lib/watchPreferences";

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
  const resolvedLocation = toResolvedLocation(location);
  const context = createLocationFeedContext(resolvedLocation, radiusMiles);
  const [sharedFeeds, regional, transportation, weather] = await Promise.all([
    fetchLocationEventFeeds(context, "saved-summary"),
    settleEvents(
      "Regional agencies",
      location.country === "USA" && supportsRegionalSources(location.state)
        ? fetchRegionalEvents(
            location.state,
            location.latitude,
            location.longitude,
            radiusKm
          ).then((result) => result.events)
        : Promise.resolve([])
    ),
    settleEvents(
      "Transportation",
      location.country === "USA"
        ? fetchTransportationEvents(
            location.state,
            location.latitude,
            location.longitude,
            radiusKm
          ).then((result) => result.events)
        : Promise.resolve([])
    ),
    settleWeather(location),
  ]);

  const eventResults = [...sharedFeeds, regional, transportation];
  const incidents = canonicalIncidentEvents(
    eventResults.flatMap((result) => result.events)
  );
  const watch = watchPreferencesFor(location);
  const events = incidents.filter((event) => eventMatchesWatch(event, watch));
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
        location.watch,
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
    const concernEvents = currentImpactConcernEvents(
      events,
      resolvedLocation,
      radius
    );
    const risk = buildRiskSummary(concernEvents);
    const impact = buildImpactSummary(events, resolvedLocation, radius);

    return {
      locationId: location.id,
      risk,
      impact,
      topEvent: attentionEvents(concernEvents, resolvedLocation, 1)[0] ?? null,
      currentWeather: payload?.currentWeather ?? null,
      eventCount: concernEvents.length,
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
