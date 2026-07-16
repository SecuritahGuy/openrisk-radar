// EXPERIMENT ONLY — not registered in worker/index.ts.
// Proposed Cloudflare Worker gateway for traffic sources. This mirrors the
// existing /api/* Worker pattern (run_worker_first: ["/api/*"]) but is kept
// separate so it is NOT wired into the production worker at this stage.
//
// Design goals:
//   1. Resolve a state's configured providers from STATE_TRAFFIC_SOURCES.
//   2. Read secrets from Worker env (never expose keys in the Vite bundle).
//   3. Fetch feeds in parallel, convert XML/JSON/GeoJSON/ArcGIS -> normalized.
//   4. Filter by bounding box/distance, dedupe overlapping feeds.
//   5. Cache briefly, return normalized transportation events.

import type { StateTrafficSource } from "./stateTrafficSources";
import { getStateTrafficSources } from "./stateTrafficSources";
import { fetchWzdxFeedsForState } from "./wzdxRegistry";
import { parseWzdxFeed } from "./transportationDataExchange";
import type { TransportationRiskEvent } from "./types";

interface TrafficEnv {
  WSDOT_API_CODE?: string;
  WISCONSIN_511_KEY?: string;
}

function json(data: unknown, status = 200): Response {
  return Response.json(data, { status, headers: { "Cache-Control": "public, max-age=60" } });
}

function haversineKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function eventNear(geom: { type: string; coordinates: unknown } | undefined, lat: number, lng: number, radiusKm: number): boolean {
  if (!geom || geom.type === "None") return true;
  if (geom.type === "Point" && Array.isArray(geom.coordinates)) {
    const [lon, la] = geom.coordinates as [number, number];
    return haversineKm(lat, lng, la, lon) <= radiusKm;
  }
  if ((geom.type === "LineString" || geom.type === "MultiLineString") && Array.isArray(geom.coordinates)) {
    const lines = geom.type === "LineString" ? [geom.coordinates] : (geom.coordinates as [number, number][][]);
    return lines.some((line) =>
      line.some(([lon, la]) => haversineKm(lat, lng, la, lon) <= radiusKm)
    );
  }
  return true;
}

export async function onRequestGet(context: { request: Request; env: TrafficEnv }): Promise<Response> {
  const url = new URL(context.request.url);
  const state = (url.searchParams.get("state") ?? "").toUpperCase();
  const lat = Number(url.searchParams.get("lat"));
  const lng = Number(url.searchParams.get("lon"));
  const radiusKm = Number(url.searchParams.get("radiusKm") ?? "100");

  if (!state) return json({ error: "state required" }, 400);

  const sources: StateTrafficSource[] = getStateTrafficSources(state);
  const wzdxFeeds = await fetchWzdxFeedsForState(state).catch(() => []);

  const events: TransportationRiskEvent[] = [];
  const sourceNames: string[] = [];

  for (const feed of wzdxFeeds) {
    try {
      const res = await fetch(feed.feedUrl);
      if (!res.ok) continue;
      const raw = await res.json();
      const parsed = parseWzdxFeed(raw, feed.organizationName, state).filter((e) =>
        Number.isFinite(lat) && Number.isFinite(lng) ? eventNear(e.geometry, lat, lng, radiusKm) : true
      );
      events.push(...parsed);
      sourceNames.push(feed.organizationName);
    } catch {
      // skip unreachable feed
    }
  }

  for (const source of sources) {
    sourceNames.push(source.authority);
  }

  return json({
    state,
    generatedAt: new Date().toISOString(),
    sources: [...new Set(sourceNames)],
    events,
  });
}
