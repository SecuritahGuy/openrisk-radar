import { useQuery } from "@tanstack/react-query";
import type { RiskEvent } from "../types/riskEvent";
import type { EventCategory, EventSource, GeometryType } from "../types/riskEvent";
import type { ResolvedLocation, RadiusOption } from "../types/location";
import { fetchNwsAlerts } from "../services/nws";
import { fetchEarthquakes } from "../services/usgs";
import { fetchFemaDeclarations } from "../services/fema";
import { fetchWildfires } from "../services/nifc";
import { fetchSpcOutlooks } from "../services/spc";
import { fetchNhcStorms } from "../services/nhc";
import { fetchGdacsEvents } from "../services/gdacs";
import { fetchEonetEvents } from "../services/eonet";
import { fetchCurrentWeather } from "../services/weather";
import type { CurrentWeather } from "../services/weather";
import {
  fetchOpenMeteoAirQuality,
  fetchOpenMeteoMarine,
  fetchOpenMeteoWeather,
} from "../services/openMeteo";
import { fetchRiverConditions } from "../services/usgsWater";
import { fetchNearbyVolcanoes } from "../services/usgsVolcanoes";
import type { SupplementalRiskSignal } from "../types/supplementalRisk";

interface UseRiskFeedsResult {
  weatherAlerts: RiskEvent[];
  earthquakes: RiskEvent[];
  femaDeclarations: RiskEvent[];
  wildfires: RiskEvent[];
  spcOutlooks: RiskEvent[];
  nhcStorms: RiskEvent[];
  gdacsEvents: RiskEvent[];
  eonetEvents: RiskEvent[];
  currentWeather: CurrentWeather | null;
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

function toRadiusKm(miles: RadiusOption): number {
  return miles * 1.60934;
}

function errorMessage(error: Error | null): string | null {
  return error?.message ?? null;
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
}: {
  id: string;
  label: string;
  enabled: boolean;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  count: number;
  liveDetail: string;
  emptyDetail: string;
}): SourceHealthItem {
  if (!enabled) {
    return {
      id,
      label,
      status: "disabled",
      count: null,
      detail: "Waiting for a location search.",
    };
  }

  if (error) {
    return {
      id,
      label,
      status: "error",
      count,
      detail: error.message,
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
  return "Weather";
}

function supplementalSource(signal: SupplementalRiskSignal): EventSource {
  if (
    signal.source === "AIRNOW" ||
    signal.source === "COOPS" ||
    signal.source === "USGS_WATER" ||
    signal.source === "VOLCANO"
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
  const nwsQuery = useQuery<RiskEvent[]>({
    queryKey: ["nws-alerts", location?.state],
    queryFn: () => fetchNwsAlerts(location!.state),
    enabled: !!location,
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
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const nifcQuery = useQuery<RiskEvent[]>({
    queryKey: ["nifc-wildfires", location?.latitude, location?.longitude, radiusKm],
    queryFn: () =>
      fetchWildfires(location!.latitude, location!.longitude, radiusKm),
    enabled: !!location,
    staleTime: 120_000,
    retry: 2,
  });

  const spcQuery = useQuery<RiskEvent[]>({
    queryKey: ["spc-outlooks", location?.latitude, location?.longitude, radius],
    queryFn: () =>
      fetchSpcOutlooks(location!.latitude, location!.longitude, radius),
    enabled: !!location,
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

  const supplementalQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: [
      "openmeteo-supplemental",
      location?.latitude,
      location?.longitude,
      location?.city,
      location?.state,
      radiusKm,
    ],
    queryFn: async () => {
      const label = location
        ? `${location.city}, ${location.state}`
        : undefined;
      const results = await Promise.allSettled([
        fetchOpenMeteoAirQuality(location!.latitude, location!.longitude, label),
        fetchOpenMeteoMarine(location!.latitude, location!.longitude, label),
        fetchRiverConditions(
          location!.latitude,
          location!.longitude,
          radiusKm,
          label
        ),
        fetchNearbyVolcanoes(
          location!.latitude,
          location!.longitude,
          radiusKm
        ),
      ]);

      return results.flatMap((result) =>
        result.status === "fulfilled" ? result.value : []
      );
    },
    enabled: !!location,
    staleTime: 300_000,
    retry: 1,
  });

  const weatherAlerts = nwsQuery.data ?? [];
  const earthquakes = usgsQuery.data ?? [];
  const femaDeclarations = femaQuery.data ?? [];
  const wildfires = nifcQuery.data ?? [];
  const spcOutlooks = spcQuery.data ?? [];
  const nhcStorms = nhcQuery.data ?? [];
  const gdacsEvents = gdacsQuery.data ?? [];
  const eonetEvents = eonetQuery.data ?? [];
  const currentWeather = weatherQuery.data ?? null;
  const supplementalSignals = supplementalQuery.data ?? [];
  const supplementalEvents = supplementalSignals.map(supplementalToEvent);
  const allEvents = [...weatherAlerts, ...earthquakes, ...femaDeclarations, ...wildfires, ...spcOutlooks, ...nhcStorms, ...gdacsEvents, ...eonetEvents, ...supplementalEvents];
  const isFetching = nwsQuery.isFetching || usgsQuery.isFetching || femaQuery.isFetching || nifcQuery.isFetching || spcQuery.isFetching || nhcQuery.isFetching || gdacsQuery.isFetching || eonetQuery.isFetching || weatherQuery.isFetching || supplementalQuery.isFetching;
  const isLoading = nwsQuery.isLoading || usgsQuery.isLoading || femaQuery.isLoading || nifcQuery.isLoading || spcQuery.isLoading || nhcQuery.isLoading || gdacsQuery.isLoading || eonetQuery.isLoading || weatherQuery.isLoading || supplementalQuery.isLoading;
  const isError = nwsQuery.isError || usgsQuery.isError || femaQuery.isError || nifcQuery.isError || spcQuery.isError || nhcQuery.isError || gdacsQuery.isError || eonetQuery.isError || weatherQuery.isError || supplementalQuery.isError;

  const errors: string[] = [];
  if (nwsQuery.error) errors.push(`NWS: ${nwsQuery.error.message}`);
  if (usgsQuery.error) errors.push(`USGS: ${usgsQuery.error.message}`);
  if (femaQuery.error) errors.push(`FEMA: ${femaQuery.error.message}`);
  if (nifcQuery.error) errors.push(`NIFC: ${nifcQuery.error.message}`);
  if (spcQuery.error) errors.push(`SPC: ${spcQuery.error.message}`);
  if (nhcQuery.error) errors.push(`NHC: ${nhcQuery.error.message}`);
  if (gdacsQuery.error) errors.push(`GDACS: ${gdacsQuery.error.message}`);
  if (eonetQuery.error) errors.push(`EONET: ${eonetQuery.error.message}`);
  if (supplementalQuery.error) errors.push(`Supplemental: ${supplementalQuery.error.message}`);

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
    wildfires,
    spcOutlooks,
    nhcStorms,
    gdacsEvents,
    eonetEvents,
    currentWeather,
    supplementalSignals,
    allEvents,
    isLoading,
    isError,
    error: errors.length > 0 ? errors.join("; ") : null,
    refetch: () => {
      nwsQuery.refetch();
      usgsQuery.refetch();
      femaQuery.refetch();
      nifcQuery.refetch();
      spcQuery.refetch();
      nhcQuery.refetch();
      gdacsQuery.refetch();
      eonetQuery.refetch();
      weatherQuery.refetch();
      supplementalQuery.refetch();
    },
    lastUpdated,
    isFetching,
  };
}
