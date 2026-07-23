import { readJsonResponse } from "../lib/http";
import { normalizeWzdxFeed, US_STATE_NAMES } from "../lib/wzdx";
import type { RiskEvent } from "../types/riskEvent";

export interface TransportationProviderStatus {
  id: string;
  label: string;
  available: boolean;
}

export interface TransportationFeedResult {
  state: string;
  providers: TransportationProviderStatus[];
  events: RiskEvent[];
  warnings: string[];
}

interface RegistryRow {
  state?: string;
  issuingorganization?: string;
  feedname?: string;
  url?: { url?: string } | string;
  active?: boolean | string;
  needapikey?: boolean | string;
}

function registryUrl(row: RegistryRow): string {
  return typeof row.url === "string" ? row.url : row.url?.url ?? "";
}

async function fetchDirect(
  state: string,
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<TransportationFeedResult> {
  const registryResponse = await fetch("https://data.transportation.gov/resource/69qe-yiui.json?$limit=500");
  const rows = await readJsonResponse<RegistryRow[]>(registryResponse, "USDOT Work Zone Data Exchange");
  const target = US_STATE_NAMES[state.toUpperCase()];
  const applicable = rows.filter((row) => {
    const active = row.active === undefined || row.active === true || row.active === "true";
    const needsKey = row.needapikey === true || row.needapikey === "true";
    return active && !needsKey && (row.state ?? "").toUpperCase() === target && /^https?:\/\//.test(registryUrl(row));
  }).slice(0, 3);
  const results = await Promise.all(applicable.map(async (row) => {
    const label = row.issuingorganization ?? "State Department of Transportation";
    const id = (row.feedname ?? label).toLowerCase().replace(/[^a-z0-9]+/g, "-");
    try {
      const response = await fetch(registryUrl(row));
      const raw = await readJsonResponse<unknown>(response, label);
      return {
        provider: { id, label, available: true },
        events: normalizeWzdxFeed(
          raw,
          { id, label, url: registryUrl(row) },
          state,
          latitude,
          longitude,
          radiusKm
        ),
        warning: null,
      };
    } catch (error) {
      return {
        provider: { id, label, available: false },
        events: [] as RiskEvent[],
        warning: `${label}: ${error instanceof Error ? error.message : "Feed unavailable"}`,
      };
    }
  }));
  return {
    state,
    providers: results.map((result) => result.provider),
    events: results.flatMap((result) => result.events).slice(0, 150),
    warnings: results.map((result) => result.warning).filter((warning): warning is string => !!warning),
  };
}

export async function fetchTransportationEvents(
  state: string,
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<TransportationFeedResult> {
  if (!import.meta.env?.PROD) {
    return fetchDirect(state.toUpperCase(), latitude, longitude, radiusKm);
  }
  const params = new URLSearchParams({
    state: state.toUpperCase(),
    lat: String(latitude),
    lon: String(longitude),
    radiusKm: String(radiusKm),
  });
  const response = await fetch(`/api/traffic?${params}`);
  return readJsonResponse<TransportationFeedResult>(response, "USDOT Work Zone Data Exchange");
}
