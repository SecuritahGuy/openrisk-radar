import type { ResolvedLocation } from "../types/location";
import { stateAbbr } from "../data/state-abbr";

const BASE = "https://nominatim.openstreetmap.org";
const USER_AGENT = "OpenRiskRadar/1.0 (https://github.com/SecuritahGuy/openrisk-radar)";

interface NominatimAddress {
  city?: string;
  town?: string;
  village?: string;
  hamlet?: string;
  state?: string;
  county?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  address: NominatimAddress;
}

interface NominatimReverseResult {
  lat: string;
  lon: string;
  display_name: string;
  address: NominatimAddress;
}

function pickCity(addr: NominatimAddress): string {
  return addr.city ?? addr.town ?? addr.village ?? addr.hamlet ?? "";
}

function pickCounty(addr: NominatimAddress): string | null {
  const c = addr.county;
  if (!c) return null;
  return c.replace(/\s*(County|Parish|Borough|City)\s*$/i, "").trim() + " County";
}

export async function geocode(query: string): Promise<ResolvedLocation | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    addressdetails: "1",
    limit: "1",
  });
  const url = `${BASE}/search?${params}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const data: NominatimResult[] = await res.json();
  if (!data || data.length === 0) return null;

  const r = data[0];
  const addr = r.address;
  const country = addr.country_code === "us" ? "USA" : addr.country ?? "USA";
  const city = pickCity(addr);
  const stateName = addr.state ?? "";
  const state = stateAbbr(stateName) ?? stateName.slice(0, 2).toUpperCase();
  const county = pickCounty(addr);
  const postalCode = addr.postcode ?? null;

  return {
    city,
    state,
    postalCode,
    country,
    latitude: parseFloat(r.lat),
    longitude: parseFloat(r.lon),
    county,
    stateFips: null,
    countyFips: null,
  };
}

export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ResolvedLocation | null> {
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: "json",
    addressdetails: "1",
    zoom: "10",
  });
  const url = `${BASE}/reverse?${params}`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "application/json",
    },
  });
  if (!res.ok) return null;
  const data: NominatimReverseResult = await res.json();
  if (!data?.address) return null;

  const addr = data.address;
  const country = addr.country_code === "us" ? "USA" : addr.country ?? "USA";
  const city = pickCity(addr);
  const stateName = addr.state ?? "";
  const state = stateAbbr(stateName) ?? stateName.slice(0, 2).toUpperCase();

  if (!city || !state) return null;

  return {
    city,
    state,
    postalCode: addr.postcode ?? null,
    country,
    latitude: parseFloat(data.lat) || lat,
    longitude: parseFloat(data.lon) || lng,
    county: pickCounty(addr),
    stateFips: null,
    countyFips: null,
  };
}
