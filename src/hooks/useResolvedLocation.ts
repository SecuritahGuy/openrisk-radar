import { useState, useCallback } from "react";
import type { ResolvedLocation } from "../types/location";
import { resolve, resolveCoordinates } from "../services/locationResolver";

export interface UseResolvedLocationReturn {
  query: string;
  setQuery: (q: string) => void;
  result: ResolvedLocation | null;
  error: string | null;
  loading: boolean;
  search: () => void;
  searchCoordinates: (lat: number, lng: number) => void;
}

export function useResolvedLocation(): UseResolvedLocationReturn {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<ResolvedLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const applyResult = useCallback((next: ResolvedLocation) => {
    setResult(next);
    setQuery(next.postalCode ?? `${next.city}, ${next.state}`);
    setError(null);
  }, []);

  const search = useCallback(() => {
    const current = query.trim();
    if (!current) return;

    setLoading(true);
    setError(null);
    resolve(current)
      .then((next) => {
        if (!next) {
          setError("Location not found. Try a ZIP code or City, ST format.");
          return;
        }
        applyResult(next);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Location search failed.");
      })
      .finally(() => setLoading(false));
  }, [applyResult, query]);

  const searchCoordinates = useCallback(
    (lat: number, lng: number) => {
      setLoading(true);
      setError(null);
      resolveCoordinates(lat, lng)
        .then((next) => {
          if (!next) {
            setError("Could not resolve the selected map area.");
            return;
          }
          applyResult(next);
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : "Map area search failed."
          );
        })
        .finally(() => setLoading(false));
    },
    [applyResult]
  );

  return {
    query,
    setQuery: (q) => {
      setQuery(q);
      setError(null);
    },
    result,
    error,
    loading,
    search,
    searchCoordinates,
  };
}
