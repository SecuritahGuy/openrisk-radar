import type { LocationInput, ResolvedLocation } from "../types/location";
import { findCity } from "../data/us-cities";
import { findZip } from "../data/us-zips";

export function parseInput(raw: string): LocationInput {
  const trimmed = raw.trim();
  const zipMatch = trimmed.match(/^\d{5}$/);
  if (zipMatch) {
    return {
      raw: trimmed,
      parsed: { type: "zip", zip: trimmed, display: `ZIP ${trimmed}` },
    };
  }
  const csMatch = trimmed.match(
    /^([a-zA-Z\s.-]+?)\s*,\s*([a-zA-Z]{2})(?:\s*\d{5})?$/
  );
  if (csMatch) {
    const city = csMatch[1].trim();
    const state = csMatch[2].toUpperCase();
    return {
      raw: trimmed,
      parsed: {
        type: "city_state",
        city,
        state,
        display: `${city}, ${state}`,
      },
    };
  }
  return { raw: trimmed, parsed: { type: "city_state", display: trimmed } };
}

export function resolveLocation(input: LocationInput): ResolvedLocation | null {
  if (input.parsed.type === "zip" && input.parsed.zip) {
    const entry = findZip(input.parsed.zip);
    if (entry) {
      const cityEntry = findCity(entry.city, entry.state);
      return {
        city: entry.city,
        state: entry.state,
        postalCode: entry.zip,
        country: "USA",
        latitude: entry.lat,
        longitude: entry.lng,
        county: cityEntry?.county ?? null,
        stateFips: cityEntry?.stateFips ?? null,
        countyFips: cityEntry?.countyFips ?? null,
      };
    }
    return null;
  }
  if (input.parsed.city && input.parsed.state) {
    const entry = findCity(input.parsed.city, input.parsed.state);
    if (entry) {
      return {
        city: entry.city,
        state: entry.state,
        postalCode: null,
        country: "USA",
        latitude: entry.lat,
        longitude: entry.lng,
        county: entry.county,
        stateFips: entry.stateFips,
        countyFips: entry.countyFips,
      };
    }
    return null;
  }
  return null;
}
