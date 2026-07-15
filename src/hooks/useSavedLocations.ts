import { useState, useEffect, useCallback } from "react";
import { db } from "../services/db";
import { newLocationId } from "../lib/ids";
import type { Location } from "../types/location";
import { DEFAULT_WATCH_PREFERENCES } from "../lib/watchPreferences";

export interface SaveLocationInput {
  label: string;
  input: string;
  inputType: "zip" | "city_state";
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  latitude: number;
  longitude: number;
  county: string | null;
  stateFips: string | null;
  countyFips: string | null;
}

interface UseSavedLocationsReturn {
  savedLocations: Location[];
  saveLocation: (input: SaveLocationInput) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  updateLocation: (id: string, updates: Partial<Location>) => Promise<void>;
  isSaving: boolean;
}

export function useSavedLocations(): UseSavedLocationsReturn {
  const [savedLocations, setSavedLocations] = useState<Location[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    db.locations
      .orderBy("createdAt")
      .reverse()
      .toArray()
      .then(setSavedLocations);
  }, []);

  const saveLocation = useCallback(async (input: SaveLocationInput) => {
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const location: Location = {
        id: newLocationId(),
        label: `${input.city}, ${input.state}`,
        input: input.input,
        inputType: input.inputType,
        city: input.city,
        state: input.state,
        postalCode: input.postalCode,
        country: input.country,
        latitude: input.latitude,
        longitude: input.longitude,
        county: input.county,
        stateFips: input.stateFips,
        countyFips: input.countyFips,
        radiusMiles: 50,
        criticality: "Medium",
        locationType: "Office",
        tags: [],
        createdAt: now,
        lastCheckedAt: now,
        watch: {
          ...DEFAULT_WATCH_PREFERENCES,
          hazards: [...DEFAULT_WATCH_PREFERENCES.hazards],
        },
      };
      await db.locations.add(location);
      setSavedLocations((prev) => [location, ...prev]);
    } finally {
      setIsSaving(false);
    }
  }, []);

  const deleteLocation = useCallback(async (id: string) => {
    await db.locations.delete(id);
    setSavedLocations((prev) => prev.filter((l) => l.id !== id));
  }, []);

  const updateLocation = useCallback(
    async (id: string, updates: Partial<Location>) => {
      await db.locations.update(id, updates);
      setSavedLocations((prev) =>
        prev.map((l) => (l.id === id ? { ...l, ...updates } : l))
      );
    },
    []
  );

  return {
    savedLocations,
    saveLocation,
    deleteLocation,
    updateLocation,
    isSaving,
  };
}
