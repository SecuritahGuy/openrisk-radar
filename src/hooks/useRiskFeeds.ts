import { useMemo } from "react";
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
import { fetchEmscEvents } from "../services/emsc";
import { fetchCurrentWeather } from "../services/weather";
import type { CurrentWeather } from "../services/weather";
import { fetchAirNowCurrentObservations } from "../services/airnow";
import {
  fetchOpenMeteoAirQuality,
  fetchOpenMeteoMarine,
  fetchOpenMeteoWeather,
} from "../services/openMeteo";
import { fetchRiverConditions } from "../services/usgsWater";
import { fetchNearbyVolcanoes } from "../services/usgsVolcanoes";
import { fetchDroughtAtPoint } from "../services/drought";
import { fetchSwpcConditions } from "../services/swpc";
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
  emscEvents: RiskEvent[];
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

const EMPTY_EVENTS: RiskEvent[] = [];
const EMPTY_SIGNALS: SupplementalRiskSignal[] = [];

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
  error: string | null;
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
  return "Weather";
}

function supplementalSource(signal: SupplementalRiskSignal): EventSource {
  if (
    signal.source === "AIRNOW" ||
    signal.source === "COOPS" ||
    signal.source === "USGS_WATER" ||
    signal.source === "VOLCANO" ||
    signal.source === "DROUGHT" ||
    signal.source === "SPACE_WEATHER"
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

  const emscQuery = useQuery<RiskEvent[]>({
    queryKey: ["emsc-events", location?.latitude, location?.longitude, radiusKm],
    queryFn: () =>
      fetchEmscEvents(location!.latitude, location!.longitude, radiusKm),
    enabled: !!location,
    staleTime: 60_000,
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

  const airNowQuery = useQuery<SupplementalRiskSignal[]>({
    queryKey: [
      "airnow-current",
      location?.latitude,
      location?.longitude,
      radius,
    ],
    queryFn: () =>
      fetchAirNowCurrentObservations(
        location!.latitude,
        location!.longitude,
        radius,
        import.meta.env.VITE_AIRNOW_API_KEY ?? ""
      ),
    enabled: !!location && !!import.meta.env.VITE_AIRNOW_API_KEY,
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

  const weatherAlerts = nwsQuery.data ?? EMPTY_EVENTS;
  const earthquakes = usgsQuery.data ?? EMPTY_EVENTS;
  const femaDeclarations = femaQuery.data ?? EMPTY_EVENTS;
  const wildfires = nifcQuery.data ?? EMPTY_EVENTS;
  const spcOutlooks = spcQuery.data ?? EMPTY_EVENTS;
  const nhcStorms = nhcQuery.data ?? EMPTY_EVENTS;
  const gdacsEvents = gdacsQuery.data ?? EMPTY_EVENTS;
  const eonetEvents = eonetQuery.data ?? EMPTY_EVENTS;
  const emscEvents = emscQuery.data ?? EMPTY_EVENTS;
  const currentWeather = weatherQuery.data ?? null;
  const airQualitySignals = airQualityQuery.data ?? EMPTY_SIGNALS;
  const airNowSignals = airNowQuery.data ?? EMPTY_SIGNALS;
  const marineSignals = marineQuery.data ?? EMPTY_SIGNALS;
  const riverSignals = riverQuery.data ?? EMPTY_SIGNALS;
  const volcanoSignals = volcanoQuery.data ?? EMPTY_SIGNALS;
  const droughtSignals = droughtQuery.data ?? EMPTY_SIGNALS;
  const swpcSignals = swpcQuery.data ?? EMPTY_SIGNALS;
  const supplementalSignals = useMemo(
    () => [
      ...airQualitySignals,
      ...airNowSignals,
      ...marineSignals,
      ...riverSignals,
      ...volcanoSignals,
      ...droughtSignals,
      ...swpcSignals,
    ],
    [
      airQualitySignals,
      airNowSignals,
      marineSignals,
      riverSignals,
      volcanoSignals,
      droughtSignals,
      swpcSignals,
    ]
  );
  const supplementalEvents = useMemo(
    () => supplementalSignals.map(supplementalToEvent),
    [supplementalSignals]
  );
  const allEvents = useMemo(
    () => [
      ...weatherAlerts,
      ...earthquakes,
      ...femaDeclarations,
      ...wildfires,
      ...spcOutlooks,
      ...nhcStorms,
      ...gdacsEvents,
      ...eonetEvents,
      ...emscEvents,
      ...supplementalEvents,
    ],
    [
      weatherAlerts,
      earthquakes,
      femaDeclarations,
      wildfires,
      spcOutlooks,
      nhcStorms,
      gdacsEvents,
      eonetEvents,
      emscEvents,
      supplementalEvents,
    ]
  );
  const isFetching = nwsQuery.isFetching || usgsQuery.isFetching || femaQuery.isFetching || nifcQuery.isFetching || spcQuery.isFetching || nhcQuery.isFetching || gdacsQuery.isFetching || eonetQuery.isFetching || emscQuery.isFetching || weatherQuery.isFetching || airQualityQuery.isFetching || airNowQuery.isFetching || marineQuery.isFetching || riverQuery.isFetching || volcanoQuery.isFetching || droughtQuery.isFetching || swpcQuery.isFetching;
  const isLoading = nwsQuery.isLoading || usgsQuery.isLoading || femaQuery.isLoading || nifcQuery.isLoading || spcQuery.isLoading || nhcQuery.isLoading || gdacsQuery.isLoading || eonetQuery.isLoading || emscQuery.isLoading || weatherQuery.isLoading || airQualityQuery.isLoading || airNowQuery.isLoading || marineQuery.isLoading || riverQuery.isLoading || volcanoQuery.isLoading || droughtQuery.isLoading || swpcQuery.isLoading;
  const isError = nwsQuery.isError || usgsQuery.isError || femaQuery.isError || nifcQuery.isError || spcQuery.isError || nhcQuery.isError || gdacsQuery.isError || eonetQuery.isError || emscQuery.isError || weatherQuery.isError || airQualityQuery.isError || airNowQuery.isError || marineQuery.isError || riverQuery.isError || volcanoQuery.isError || droughtQuery.isError || swpcQuery.isError;

  const errors: string[] = [];
  if (nwsQuery.error) errors.push(`NWS: ${nwsQuery.error.message}`);
  if (usgsQuery.error) errors.push(`USGS: ${usgsQuery.error.message}`);
  if (femaQuery.error) errors.push(`FEMA: ${femaQuery.error.message}`);
  if (nifcQuery.error) errors.push(`NIFC: ${nifcQuery.error.message}`);
  if (spcQuery.error) errors.push(`SPC: ${spcQuery.error.message}`);
  if (nhcQuery.error) errors.push(`NHC: ${nhcQuery.error.message}`);
  if (gdacsQuery.error) errors.push(`GDACS: ${gdacsQuery.error.message}`);
  if (eonetQuery.error) errors.push(`EONET: ${eonetQuery.error.message}`);
  if (emscQuery.error) errors.push(`EMSC: ${emscQuery.error.message}`);
  if (airQualityQuery.error) errors.push(`Open-Meteo Air Quality: ${airQualityQuery.error.message}`);
  if (airNowQuery.error) errors.push(`AirNow: ${airNowQuery.error.message}`);
  if (marineQuery.error) errors.push(`Open-Meteo Marine: ${marineQuery.error.message}`);
  if (riverQuery.error) errors.push(`USGS Water: ${riverQuery.error.message}`);
  if (volcanoQuery.error) errors.push(`USGS Volcanoes: ${volcanoQuery.error.message}`);
  if (droughtQuery.error) errors.push(`Drought Monitor: ${droughtQuery.error.message}`);
  if (swpcQuery.error) errors.push(`SWPC Space Weather: ${swpcQuery.error.message}`);

  const locationEnabled = !!location;
  const sourceHealth: SourceHealthItem[] = [
    queryHealth({
      id: "nws",
      label: "NWS Alerts",
      enabled: locationEnabled,
      isLoading: nwsQuery.isLoading,
      isFetching: nwsQuery.isFetching,
      error: errorMessage(nwsQuery.error),
      count: weatherAlerts.length,
      liveDetail: `${weatherAlerts.length} active alert${weatherAlerts.length !== 1 ? "s" : ""}.`,
      emptyDetail: "No active weather alerts for the selected state.",
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
      enabled: locationEnabled,
      isLoading: femaQuery.isLoading,
      isFetching: femaQuery.isFetching,
      error: errorMessage(femaQuery.error),
      count: femaDeclarations.length,
      liveDetail: `${femaDeclarations.length} declaration${femaDeclarations.length !== 1 ? "s" : ""} on record.`,
      emptyDetail: "No FEMA declarations matched this location.",
    }),
    queryHealth({
      id: "nifc",
      label: "NIFC Wildfires",
      enabled: locationEnabled,
      isLoading: nifcQuery.isLoading,
      isFetching: nifcQuery.isFetching,
      error: errorMessage(nifcQuery.error),
      count: wildfires.length,
      liveDetail: `${wildfires.length} wildfire${wildfires.length !== 1 ? "s" : ""} in range.`,
      emptyDetail: "No active wildfires in range.",
    }),
    queryHealth({
      id: "spc",
      label: "SPC Outlooks",
      enabled: locationEnabled,
      isLoading: spcQuery.isLoading,
      isFetching: spcQuery.isFetching,
      error: errorMessage(spcQuery.error),
      count: spcOutlooks.length,
      liveDetail: `${spcOutlooks.length} outlook polygon${spcOutlooks.length !== 1 ? "s" : ""} nearby.`,
      emptyDetail: "No SPC outlook polygons nearby.",
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
    import.meta.env.VITE_AIRNOW_API_KEY
      ? queryHealth({
          id: "airnow",
          label: "AirNow Current Observations",
          enabled: locationEnabled,
          isLoading: airNowQuery.isLoading,
          isFetching: airNowQuery.isFetching,
          error: errorMessage(airNowQuery.error),
          count: airNowSignals.length,
          liveDetail: `${airNowSignals.length} AirNow observation${airNowSignals.length !== 1 ? "s" : ""}.`,
          emptyDetail: "No AirNow observations returned for this location.",
        })
      : {
          id: "airnow",
          label: "AirNow Current Observations",
          status: "unavailable",
          count: null,
          detail: "Missing VITE_AIRNOW_API_KEY; Open-Meteo air quality remains active.",
        },
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
    wildfires,
    spcOutlooks,
    nhcStorms,
    gdacsEvents,
    eonetEvents,
    emscEvents,
    currentWeather,
    supplementalSignals,
    sourceHealth,
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
      emscQuery.refetch();
      weatherQuery.refetch();
      airQualityQuery.refetch();
      airNowQuery.refetch();
      marineQuery.refetch();
      riverQuery.refetch();
      volcanoQuery.refetch();
      droughtQuery.refetch();
      swpcQuery.refetch();
    },
    lastUpdated,
    isFetching,
  };
}
