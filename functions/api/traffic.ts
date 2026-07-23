import { jsonError, type PagesContext } from "../_shared/proxy";
import { normalizeWzdxFeed, US_STATE_NAMES } from "../../src/lib/wzdx";
import type { RiskEvent } from "../../src/types/riskEvent";

const REGISTRY = "https://data.transportation.gov/resource/69qe-yiui.json?$limit=500";

interface RegistryRow {
  state?: string;
  issuingorganization?: string;
  feedname?: string;
  url?: { url?: string } | string;
  active?: boolean | string;
  needapikey?: boolean | string;
}

interface FeedResult {
  provider: { id: string; label: string };
  events: RiskEvent[];
  error: string | null;
}

function rowUrl(row: RegistryRow): string {
  return typeof row.url === "string" ? row.url : row.url?.url ?? "";
}

function providerId(row: RegistryRow): string {
  return (row.feedname ?? row.issuingorganization ?? "state-dot")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "state-dot";
}

function isUsable(row: RegistryRow, state: string): boolean {
  const jurisdiction = (row.state ?? "").toUpperCase();
  const target = US_STATE_NAMES[state] ?? state;
  const active = row.active === undefined || row.active === true || row.active === "true";
  const needsKey = row.needapikey === true || row.needapikey === "true";
  const url = rowUrl(row);
  return jurisdiction === target && active && !needsKey && /^https?:\/\//.test(url);
}

async function fetchFeed(
  row: RegistryRow,
  state: string,
  latitude: number,
  longitude: number,
  radiusKm: number
): Promise<FeedResult> {
  const provider = {
    id: providerId(row),
    label: row.issuingorganization ?? "State Department of Transportation",
  };
  try {
    const response = await fetch(rowUrl(row), {
      headers: {
        Accept: "application/geo+json, application/json",
        "User-Agent": "OpenRisk-Radar/1.0 (+https://openriskradar.com)",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      return { provider, events: [], error: `HTTP ${response.status}` };
    }
    const raw = await response.json();
    return {
      provider,
      events: normalizeWzdxFeed(
        raw,
        { ...provider, url: rowUrl(row) },
        state,
        latitude,
        longitude,
        radiusKm
      ),
      error: null,
    };
  } catch (error) {
    return {
      provider,
      events: [],
      error: error instanceof Error ? error.message : "Feed unavailable",
    };
  }
}

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  const incoming = new URL(request.url);
  const state = (incoming.searchParams.get("state") ?? "").toUpperCase();
  const latitude = Number(incoming.searchParams.get("lat"));
  const longitude = Number(incoming.searchParams.get("lon"));
  const radiusKm = Number(incoming.searchParams.get("radiusKm"));

  if (!US_STATE_NAMES[state] || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return jsonError({ code: "INVALID_REQUEST", message: "A valid U.S. state, lat, and lon are required", status: 400 });
  }
  if (!Number.isFinite(radiusKm) || radiusKm <= 0 || radiusKm > 200) {
    return jsonError({ code: "INVALID_RADIUS", message: "radiusKm must be between 0 and 200", status: 400 });
  }

  const cache = caches.default;
  const cacheKey = new Request(incoming.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let registryRows: RegistryRow[];
  try {
    const registryResponse = await fetch(REGISTRY, {
      headers: {
        Accept: "application/json",
        "User-Agent": "OpenRisk-Radar/1.0 (+https://openriskradar.com)",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!registryResponse.ok) throw new Error(`HTTP ${registryResponse.status}`);
    registryRows = await registryResponse.json() as RegistryRow[];
  } catch {
    return jsonError({
      code: "TRAFFIC_REGISTRY_UNAVAILABLE",
      message: "The USDOT work-zone registry could not be reached",
      provider: "USDOT Work Zone Data Exchange",
      status: 502,
      retryable: true,
    });
  }

  const rows = registryRows.filter((row) => isUsable(row, state)).slice(0, 3);
  const results = await Promise.all(
    rows.map((row) => fetchFeed(row, state, latitude, longitude, radiusKm))
  );
  const events = results.flatMap((result) => result.events).slice(0, 150);
  const payload = {
    state,
    providers: results.map((result) => ({
      ...result.provider,
      available: result.error == null,
    })),
    events,
    warnings: results
      .filter((result) => result.error)
      .map((result) => `${result.provider.label}: ${result.error}`),
  };
  const response = Response.json(payload, {
    headers: {
      "Cache-Control": "public, max-age=30, s-maxage=90",
      "X-OpenRisk-Provider": "USDOT Work Zone Data Exchange",
    },
  });
  await cache.put(cacheKey, response.clone());
  return response;
}
