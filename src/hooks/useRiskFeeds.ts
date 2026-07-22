import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { RiskEvent } from "../types/riskEvent";
import type { EventCategory, EventSource, GeometryType } from "../types/riskEvent";
import type { ResolvedLocation, RadiusOption } from "../types/location";
import { fetchNwsAlerts, fetchNwsAlertsForPoint } from "../services/nws";
import { fetchEarthquakes } from "../services/usgs";
import { fetchFemaDeclarations } from "../services/fema";
import {
  fetchFemaRiskIndexCounty,
  type FemaRiskIndexCounty,
} from "../services/femaRiskIndex";
import { fetchStormEvents } from "../services/stormEvents";
import { fetchWildfires } from "../services/nifc";
import { fetchSpcOutlooks } from "../services/spc";
import { fetchSpcStormReports } from "../services/spcReports";
import { fetchNhcStorms } from "../services/nhc";
import { fetchGdacsEvents } from "../services/gdacs";
import { fetchEonetEvents } from "../services/eonet";
import { fetchEmscEvents } from "../services/emsc";
import { fetchGeoNetQuakes, supportsGeoNet } from "../services/geonet";
import { fetchCurrentWeather } from "../services/weather";
import type { CurrentWeather } from "../services/weather";
import {
  fetchOpenMeteoAirQuality,
  fetchOpenMeteoMarine,
  fetchOpenMeteoWeather,
  fetchOpenMeteoFlood,
} from "../services/openMeteo";
import { fetchRiverConditions } from "../services/usgsWater";
import { fetchNwpsRiverForecasts } from "../services/nwps";
import { fetchNearbyVolcanoes } from "../services/usgsVolcanoes";
import { fetchDroughtAtPoint } from "../services/drought";
import { fetchTsunamiEvents } from "../services/tsunami";
import { fetchShakeMap } from "../services/shakemap";
import { fetchUkFloods } from "../services/ukFlood";
import { fetchSwpcConditions } from "../services/swpc";
import type { SupplementalRiskSignal } from "../types/supplementalRisk";
import { scopedNwsAlerts } from "../lib/nwsAlertScope";
import { fetchMeteoalarmAlerts, supportsMeteoalarm } from "../services/meteoalarm";
import {
  fetchRegionalEvents,
  supportsRegionalSources,
  type RegionalFeedResult,
} from "../services/regionalSources";
import {
  fetchTransportationEvents,
  type TransportationFeedResult,
} from "../services/transportation";

