import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { milesToKm } from "../lib/geo";
import { fetchAirNowCurrentObservations } from "../services/airnow";
import { fetchCoopsWaterLevels } from "../services/coops";
import { fetchNhcActiveStorms } from "../services/nhc";
import { fetchSpcConvectiveOutlooks } from "../services/spc";
import { fetchUsgsWaterObservations } from "../services/usgsWater";
import type { RadiusOption, ResolvedLocation } from "../types/location";
import type { SupplementalRiskSignal } from "../types/supplementalRisk";

const EMPTY_SIGNALS: SupplementalRiskSignal[] = [];

export interface SupplementalRiskFeedsOptions {
  enabled?: boolean;
  airNowApiKey?: string;
  includeAirNow?: boolean;
  stationLimit?: number;
}

export interface UseSupplementalRiskFeedsResult {
  spcOutlooks: SupplementalRiskSignal[];
  waterGauges: SupplementalRiskSignal[];
  coastalWaterLevels: SupplementalRiskSignal[];
  tropicalCyclones: SupplementalRiskSignal[];
  airQuality: SupplementalRiskSignal[];
  allSignals: SupplementalRiskSignal[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: string | null;
  refetch: () => void;
}

function queryErrorMessage(label: string, error: Error | null): string | null {
  return error ? `${label}: ${error.message}` : null;
}

export function useSupplementalRiskFeeds(
  location: ResolvedLocation | null,
  radius: RadiusOption,
  options: SupplementalRiskFeedsOptions = {}
): UseSupplementalRiskFeedsResult {
  const enabled = (options.enabled ?? true) && !!location;
  const radiusKm = milesToKm(radius);
  const airNowApiKey = options.airNowApiKey ?? import.meta.env.VITE_AIRNOW_API_KEY ?? "";
  const stationLimit = options.stationLimit ?? 6;

  const spcQuery = useQuery({
    queryKey: ["supplemental-risk", "spc"],
    queryFn: () => fetchSpcConvectiveOutlooks(),
    enabled,
    staleTime: 15 * 60_000,
    retry: 1,
  });

  const waterQuery = useQuery({
    queryKey: [
      "supplemental-risk",
      "usgs-water",
      location?.latitude,
      location?.longitude,
      radiusKm,
      stationLimit,
    ],
    queryFn: () =>
      fetchUsgsWaterObservations(
        location!.latitude,
        location!.longitude,
        radiusKm,
        stationLimit
      ),
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const coopsQuery = useQuery({
    queryKey: [
      "supplemental-risk",
      "coops",
      location?.latitude,
      location?.longitude,
      radiusKm,
      stationLimit,
    ],
    queryFn: () =>
      fetchCoopsWaterLevels(
        location!.latitude,
        location!.longitude,
        radiusKm,
        stationLimit
      ),
    enabled,
    staleTime: 5 * 60_000,
    retry: 1,
  });

  const nhcQuery = useQuery({
    queryKey: ["supplemental-risk", "nhc"],
    queryFn: () => fetchNhcActiveStorms(),
    enabled,
    staleTime: 10 * 60_000,
    retry: 1,
  });

  const airNowQuery = useQuery({
    queryKey: [
      "supplemental-risk",
      "airnow",
      location?.latitude,
      location?.longitude,
      radius,
    ],
    queryFn: () =>
      fetchAirNowCurrentObservations(
        location!.latitude,
        location!.longitude,
        radius,
        airNowApiKey
      ),
    enabled: enabled && (options.includeAirNow ?? true) && !!airNowApiKey,
    staleTime: 15 * 60_000,
    retry: 1,
  });

  const spcOutlooks = spcQuery.data ?? EMPTY_SIGNALS;
  const waterGauges = waterQuery.data ?? EMPTY_SIGNALS;
  const coastalWaterLevels = coopsQuery.data ?? EMPTY_SIGNALS;
  const tropicalCyclones = nhcQuery.data ?? EMPTY_SIGNALS;
  const airQuality = airNowQuery.data ?? EMPTY_SIGNALS;
  const allSignals = useMemo(
    () => [
      ...spcOutlooks,
      ...waterGauges,
      ...coastalWaterLevels,
      ...tropicalCyclones,
      ...airQuality,
    ],
    [spcOutlooks, waterGauges, coastalWaterLevels, tropicalCyclones, airQuality]
  );

  const errors = [
    queryErrorMessage("SPC", spcQuery.error),
    queryErrorMessage("USGS Water", waterQuery.error),
    queryErrorMessage("NOAA CO-OPS", coopsQuery.error),
    queryErrorMessage("NHC", nhcQuery.error),
    queryErrorMessage("AirNow", airNowQuery.error),
  ].filter((message): message is string => message != null);

  return {
    spcOutlooks,
    waterGauges,
    coastalWaterLevels,
    tropicalCyclones,
    airQuality,
    allSignals,
    isLoading:
      spcQuery.isLoading ||
      waterQuery.isLoading ||
      coopsQuery.isLoading ||
      nhcQuery.isLoading ||
      airNowQuery.isLoading,
    isFetching:
      spcQuery.isFetching ||
      waterQuery.isFetching ||
      coopsQuery.isFetching ||
      nhcQuery.isFetching ||
      airNowQuery.isFetching,
    isError:
      spcQuery.isError ||
      waterQuery.isError ||
      coopsQuery.isError ||
      nhcQuery.isError ||
      airNowQuery.isError,
    error: errors.length > 0 ? errors.join("; ") : null,
    refetch: () => {
      spcQuery.refetch();
      waterQuery.refetch();
      coopsQuery.refetch();
      nhcQuery.refetch();
      airNowQuery.refetch();
    },
  };
}
