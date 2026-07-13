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

const STATE_FIPS: Record<string, string> = {
  AL: "01",
  AK: "02",
  AZ: "04",
  AR: "05",
  CA: "06",
  CO: "08",
  CT: "09",
  DE: "10",
  DC: "11",
  FL: "12",
  GA: "13",
  HI: "15",
  ID: "16",
  IL: "17",
  IN: "18",
  IA: "19",
  KS: "20",
  KY: "21",
  LA: "22",
  ME: "23",
  MD: "24",
  MA: "25",
  MI: "26",
  MN: "27",
  MS: "28",
  MO: "29",
  MT: "30",
  NE: "31",
  NV: "32",
  NH: "33",
  NJ: "34",
  NM: "35",
  NY: "36",
  NC: "37",
  ND: "38",
  OH: "39",
  OK: "40",
  OR: "41",
  PA: "42",
  RI: "44",
  SC: "45",
  SD: "46",
  TN: "47",
  TX: "48",
  UT: "49",
  VT: "50",
  VA: "51",
  WA: "53",
  WV: "54",
  WI: "55",
  WY: "56",
  PR: "72",
};

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
    stateFips: STATE_FIPS[relative.state] ?? null,
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