interface UseRiskFeedsResult {
  weatherAlerts: RiskEvent[];
  earthquakes: RiskEvent[];
  femaDeclarations: RiskEvent[];
  stormEvents: RiskEvent[];
  wildfires: RiskEvent[];
  regionalEvents: RiskEvent[];
  transportationEvents: RiskEvent[];
  spcOutlooks: RiskEvent[];
  spcReports: RiskEvent[];
  nhcStorms: RiskEvent[];
  gdacsEvents: RiskEvent[];
  eonetEvents: RiskEvent[];
  emscEvents: RiskEvent[];
  geonetEvents: RiskEvent[];
  currentWeather: CurrentWeather | null;
  femaRiskIndex: FemaRiskIndexCounty | null;
  supplementalSignals: SupplementalRiskSignal[];
  sourceHealth: SourceHealthItem[];
  allEvents: RiskEvent[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
  isFetching: boolean;
}

export type SourceHealthStatus =
  | "disabled"
  | "loading"
  | "live"
  | "empty"
  | "error"
  | "unavailable";

export interface SourceHealthItem {
  id: string;
  label: string;
  status: SourceHealthStatus;
  count: number | null;
  detail: string;
}

const EMPTY_EVENTS: RiskEvent[] = [];
const EMPTY_SIGNALS: SupplementalRiskSignal[] = [];

function stateCountyFips(location: ResolvedLocation | null): string | null {
  if (!location?.stateFips || !location.countyFips) return null;
  return `${location.stateFips}${location.countyFips.slice(-3)}`;
}

function toRadiusKm(miles: RadiusOption): number {
  return miles * 1.60934;
}

function errorMessage(error: Error | null): string | null {
  return error?.message ?? null;
}

function isEnglandLocation(location: ResolvedLocation | null): boolean {
  if (!location) return false;
  return location.latitude >= 49.8 && location.latitude <= 55.9 &&
    location.longitude >= -6.5 && location.longitude <= 2;
}

function queryHealth({
  id,
  label,
  enabled,
  isLoading,
  isFetching,
  error,
  count,
  liveDetail,
  emptyDetail,
  disabledDetail,
}: {
  id: string;
  label: string;
  enabled: boolean;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  count: number;
  liveDetail: string;
  emptyDetail: string;
  disabledDetail?: string;
}): SourceHealthItem {
  if (!enabled) {
    return {
      id,
      label,
      status: "disabled",
      count: null,
      detail: disabledDetail ?? "Waiting for a location search.",
    };
  }

  if (error) {
    return {
      id,
      label,
      status: "error",
      count,
      detail: error,
    };
  }

  if (isLoading || (isFetching && count === 0)) {
    return {
      id,
      label,
      status: "loading",
      count,
      detail: "Checking source.",
    };
  }

  return {
    id,
    label,
    status: count > 0 ? "live" : "empty",
    count,
    detail: count > 0 ? liveDetail : emptyDetail,
  };
}

function supplementalCategory(signal: SupplementalRiskSignal): EventCategory {
  if (signal.category === "Air Quality") return "Air Quality";
  if (signal.category === "Coastal Water") return "Coastal Water";
  if (signal.category === "River Gauge") return "River Gauge";
  if (signal.category === "Volcano") return "Volcanic";
  if (signal.category === "Drought") return "Drought";
  if (signal.category === "Space Weather") return "Space Weather";
  if (signal.category === "Pollen") return "Pollen";
  if (signal.category === "UV Index") return "UV Index";
  if (signal.category === "Seismic") return "Seismic";
  return "Weather";
}

function supplementalSource(signal: SupplementalRiskSignal): EventSource {
  if (
    signal.source === "AIRNOW" ||
    signal.source === "COOPS" ||
    signal.source === "NWPS" ||
    signal.source === "USGS_WATER" ||
    signal.source === "VOLCANO" ||
    signal.source === "DROUGHT" ||
    signal.source === "SPACE_WEATHER" ||
    signal.source === "NOAA_TSUNAMI" ||
    signal.source === "USGS_SHAKEMAP" ||
    signal.source === "UK_EA"
  ) {
    return signal.source;
  }
  return "SPC";
}

function supplementalGeometry(signal: SupplementalRiskSignal): {
  geometryType: GeometryType;
  latitude: number | null;
  longitude: number | null;
  polygon: number[][] | null;
} {
  if (signal.geometry.type === "Point") {
    return {
      geometryType: "Point",
      latitude: signal.geometry.latitude,
      longitude: signal.geometry.longitude,
      polygon: null,
    };
  }

  if (signal.geometry.type === "Polygon") {
    return {
      geometryType: "Polygon",
      latitude: null,
      longitude: null,
      polygon: signal.geometry.polygon,
    };
  }

  if (signal.geometry.type === "MultiPolygon") {
    const polygon = signal.geometry.polygons[0] ?? null;
    return {
      geometryType: polygon ? "Polygon" : "None",
      latitude: null,
      longitude: null,
      polygon,
    };
  }

  return {
    geometryType: "None",
    latitude: null,
    longitude: null,
    polygon: null,
  };
}

function supplementalToEvent(signal: SupplementalRiskSignal): RiskEvent {
  const geometry = supplementalGeometry(signal);
  return {
    id: `supplemental-${signal.id}`,
    source: supplementalSource(signal),
    sourceEventId: signal.sourceEventId,
    type: signal.type,
    category: supplementalCategory(signal),
    severity: signal.severity,
    headline: signal.headline,
    description: signal.description,
    ...geometry,
    startedAt: signal.startedAt,
    expiresAt: signal.expiresAt,
    updatedAt: signal.updatedAt,
    url: signal.url,
    confidence: signal.confidence,
    raw: {
      supplemental: signal,
      metrics: signal.metrics,
      source: signal.source,
      ...signal.raw,
    },
  };
}

export function useRiskFeeds(
  location: ResolvedLocation | null,
  radius: RadiusOption
): UseRiskFeedsResult {
  const usLocationEnabled = !!location && location.country === "USA";
  const nwsQuery = useQuery<RiskEvent[]>({
    queryKey: ["nws-alerts", location?.state],
    queryFn: () => fetchNwsAlerts(location!.state),
    enabled: usLocationEnabled,
    staleTime: 60_000,
    retry: 2,
  });

  const nwsPointQuery = useQuery<RiskEvent[]>({
    queryKey: ["nws-alerts-point", location?.latitude, location?.longitude],
    queryFn: () =>
      fetchNwsAlertsForPoint(location!.latitude, location!.longitude),
    enabled: usLocationEnabled,
    staleTime: 60_000,
    retry: 2,
  });

  const radiusKm = toRadiusKm(radius);
  const usgsQuery = useQuery<RiskEvent[]>({
    queryKey: ["usgs-quakes", location?.latitude, location?.longitude, radiusKm],
    queryFn: () =>
      fetchEarthquakes(location!.latitude, location!.longitude, radiusKm),
    enabled: !!location,
    staleTime: 60_000,
    retry: 2,
  });

  const femaQuery = useQuery<RiskEvent[]>({
    queryKey: ["fema", location?.state, location?.countyFips],
    queryFn: () =>
      fetchFemaDeclarations(location!.state, location!.countyFips),
    enabled: usLocationEnabled,
    staleTime: 300_000,
    retry: 1,
  });
  const locationStateCountyFips = stateCountyFips(location);

  const stormEventsQuery = useQuery<RiskEvent[]>({
    queryKey: [
      "noaa-storm-events",
      location?.state,
      location?.stateFips,
      location?.county,
      location?.countyFips,
    ],
    queryFn: () =>
      fetchStormEvents(
        location!.state,
        location!.stateFips,
        location!.county,
        location!.countyFips
      ),
    enabled: !!location?.stateFips && !!location.countyFips && !!location.county,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const femaRiskIndexQuery = useQuery<FemaRiskIndexCounty | null>({
    queryKey: ["fema-risk-index", locationStateCountyFips],
    queryFn: () => fetchFemaRiskIndexCounty(locationStateCountyFips),
    enabled: !!locationStateCountyFips,
    staleTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });

  const nifcQuery = useQuery<RiskEvent[]>({
    queryKey: ["nifc-wildfires", location?.latitude, location?.longitude, radiusKm],
    queryFn: () =>
      fetchWildfires(location!.latitude, location!.longitude, radiusKm),
    enabled: usLocationEnabled,
    staleTime: 120_000,
    retry: 2,
  });

  const regionalEnabled =
    location?.country === "USA" && supportsRegionalSources(location.state);
  const regionalQuery = useQuery<RegionalFeedResult>({
    queryKey: [
      "regional-events",
      location?.state,
      location?.latitude,
      location?.longitude,
      radiusKm,
    ],
    queryFn: () =>
      fetchRegionalEvents(
        location!.state,
        location!.latitude,
        location!.longitude,
        radiusKm
      ),
    enabled: regionalEnabled,
    staleTime: 120_000,
    retry: 1,
  });

  const transportationEnabled = location?.country === "USA";
  const transportationQuery = useQuery<TransportationFeedResult>({
    queryKey: [
      "transportation-events",
      location?.state,
      location?.latitude,
      location?.longitude,
      radiusKm,
    ],
    queryFn: () =>
      fetchTransportationEvents(
        location!.state,
        location!.latitude,
        location!.longitude,
        radiusKm
      ),
    enabled: transportationEnabled,
    staleTime: 90_000,
    retry: 1,
  });

  const spcQuery = useQuery<RiskEvent[]>({
    queryKey: ["spc-outlooks", location?.latitude, location?.longitude, radius],
    queryFn: () =>
      fetchSpcOutlooks(location!.latitude, location!.longitude, radius),
    enabled: usLocationEnabled,
    staleTime: 300_000,
    retry: 1,
  });

  const spcReportsQuery = useQuery<RiskEvent[]>({
    queryKey: ["spc-reports", location?.latitude, location?.longitude, radius],
    queryFn: () =>
      fetchSpcStormReports(location!.latitude, location!.longitude, radius),
    enabled: !!location && location.country === "USA",
    staleTime: 300_000,
    retry: 1,
  });

  const nhcQuery = useQuery<RiskEvent[]>({
    queryKey: ["nhc-storms", location?.latitude, location?.longitude, radius],
    queryFn: () =>
      fetchNhcStorms(location!.latitude, location!.longitude, radius),
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const gdacsQuery = useQuery<RiskEvent[]>({
    queryKey: ["gdacs-events", location?.latitude, location?.longitude, radiusKm],
    queryFn: () =>
      fetchGdacsEvents(location!.latitude, location!.longitude, radiusKm),
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const eonetQuery = useQuery<RiskEvent[]>({
    queryKey: ["eonet-events", location?.latitude, location?.longitude, radiusKm],
    queryFn: () =>
      fetchEonetEvents(location!.latitude, location!.longitude, radiusKm),
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const emscQuery = useQuery<RiskEvent[]>({
    queryKey: ["emsc-events", location?.latitude, location?.longitude, radiusKm],
    queryFn: () =>
      fetchEmscEvents(location!.latitude, location!.longitude, radiusKm),
    enabled: !!location,
    staleTime: 60_000,
    retry: 1,
  });

  const geonetEnabled = supportsGeoNet(location);
  const geonetQuery = useQuery<RiskEvent[]>({
    queryKey: ["geonet-quakes", location?.latitude, location?.longitude, radiusKm],
    queryFn: () =>
      fetchGeoNetQuakes(location!.latitude, location!.longitude, radiusKm),
    enabled: geonetEnabled,
    staleTime: 60_000,
    retry: 1,
  });

  const meteoalarmEnabled = supportsMeteoalarm(location);
  const meteoalarmQuery = useQuery<RiskEvent[]>({
    queryKey: ["meteoalarm", location?.country, location?.city, location?.county, location?.state],
    queryFn: () => fetchMeteoalarmAlerts(location!),
    enabled: meteoalarmEnabled,
    staleTime: 300_000,
    retry: 1,
  });

  const weatherQuery = useQuery<CurrentWeather>({
    queryKey: ["current-weather", location?.latitude, location?.longitude],
    queryFn: () =>
      fetchCurrentWeather(location!.latitude, location!.longitude).catch(() =>
        fetchOpenMeteoWeather(location!.latitude, location!.longitude)
      ),
    enabled: !!location,
    staleTime: 120_000,
    retry: 1,
  });

  const label = location
    ? `${location.city}, ${location.state}`
    : undefined;

  const airQualityQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: [
      "openmeteo-air-quality",
      location?.latitude,
      location?.longitude,
    ],
    queryFn: () =>
      fetchOpenMeteoAirQuality(location!.latitude, location!.longitude, label),
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const marineQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: [
      "openmeteo-marine",
      location?.latitude,
      location?.longitude,
    ],
    queryFn: () =>
      fetchOpenMeteoMarine(location!.latitude, location!.longitude, label),
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const floodQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: [
      "openmeteo-flood",
      location?.latitude,
      location?.longitude,
    ],
    queryFn: () =>
      fetchOpenMeteoFlood(location!.latitude, location!.longitude, label),
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const tsunamiQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: ["tsunami-events"],
    queryFn: () => fetchTsunamiEvents(),
    enabled: usLocationEnabled,
    staleTime: 60_000,
    retry: 1,
  });

  const shakemapQuery = useQuery<SupplementalRiskSignal | null>({
    queryKey: ["shakemap", usgsQuery.data?.[0]?.sourceEventId],
    queryFn: () => {
      const topQuake = usgsQuery.data?.[0];
      if (!topQuake?.sourceEventId) return null;
      return fetchShakeMap(topQuake.sourceEventId);
    },
    enabled: !!location && (usgsQuery.data?.length ?? 0) > 0,
    staleTime: 300_000,
    retry: 1,
  });

  const ukFloodQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: [
      "uk-flood",
      location?.latitude,
      location?.longitude,
      radiusKm,
    ],
    queryFn: () =>
      fetchUkFloods(location!.latitude, location!.longitude, radiusKm),
    enabled: isEnglandLocation(location),
    staleTime: 300_000,
    retry: 1,
  });

  const riverQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: [
      "river-conditions",
      location?.latitude,
      location?.longitude,
      radiusKm,
    ],
    queryFn: () =>
      fetchRiverConditions(
        location!.latitude,
        location!.longitude,
        radiusKm,
        label
      ),
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const nwpsQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: [
      "nwps-river-forecasts",
      location?.latitude,
      location?.longitude,
      radiusKm,
    ],
    queryFn: () =>
      fetchNwpsRiverForecasts(
        location!.latitude,
        location!.longitude,
        radiusKm,
        label
      ),
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const volcanoQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: [
      "usgs-volcanoes",
      location?.latitude,
      location?.longitude,
      radiusKm,
    ],
    queryFn: () =>
      fetchNearbyVolcanoes(
        location!.latitude,
        location!.longitude,
        radiusKm
      ),
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const droughtQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: [
      "drought-monitor",
      location?.latitude,
      location?.longitude,
    ],
    queryFn: () =>
      fetchDroughtAtPoint(
        location!.latitude,
        location!.longitude,
        label
      ),
    enabled: !!location,
    staleTime: 6 * 60 * 60_000,
    retry: 1,
  });

  const swpcQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: ["swpc-conditions"],
    queryFn: fetchSwpcConditions,
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const statewideWeatherAlerts = nwsQuery.data ?? EMPTY_EVENTS;
  const pointWeatherAlerts = nwsPointQuery.data ?? EMPTY_EVENTS;
  const weatherAlerts = useMemo(
    () =>
      scopedNwsAlerts({
        pointAlerts: pointWeatherAlerts,
        statewideAlerts: statewideWeatherAlerts,
        location,
        radius,
      }),
    [location, pointWeatherAlerts, radius, statewideWeatherAlerts]
  );
  const earthquakes = usgsQuery.data ?? EMPTY_EVENTS;
  const femaDeclarations = femaQuery.data ?? EMPTY_EVENTS;
  const stormEvents = stormEventsQuery.data ?? EMPTY_EVENTS;
  const wildfires = nifcQuery.data ?? EMPTY_EVENTS;
  const regionalEvents = regionalQuery.data?.events ?? EMPTY_EVENTS;
  const transportationEvents = transportationQuery.data?.events ?? EMPTY_EVENTS;
  const transportationProviderError =
    transportationQuery.data?.providers.length &&
    transportationQuery.data.providers.every((provider) => !provider.available)
      ? transportationQuery.data.warnings.join("; ") || "Registered state transportation feeds are unavailable."
      : null;
  const spcOutlooks = spcQuery.data ?? EMPTY_EVENTS;
  const spcReports = spcReportsQuery.data ?? EMPTY_EVENTS;
  const nhcStorms = nhcQuery.data ?? EMPTY_EVENTS;
  const gdacsEvents = gdacsQuery.data ?? EMPTY_EVENTS;
  const eonetEvents = eonetQuery.data ?? EMPTY_EVENTS;
  const emscEvents = emscQuery.data ?? EMPTY_EVENTS;
  const geonetEvents = geonetQuery.data ?? EMPTY_EVENTS;
  const meteoalarmEvents = meteoalarmQuery.data ?? EMPTY_EVENTS;
  const currentWeather = weatherQuery.data ?? null;
  const airQualitySignals = airQualityQuery.data ?? EMPTY_SIGNALS;
  const marineSignals = marineQuery.data ?? EMPTY_SIGNALS;
  const floodSignals = floodQuery.data ?? EMPTY_SIGNALS;
  const tsunamiSignals = tsunamiQuery.data ?? EMPTY_SIGNALS;
  const shakemapSignals = useMemo(
    () => shakemapQuery.data ? [shakemapQuery.data] : EMPTY_SIGNALS,
    [shakemapQuery.data]
  );
  const ukFloodSignals = ukFloodQuery.data ?? EMPTY_SIGNALS;
  const riverSignals = riverQuery.data ?? EMPTY_SIGNALS;
  const nwpsSignals = nwpsQuery.data ?? EMPTY_SIGNALS;
  const volcanoSignals = volcanoQuery.data ?? EMPTY_SIGNALS;
  const droughtSignals = droughtQuery.data ?? EMPTY_SIGNALS;
  const swpcSignals = swpcQuery.data ?? EMPTY_SIGNALS;
  const supplementalSignals = useMemo(
    () => [
      ...airQualitySignals,
      ...marineSignals,
      ...floodSignals,
      ...tsunamiSignals,
      ...shakemapSignals,
      ...ukFloodSignals,
      ...riverSignals,
      ...nwpsSignals,
      ...volcanoSignals,
      ...droughtSignals,
      ...swpcSignals,
    ],
    [
      airQualitySignals,
      marineSignals,
      floodSignals,
      tsunamiSignals,
      shakemapSignals,
      ukFloodSignals,
      riverSignals,
      nwpsSignals,
      volcanoSignals,
      droughtSignals,
      swpcSignals,
    ]
  );
  const supplementalEvents = useMemo(
    () => supplementalSignals
      .filter((signal) => signal.source !== "USGS_SHAKEMAP")
      .map(supplementalToEvent),
    [supplementalSignals]
  );
  const allEvents = useMemo(
    () => [
      ...weatherAlerts,
      ...earthquakes,
      ...femaDeclarations,
      ...stormEvents,
      ...wildfires,
      ...regionalEvents,
      ...transportationEvents,
      ...spcOutlooks,
      ...spcReports,
      ...nhcStorms,
      ...gdacsEvents,
      ...eonetEvents,
      ...emscEvents,
      ...geonetEvents,
      ...meteoalarmEvents,
      ...supplementalEvents,
    ],
    [
      weatherAlerts,
      earthquakes,
      femaDeclarations,
      stormEvents,
      wildfires,
      regionalEvents,
      transportationEvents,
      spcOutlooks,
      spcReports,
      nhcStorms,
      gdacsEvents,
      eonetEvents,
      emscEvents,
      geonetEvents,
      meteoalarmEvents,
      supplementalEvents,
    ]
  );
  const isFetching = nwsQuery.isFetching || nwsPointQuery.isFetching || usgsQuery.isFetching || femaQuery.isFetching || stormEventsQuery.isFetching || femaRiskIndexQuery.isFetching || nifcQuery.isFetching || regionalQuery.isFetching || transportationQuery.isFetching || spcQuery.isFetching || spcReportsQuery.isFetching || nhcQuery.isFetching || gdacsQuery.isFetching || eonetQuery.isFetching || emscQuery.isFetching || geonetQuery.isFetching || meteoalarmQuery.isFetching || weatherQuery.isFetching || airQualityQuery.isFetching || marineQuery.isFetching || tsunamiQuery.isFetching || shakemapQuery.isFetching || ukFloodQuery.isFetching || riverQuery.isFetching || nwpsQuery.isFetching || volcanoQuery.isFetching || droughtQuery.isFetching || swpcQuery.isFetching;
  const isLoading = nwsQuery.isLoading || nwsPointQuery.isLoading || usgsQuery.isLoading || femaQuery.isLoading || stormEventsQuery.isLoading || femaRiskIndexQuery.isLoading || nifcQuery.isLoading || regionalQuery.isLoading || transportationQuery.isLoading || spcQuery.isLoading || spcReportsQuery.isLoading || nhcQuery.isLoading || gdacsQuery.isLoading || eonetQuery.isLoading || emscQuery.isLoading || geonetQuery.isLoading || meteoalarmQuery.isLoading || weatherQuery.isLoading || airQualityQuery.isLoading || marineQuery.isLoading || tsunamiQuery.isLoading || shakemapQuery.isLoading || ukFloodQuery.isLoading || riverQuery.isLoading || nwpsQuery.isLoading || volcanoQuery.isLoading || droughtQuery.isLoading || swpcQuery.isLoading;
  const isError = nwsQuery.isError || nwsPointQuery.isError || usgsQuery.isError || femaQuery.isError || stormEventsQuery.isError || femaRiskIndexQuery.isError || nifcQuery.isError || regionalQuery.isError || transportationQuery.isError || spcQuery.isError || spcReportsQuery.isError || nhcQuery.isError || gdacsQuery.isError || eonetQuery.isError || emscQuery.isError || geonetQuery.isError || meteoalarmQuery.isError || weatherQuery.isError || airQualityQuery.isError || marineQuery.isError || tsunamiQuery.isError || shakemapQuery.isError || ukFloodQuery.isError || riverQuery.isError || nwpsQuery.isError || volcanoQuery.isError || droughtQuery.isError || swpcQuery.isError;

  const errors: string[] = [];
  if (nwsQuery.error) errors.push(`NWS: ${nwsQuery.error.message}`);
  if (nwsPointQuery.error) errors.push(`NWS Point: ${nwsPointQuery.error.message}`);
  if (usgsQuery.error) errors.push(`USGS: ${usgsQuery.error.message}`);
  if (femaQuery.error) errors.push(`FEMA: ${femaQuery.error.message}`);
  if (stormEventsQuery.error) {
    errors.push(`NOAA Storm Events: ${stormEventsQuery.error.message}`);
  }
  if (femaRiskIndexQuery.error) {
    errors.push(`FEMA NRI: ${femaRiskIndexQuery.error.message}`);
  }
  if (nifcQuery.error) errors.push(`NIFC: ${nifcQuery.error.message}`);
  if (regionalQuery.error) errors.push(`Regional sources: ${regionalQuery.error.message}`);
  if (transportationQuery.error) errors.push(`Transportation: ${transportationQuery.error.message}`);
  if (spcQuery.error) errors.push(`SPC: ${spcQuery.error.message}`);
  if (spcReportsQuery.error) errors.push(`SPC Reports: ${spcReportsQuery.error.message}`);
  if (nhcQuery.error) errors.push(`NHC: ${nhcQuery.error.message}`);
  if (gdacsQuery.error) errors.push(`GDACS: ${gdacsQuery.error.message}`);
  if (eonetQuery.error) errors.push(`EONET: ${eonetQuery.error.message}`);
  if (emscQuery.error) errors.push(`EMSC: ${emscQuery.error.message}`);
  if (geonetQuery.error) errors.push(`GeoNet: ${geonetQuery.error.message}`);
  if (meteoalarmQuery.error) errors.push(`Meteoalarm: ${meteoalarmQuery.error.message}`);
  if (airQualityQuery.error) errors.push(`Open-Meteo Air Quality: ${airQualityQuery.error.message}`);
  if (marineQuery.error) errors.push(`Open-Meteo Marine: ${marineQuery.error.message}`);
  if (floodQuery.error) errors.push(`Open-Meteo Flood: ${floodQuery.error.message}`);
  if (tsunamiQuery.error) errors.push(`NOAA Tsunami: ${tsunamiQuery.error.message}`);
  if (shakemapQuery.error) errors.push(`ShakeMap: ${shakemapQuery.error.message}`);
  if (ukFloodQuery.error) errors.push(`UK Flood: ${ukFloodQuery.error.message}`);
  if (riverQuery.error) errors.push(`USGS Water: ${riverQuery.error.message}`);
  if (nwpsQuery.error) errors.push(`NWPS River Forecasts: ${nwpsQuery.error.message}`);
  if (volcanoQuery.error) errors.push(`USGS Volcanoes: ${volcanoQuery.error.message}`);
  if (droughtQuery.error) errors.push(`Drought Monitor: ${droughtQuery.error.message}`);
  if (swpcQuery.error) errors.push(`SWPC Space Weather: ${swpcQuery.error.message}`);

  const locationEnabled = !!location;
  const sourceHealth: SourceHealthItem[] = [
    queryHealth({
      id: "nws",
      label: "NWS Alerts",
      enabled: usLocationEnabled,
      isLoading: nwsQuery.isLoading || nwsPointQuery.isLoading,
      isFetching: nwsQuery.isFetching || nwsPointQuery.isFetching,
      error: [errorMessage(nwsQuery.error), errorMessage(nwsPointQuery.error)]
        .filter((message): message is string => message != null)
        .join("; ") || null,
      count: weatherAlerts.length,
      liveDetail: `${weatherAlerts.length} active alert${weatherAlerts.length !== 1 ? "s" : ""} affecting or near this location.`,
      emptyDetail: "No active weather alerts matched this location and radius.",
      disabledDetail: "Available for U.S. locations.",
    }),
    queryHealth({
      id: "usgs",
      label: "USGS Earthquakes",
      enabled: locationEnabled,
      isLoading: usgsQuery.isLoading,
      isFetching: usgsQuery.isFetching,
      error: errorMessage(usgsQuery.error),
      count: earthquakes.length,
      liveDetail: `${earthquakes.length} earthquake${earthquakes.length !== 1 ? "s" : ""} in range.`,
      emptyDetail: "No earthquakes in the selected radius.",
    }),
    queryHealth({
      id: "fema",
      label: "FEMA Disasters",
      enabled: usLocationEnabled,
      isLoading: femaQuery.isLoading,
      isFetching: femaQuery.isFetching,
      error: errorMessage(femaQuery.error),
      count: femaDeclarations.length,
      liveDetail: `${femaDeclarations.length} declaration${femaDeclarations.length !== 1 ? "s" : ""} on record.`,
      emptyDetail: "No FEMA declarations matched this location.",
      disabledDetail: "Available for U.S. locations.",
    }),
    queryHealth({
      id: "fema-nri",
      label: "FEMA National Risk Index",
      enabled: locationEnabled && !!locationStateCountyFips,
      isLoading: femaRiskIndexQuery.isLoading,
      isFetching: femaRiskIndexQuery.isFetching,
      error: errorMessage(femaRiskIndexQuery.error),
      count: femaRiskIndexQuery.data ? 1 : 0,
      liveDetail: femaRiskIndexQuery.data
        ? `${femaRiskIndexQuery.data.riskRating} baseline county risk.`
        : "Baseline risk available.",
      emptyDetail: "No FEMA NRI county record matched this location.",
    }),
    queryHealth({
      id: "noaa-storm-events",
      label: "NOAA Storm Events",
      enabled: locationEnabled && !!location?.stateFips && !!location.countyFips && !!location.county,
      isLoading: stormEventsQuery.isLoading,
      isFetching: stormEventsQuery.isFetching,
      error: errorMessage(stormEventsQuery.error),
      count: stormEvents.length,
      liveDetail: `${stormEvents.length} notable storm event${stormEvents.length !== 1 ? "s" : ""} from the last 10 years.`,
      emptyDetail: "No NOAA storm events matched this county in the last 10 years.",
    }),
    queryHealth({
      id: "nifc",
      label: "NIFC Wildfires",
      enabled: usLocationEnabled,
      isLoading: nifcQuery.isLoading,
      isFetching: nifcQuery.isFetching,
      error: errorMessage(nifcQuery.error),
      count: wildfires.length,
      liveDetail: `${wildfires.length} wildfire${wildfires.length !== 1 ? "s" : ""} in range.`,
      emptyDetail: "No active wildfires in range.",
      disabledDetail: "Available for U.S. locations.",
    }),
    queryHealth({
      id: "regional",
      label: regionalQuery.data?.providers.map((provider) => provider.label).join(", ") || "State and Local Agencies",
      enabled: regionalEnabled,
      isLoading: regionalQuery.isLoading,
      isFetching: regionalQuery.isFetching,
      error: errorMessage(regionalQuery.error),
      count: regionalEvents.length,
      liveDetail: `${regionalEvents.length} state or local signal${regionalEvents.length !== 1 ? "s" : ""} in range.`,
      emptyDetail: "No active state or local agency signals in range.",
      disabledDetail: "No production-ready regional source is configured for this state.",
    }),
    queryHealth({
      id: "transportation",
      label: transportationQuery.data?.providers.map((provider) => provider.label).join(", ") || "USDOT Work Zones",
      enabled: transportationEnabled,
      isLoading: transportationQuery.isLoading,
      isFetching: transportationQuery.isFetching,
      error: errorMessage(transportationQuery.error) ?? transportationProviderError,
      count: transportationEvents.length,
      liveDetail: `${transportationEvents.length} active or upcoming work zone${transportationEvents.length !== 1 ? "s" : ""} in range.`,
      emptyDetail: transportationQuery.data?.providers.length
        ? "No active or upcoming work zones in range."
        : "No keyless WZDx feed is registered for this state.",
      disabledDetail: "Available for U.S. locations with a registered WZDx feed.",
    }),
    queryHealth({
      id: "spc",
      label: "SPC Outlooks",
      enabled: usLocationEnabled,
      isLoading: spcQuery.isLoading,
      isFetching: spcQuery.isFetching,
      error: errorMessage(spcQuery.error),
      count: spcOutlooks.length,
      liveDetail: `${spcOutlooks.length} outlook polygon${spcOutlooks.length !== 1 ? "s" : ""} nearby.`,
      emptyDetail: "No SPC outlook polygons nearby.",
      disabledDetail: "Available for U.S. locations.",
    }),
    queryHealth({
      id: "spc-reports",
      label: "SPC Storm Reports",
      enabled: locationEnabled && location?.country === "USA",
      isLoading: spcReportsQuery.isLoading,
      isFetching: spcReportsQuery.isFetching,
      error: errorMessage(spcReportsQuery.error),
      count: spcReports.length,
      liveDetail: `${spcReports.length} preliminary observed storm report${spcReports.length !== 1 ? "s" : ""} nearby.`,
      emptyDetail: "No preliminary SPC storm reports nearby today.",
      disabledDetail: "Available for U.S. locations.",
    }),
    queryHealth({
      id: "nhc",
      label: "NHC Tropical",
      enabled: locationEnabled,
      isLoading: nhcQuery.isLoading,
      isFetching: nhcQuery.isFetching,
      error: errorMessage(nhcQuery.error),
      count: nhcStorms.length,
      liveDetail: `${nhcStorms.length} tropical cyclone signal${nhcStorms.length !== 1 ? "s" : ""} in range.`,
      emptyDetail: "No active tropical cyclones in range.",
    }),
    queryHealth({
      id: "gdacs",
      label: "GDACS",
      enabled: locationEnabled,
      isLoading: gdacsQuery.isLoading,
      isFetching: gdacsQuery.isFetching,
      error: errorMessage(gdacsQuery.error),
      count: gdacsEvents.length,
      liveDetail: `${gdacsEvents.length} global disaster event${gdacsEvents.length !== 1 ? "s" : ""} nearby.`,
      emptyDetail: "No GDACS events nearby.",
    }),
    queryHealth({
      id: "eonet",
      label: "NASA EONET",
      enabled: locationEnabled,
      isLoading: eonetQuery.isLoading,
      isFetching: eonetQuery.isFetching,
      error: errorMessage(eonetQuery.error),
      count: eonetEvents.length,
      liveDetail: `${eonetEvents.length} earth observation event${eonetEvents.length !== 1 ? "s" : ""} nearby.`,
      emptyDetail: "No NASA EONET events nearby.",
    }),
    queryHealth({
      id: "emsc",
      label: "EMSC Earthquakes",
      enabled: locationEnabled,
      isLoading: emscQuery.isLoading,
      isFetching: emscQuery.isFetching,
      error: errorMessage(emscQuery.error),
      count: emscEvents.length,
      liveDetail: `${emscEvents.length} EMSC earthquake${emscEvents.length !== 1 ? "s" : ""} in range.`,
      emptyDetail: "No EMSC earthquakes in the selected radius.",
    }),
    queryHealth({
      id: "geonet",
      label: "GeoNet New Zealand",
      enabled: geonetEnabled,
      isLoading: geonetQuery.isLoading,
      isFetching: geonetQuery.isFetching,
      error: errorMessage(geonetQuery.error),
      count: geonetEvents.length,
      liveDetail: `${geonetEvents.length} GeoNet earthquake${geonetEvents.length !== 1 ? "s" : ""} in range.`,
      emptyDetail: "No GeoNet earthquakes in the selected radius.",
      disabledDetail: "Available automatically for New Zealand locations.",
    }),
    queryHealth({
      id: "meteoalarm",
      label: "Meteoalarm Europe",
      enabled: meteoalarmEnabled,
      isLoading: meteoalarmQuery.isLoading,
      isFetching: meteoalarmQuery.isFetching,
      error: errorMessage(meteoalarmQuery.error),
      count: meteoalarmEvents.length,
      liveDetail: `${meteoalarmEvents.length} official warning${meteoalarmEvents.length !== 1 ? "s" : ""} matched this locality.`,
      emptyDetail: "No active Meteoalarm warnings matched this locality.",
      disabledDetail: "Available for supported European countries.",
    }),
    queryHealth({
      id: "weather",
      label: "Current Conditions",
      enabled: locationEnabled,
      isLoading: weatherQuery.isLoading,
      isFetching: weatherQuery.isFetching,
      error: errorMessage(weatherQuery.error),
      count: currentWeather ? 1 : 0,
      liveDetail: currentWeather ? `${currentWeather.source} observation available.` : "Observation available.",
      emptyDetail: "No current observation returned.",
    }),
    queryHealth({
      id: "openmeteo-air",
      label: "Open-Meteo Air Quality",
      enabled: locationEnabled,
      isLoading: airQualityQuery.isLoading,
      isFetching: airQualityQuery.isFetching,
      error: errorMessage(airQualityQuery.error),
      count: airQualitySignals.length,
      liveDetail: `${airQualitySignals.length} air quality signal${airQualitySignals.length !== 1 ? "s" : ""}.`,
      emptyDetail: "No elevated air quality signal.",
    }),
    queryHealth({
      id: "openmeteo-marine",
      label: "Open-Meteo Marine",
      enabled: locationEnabled,
      isLoading: marineQuery.isLoading,
      isFetching: marineQuery.isFetching,
      error: errorMessage(marineQuery.error),
      count: marineSignals.length,
      liveDetail: `${marineSignals.length} marine signal${marineSignals.length !== 1 ? "s" : ""}.`,
      emptyDetail: "No coastal water signal for this location.",
    }),
    queryHealth({
      id: "openmeteo-flood",
      label: "Open-Meteo Flood",
      enabled: locationEnabled,
      isLoading: floodQuery.isLoading,
      isFetching: floodQuery.isFetching,
      error: errorMessage(floodQuery.error),
      count: floodSignals.length,
      liveDetail: `${floodSignals.length} flood signal${floodSignals.length !== 1 ? "s" : ""}.`,
      emptyDetail: "No river discharge data for this location.",
    }),
    queryHealth({
      id: "noaa-tsunami",
      label: "NOAA Tsunami",
      enabled: usLocationEnabled,
      isLoading: tsunamiQuery.isLoading,
      isFetching: tsunamiQuery.isFetching,
      error: errorMessage(tsunamiQuery.error),
      count: tsunamiSignals.length,
      liveDetail: `${tsunamiSignals.length} tsunami signal${tsunamiSignals.length !== 1 ? "s" : ""}.`,
      emptyDetail: "No active tsunami events.",
      disabledDetail: "Available for U.S. and territorial warning-center coverage.",
    }),
    queryHealth({
      id: "usgs-shakemap",
      label: "USGS ShakeMap",
      enabled: locationEnabled && (usgsQuery.data?.length ?? 0) > 0,
      isLoading: shakemapQuery.isLoading,
      isFetching: shakemapQuery.isFetching,
      error: errorMessage(shakemapQuery.error),
      count: shakemapSignals.length,
      liveDetail: shakemapSignals.length > 0 ? "ShakeMap available for largest quake." : "No ShakeMap data for recent quakes.",
      emptyDetail: "No ShakeMap data for recent quakes.",
    }),
    queryHealth({
      id: "uk-flood",
      label: "UK Environment Agency Flood",
      enabled: isEnglandLocation(location),
      isLoading: ukFloodQuery.isLoading,
      isFetching: ukFloodQuery.isFetching,
      error: errorMessage(ukFloodQuery.error),
      count: ukFloodSignals.length,
      liveDetail: `${ukFloodSignals.length} UK flood signal${ukFloodSignals.length !== 1 ? "s" : ""}.`,
      emptyDetail: "No UK flood warnings for this area.",
    }),
    queryHealth({
      id: "usgs-water",
      label: "USGS Water",
      enabled: locationEnabled,
      isLoading: riverQuery.isLoading,
      isFetching: riverQuery.isFetching,
      error: errorMessage(riverQuery.error),
      count: riverSignals.length,
      liveDetail: `${riverSignals.length} river gauge signal${riverSignals.length !== 1 ? "s" : ""}.`,
      emptyDetail: "No nearby river gauge signals.",
    }),
    queryHealth({
      id: "nwps-river-forecasts",
      label: "NOAA River Forecasts",
      enabled: locationEnabled,
      isLoading: nwpsQuery.isLoading,
      isFetching: nwpsQuery.isFetching,
      error: errorMessage(nwpsQuery.error),
      count: nwpsSignals.length,
      liveDetail: `${nwpsSignals.length} elevated river forecast${nwpsSignals.length !== 1 ? "s" : ""}.`,
      emptyDetail: "No NWPS action-stage or flood forecast signals in range.",
    }),
    queryHealth({
      id: "usgs-volcanoes",
      label: "USGS Volcanoes",
      enabled: locationEnabled,
      isLoading: volcanoQuery.isLoading,
      isFetching: volcanoQuery.isFetching,
      error: errorMessage(volcanoQuery.error),
      count: volcanoSignals.length,
      liveDetail: `${volcanoSignals.length} elevated volcano signal${volcanoSignals.length !== 1 ? "s" : ""}.`,
      emptyDetail: "No elevated volcano status nearby.",
    }),
    queryHealth({
      id: "drought",
      label: "Drought Monitor",
      enabled: locationEnabled,
      isLoading: droughtQuery.isLoading,
      isFetching: droughtQuery.isFetching,
      error: errorMessage(droughtQuery.error),
      count: droughtSignals.length,
      liveDetail: droughtSignals[0]?.headline ?? "Drought rating available.",
      emptyDetail: "No drought classification at this location.",
    }),
    queryHealth({
      id: "swpc",
      label: "SWPC Space Weather",
      enabled: locationEnabled,
      isLoading: swpcQuery.isLoading,
      isFetching: swpcQuery.isFetching,
      error: errorMessage(swpcQuery.error),
      count: swpcSignals.length,
      liveDetail: `${swpcSignals.length} space weather signal${swpcSignals.length !== 1 ? "s" : ""}.`,
      emptyDetail: "No elevated space weather signal.",
    }),
  ];

  const lastUpdated = (() => {
    const dates = allEvents
      .map((e) => new Date(e.updatedAt))
      .filter((d) => !isNaN(d.getTime()));
    return dates.length > 0
      ? new Date(Math.max(...dates.map((d) => d.getTime())))
      : null;
  })();

  return {
    weatherAlerts,
    earthquakes,
    femaDeclarations,
    stormEvents,
    wildfires,
    regionalEvents,
    transportationEvents,
    spcOutlooks,
    spcReports,
    nhcStorms,
    gdacsEvents,
    eonetEvents,
    emscEvents,
    geonetEvents,
    currentWeather,
    femaRiskIndex: femaRiskIndexQuery.data ?? null,
    supplementalSignals,
    sourceHealth,
    allEvents,
    isLoading,
    isError,
    error: errors.length > 0 ? errors.join("; ") : null,
    refetch: () => {
      nwsQuery.refetch();
      nwsPointQuery.refetch();
      usgsQuery.refetch();
      femaQuery.refetch();
      stormEventsQuery.refetch();
      femaRiskIndexQuery.refetch();
      nifcQuery.refetch();
      regionalQuery.refetch();
      transportationQuery.refetch();
      spcQuery.refetch();
      spcReportsQuery.refetch();
      nhcQuery.refetch();
      gdacsQuery.refetch();
      eonetQuery.refetch();
      emscQuery.refetch();
      geonetQuery.refetch();
      meteoalarmQuery.refetch();
      weatherQuery.refetch();
      airQualityQuery.refetch();
      marineQuery.refetch();
      riverQuery.refetch();
      nwpsQuery.refetch();
      volcanoQuery.refetch();
      droughtQuery.refetch();
      swpcQuery.refetch();
    },
    lastUpdated,
    isFetching,
  };
}
