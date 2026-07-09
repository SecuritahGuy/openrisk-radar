import type { ResolvedLocation } from "../types/location";
import { geocode, reverseGeocode } from "./nominatim";
import { parseInput, resolveLocation } from "./localResolver";

export { parseInput, resolveLocation } from "./localResolver";

interface NwsPointResponse {
  properties: {
    county?: string;
    relativeLocation?: {
      properties?: {
        city?: string;
        state?: string;
      };
    };
  };
}

interface NwsZoneResponse {
  properties: {
    id?: string;
    name?: string;
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/geo+json, application/json" },
  });
  if (!res.ok) throw new Error(`Location API returned ${res.status}`);
  return res.json() as Promise<T>;
}

export async function resolve(raw: string): Promise<ResolvedLocation | null> {
  const parsed = parseInput(raw);
  const local = resolveLocation(parsed);
  if (local) return local;

  const api = await geocode(raw).catch(() => null);
  if (api) return api;
  return null;
}

function countyName(name?: string): string | null {
  if (!name) return null;
  return /\bCounty$/i.test(name) ? name : `${name} County`;
}

function countyFipsFromZoneId(id?: string): string | null {
  const match = id?.match(/[A-Z]{2}C(\d{3})$/);
  return match ? match[1] : null;
}

async function resolveCoordinatesWithNws(
  lat: number,
  lng: number
): Promise<ResolvedLocation | null> {
  const point = await fetchJson<NwsPointResponse>(
    `https://api.weather.gov/points/${lat},${lng}`
  );
  const relative = point.properties.relativeLocation?.properties;
  if (!relative?.city || !relative.state) return null;

  const zone = point.properties.county
    ? await fetchJson<NwsZoneResponse>(point.properties.county).catch(() => null)
    : null;

  return {
    city: relative.city,
    state: relative.state,
    postalCode: null,
    country: "USA",
    latitude: lat,
    longitude: lng,
    county: countyName(zone?.properties.name),
    stateFips: null,
    countyFips: countyFipsFromZoneId(zone?.properties.id),
  };
}

export async function resolveCoordinates(
  lat: number,
  lng: number
): Promise<ResolvedLocation | null> {
  const nws = await resolveCoordinatesWithNws(lat, lng).catch(() => null);
  if (nws) return nws;
  return reverseGeocode(lat, lng).catch(() => null);
}
