import { useQuery } from "@tanstack/react-query";
import type { ResolvedLocation } from "../types/location";
import {
  fetchNwsWeatherOverlay,
  type NwsWeatherOverlay,
} from "../services/nwsWeatherOverlay";

interface UseNwsWeatherOverlayResult {
  overlay: NwsWeatherOverlay | null;
  isLoading: boolean;
  error: string | null;
}

export function useNwsWeatherOverlay(
  location: ResolvedLocation | null,
  enabled: boolean
): UseNwsWeatherOverlayResult {
  const query = useQuery<NwsWeatherOverlay>({
    queryKey: [
      "nws-weather-overlay",
      location?.latitude,
      location?.longitude,
    ],
    queryFn: () =>
      fetchNwsWeatherOverlay(location!.latitude, location!.longitude),
    enabled: enabled && !!location,
    staleTime: 300_000,
    retry: 1,
  });

  return {
    overlay: query.data ?? null,
    isLoading: query.isFetching,
    error: query.error ? query.error.message : null,
  };
}
