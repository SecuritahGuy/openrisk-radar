import { onRequestGet as femaRiskIndex } from "../functions/api/fema/risk-index";
import { onRequestGet as nwps } from "../functions/api/noaa/nwps";
import { onRequestGet as stormEvents } from "../functions/api/noaa/storm-events";
import { onRequestGet as tsunami } from "../functions/api/noaa/tsunami";

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

const apiRoutes = new Map<string, (context: { request: Request }) => Promise<Response>>([
  ["/api/fema/risk-index", femaRiskIndex],
  ["/api/noaa/nwps", nwps],
  ["/api/noaa/storm-events", stormEvents],
  ["/api/noaa/tsunami", tsunami],
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const handler = apiRoutes.get(url.pathname);
    if (handler) {
      if (request.method !== "GET") {
        return new Response("Method Not Allowed", {
          status: 405,
          headers: { Allow: "GET" },
        });
      }
      return handler({ request });
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json({ error: "API route not found" }, { status: 404 });
    }

    return env.ASSETS.fetch(request);
  },
};
