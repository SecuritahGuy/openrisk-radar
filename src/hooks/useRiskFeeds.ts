import { useQuery } from "@tanstack/react-query";
import type { RiskEvent } from "../types/riskEvent";
import type { ResolvedLocation, RadiusOption } from "../types/location";
import { fetchNwsAlerts } from "../services/nws";
import { fetchEarthquakes } from "../services/usgs";
import { fetchFemaDeclarations } from "../services/fema";
import { fetchWildfires } from "../services/nifc";
import { fetchCurrentWeather } from "../services/weather";
import type { CurrentWeather } from "../services/weather";

interface UseRiskFeedsResult {
  weatherAlerts: RiskEvent[];
  earthquakes: RiskEvent[];
  femaDeclarations: RiskEvent[];
  wildfires: RiskEvent[];
  currentWeather: CurrentWeather | null;
  allEvents: RiskEvent[];
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => void;
  lastUpdated: Date | null;
  isFetching: boolean;
}

function toRadiusKm(miles: RadiusOption): number {
  return miles * 1.60934;
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

  const weatherQuery = useQuery<CurrentWeather>({
    queryKey: ["current-weather", location?.latitude, location?.longitude],
    queryFn: () =>
      fetchCurrentWeather(location!.latitude, location!.longitude),
    enabled: !!location,
    staleTime: 120_000,
    retry: 1,
  });

  const weatherAlerts = nwsQuery.data ?? [];
  const earthquakes = usgsQuery.data ?? [];
  const femaDeclarations = femaQuery.data ?? [];
  const wildfires = nifcQuery.data ?? [];
  const currentWeather = weatherQuery.data ?? null;
  const allEvents = [...weatherAlerts, ...earthquakes, ...femaDeclarations, ...wildfires];
  const isFetching = nwsQuery.isFetching || usgsQuery.isFetching || femaQuery.isFetching || nifcQuery.isFetching || weatherQuery.isFetching;
  const isLoading = nwsQuery.isLoading || usgsQuery.isLoading || femaQuery.isLoading || nifcQuery.isLoading || weatherQuery.isLoading;
  const isError = nwsQuery.isError || usgsQuery.isError || femaQuery.isError || nifcQuery.isError || weatherQuery.isError;

  const errors: string[] = [];
  if (nwsQuery.error) errors.push(`NWS: ${nwsQuery.error.message}`);
  if (usgsQuery.error) errors.push(`USGS: ${usgsQuery.error.message}`);
  if (femaQuery.error) errors.push(`FEMA: ${femaQuery.error.message}`);
  if (nifcQuery.error) errors.push(`NIFC: ${nifcQuery.error.message}`);

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
    currentWeather,
    allEvents,
    isLoading,
    isError,
    error: errors.length > 0 ? errors.join("; ") : null,
    refetch: () => {
      nwsQuery.refetch();
      usgsQuery.refetch();
      femaQuery.refetch();
      nifcQuery.refetch();
      weatherQuery.refetch();
    },
    lastUpdated,
    isFetching,
  };
}
