import { onRequestGet as femaRiskIndex } from "../functions/api/fema/risk-index";
import { onRequestGet as nwps } from "../functions/api/noaa/nwps";
import { onRequestGet as stormEvents } from "../functions/api/noaa/storm-events";
import { onRequestGet as tsunami } from "../functions/api/noaa/tsunami";
import { onRequestGet as meteoalarm } from "../functions/api/meteoalarm/alerts";
import { jsonError } from "../functions/_shared/proxy";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const apiRoutes = new Map<string, (context: { request: Request }) => Promise<Response>>([
  ["/api/fema/risk-index", femaRiskIndex],
  ["/api/noaa/nwps", nwps],
  ["/api/noaa/storm-events", stormEvents],
  ["/api/noaa/tsunami", tsunami],
  ["/api/meteoalarm/alerts", meteoalarm],
]);

const sourceStatus = [
  { id: "fema-risk-index", label: "FEMA National Risk Index", route: "/api/fema/risk-index", cacheSeconds: 86_400 },
  { id: "noaa-nwps", label: "NOAA River Forecasts", route: "/api/noaa/nwps", cacheSeconds: 900 },
  { id: "noaa-storm-events", label: "NOAA Storm Events", route: "/api/noaa/storm-events", cacheSeconds: 86_400 },
  { id: "noaa-tsunami", label: "NOAA Tsunami", route: "/api/noaa/tsunami", cacheSeconds: 60 },
  { id: "meteoalarm", label: "Meteoalarm European Warnings", route: "/api/meteoalarm/alerts", cacheSeconds: 300 },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startedAt = Date.now();
    const url = new URL(request.url);
    if (url.pathname === "/api/status") {
      return Response.json({
        service: "OpenRisk Radar API",
        version: "worker-v2",
        status: "operational",
        checkedAt: new Date().toISOString(),
        sources: sourceStatus,
      }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
    }

    const handler = apiRoutes.get(url.pathname);
    if (handler) {
      if (request.method !== "GET") {
        const response = jsonError({ code: "METHOD_NOT_ALLOWED", message: "Only GET is supported", status: 405 });
        response.headers.set("Allow", "GET");
        return response;
      }
      const response = await handler({ request });
      const durationMs = Date.now() - startedAt;
      if (response.status >= 500 || Math.random() < 0.1) {
        console.log(JSON.stringify({
          type: "api_request",
          route: url.pathname,
          status: response.status,
          cache: response.headers.get("X-OpenRisk-Cache") ?? "none",
          provider: response.headers.get("X-OpenRisk-Provider") ?? "unknown",
          durationMs,
        }));
      }
      return response;
    }

    if (url.pathname.startsWith("/api/")) {
      return jsonError({ code: "NOT_FOUND", message: "API route not found", status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
