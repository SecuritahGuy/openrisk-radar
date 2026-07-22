import { onRequestGet as femaRiskIndex } from "../functions/api/fema/risk-index";
import { onRequestGet as nwps } from "../functions/api/noaa/nwps";
import { onRequestGet as stormEvents } from "../functions/api/noaa/storm-events";
import { onRequestGet as tsunami } from "../functions/api/noaa/tsunami";
import { onRequestGet as meteoalarm } from "../functions/api/meteoalarm/alerts";
import { onRequestGet as calFire } from "../functions/api/regional/cal-fire";
import { onRequestGet as traffic } from "../functions/api/traffic";
import { onRequestGet as emsc } from "../functions/api/emsc";
import { jsonError } from "../functions/_shared/proxy";
import type { D1Database } from "./d1";
import { deliverPushMessage, type PushDeliveryEnv, type PushQueueMessage } from "./pushDelivery";
import { runWatchAudit } from "./watchEvaluator";
import { readWatchAuditOperations } from "./watchOperations";
import { handleWatchRequest } from "./watchRegistry";
import { handleWatchPushRequest, type PushQueueBinding } from "./watchPush";
import { LOCATION_WATCH_AUDIT_SOURCES } from "../src/services/locationEventFeeds";

interface Env extends PushDeliveryEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB?: D1Database;
  PUSH_QUEUE?: PushQueueBinding;
  AUTOMATED_PUSH_ENABLED?: string;
}

interface QueueMessage<T> {
  body: T;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
}

interface QueueBatch<T> {
  messages: QueueMessage<T>[];
}

const apiRoutes = new Map<string, (context: { request: Request }) => Promise<Response>>([
  ["/api/fema/risk-index", femaRiskIndex],
  ["/api/noaa/nwps", nwps],
  ["/api/noaa/storm-events", stormEvents],
  ["/api/noaa/tsunami", tsunami],
  ["/api/meteoalarm/alerts", meteoalarm],
  ["/api/regional/cal-fire", calFire],
  ["/api/traffic", traffic],
  ["/api/emsc", emsc],
]);

const sourceStatus = [
  { id: "fema-risk-index", label: "FEMA National Risk Index", route: "/api/fema/risk-index", cacheSeconds: 86_400 },
  { id: "noaa-nwps", label: "NOAA River Forecasts", route: "/api/noaa/nwps", cacheSeconds: 900 },
  { id: "noaa-storm-events", label: "NOAA Storm Events", route: "/api/noaa/storm-events", cacheSeconds: 86_400 },
  { id: "noaa-tsunami", label: "NOAA Tsunami", route: "/api/noaa/tsunami", cacheSeconds: 60 },
  { id: "meteoalarm", label: "Meteoalarm European Warnings", route: "/api/meteoalarm/alerts", cacheSeconds: 300 },
  { id: "cal-fire", label: "CAL FIRE Incidents", route: "/api/regional/cal-fire", cacheSeconds: 120 },
  { id: "usdot-wzdx", label: "USDOT Work Zone Data Exchange", route: "/api/traffic", cacheSeconds: 90 },
  { id: "emsc", label: "EMSC Earthquakes", route: "/api/emsc", cacheSeconds: 60 },
];

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const startedAt = Date.now();
    const url = new URL(request.url);
    if (url.pathname === "/api/push/config") {
      if (request.method !== "GET") {
        return Response.json({ error: { code: "METHOD_NOT_ALLOWED", message: "Only GET is supported" } }, { status: 405 });
      }
      return Response.json({
        supported: true,
        configured: !!(env.DB && env.PUSH_QUEUE && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.PUSH_DATA_KEY),
        publicKey: env.VAPID_PUBLIC_KEY ?? null,
        automatedDelivery: env.AUTOMATED_PUSH_ENABLED === "true",
      }, { headers: { "Cache-Control": "no-store" } });
    }
    if (url.pathname === "/api/status") {
      const watchOperations = await readWatchAuditOperations(env.DB);
      return Response.json({
        service: "OpenRisk Radar API",
        version: "worker-v2",
        status: "operational",
        checkedAt: new Date().toISOString(),
        sources: sourceStatus,
        watchRegistry: {
          configured: !!env.DB,
          mode: "audit",
          evaluatedSources: LOCATION_WATCH_AUDIT_SOURCES,
          operations: watchOperations,
        },
        pushNotifications: {
          configured: !!(env.DB && env.PUSH_QUEUE && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.PUSH_DATA_KEY),
          automatedDelivery: env.AUTOMATED_PUSH_ENABLED === "true",
          mode: "test",
        },
      }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
    }

    if (url.pathname === "/api/watches" || url.pathname.startsWith("/api/watches/")) {
      if (!env.DB) {
        return jsonError({
          code: "WATCH_REGISTRY_UNAVAILABLE",
          message: "The cloud watch registry is not configured",
          status: 503,
          retryable: true,
        });
      }
      try {
        const pushResponse = await handleWatchPushRequest(request, { ...env, DB: env.DB });
        if (pushResponse) return pushResponse;
        const response = await handleWatchRequest(request, env.DB);
        if (response) return response;
      } catch (error) {
        console.error(JSON.stringify({
          type: "watch_registry_error",
          route: url.pathname,
          message: error instanceof Error ? error.message : "Unknown registry error",
        }));
        return jsonError({
          code: "WATCH_REGISTRY_ERROR",
          message: "The watch registry could not complete the request",
          status: 500,
          retryable: true,
        });
      }
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

  async scheduled(_controller: unknown, env: Env): Promise<void> {
    if (!env.DB) {
      console.warn(JSON.stringify({ type: "watch_audit_skipped", reason: "D1 binding unavailable" }));
      return;
    }
    try {
      const result = await runWatchAudit(env.DB);
      console.log(JSON.stringify({ type: "watch_audit_complete", ...result }));
    } catch (error) {
      console.error(JSON.stringify({
        type: "watch_audit_failed",
        message: error instanceof Error ? error.message : "Unknown audit error",
      }));
      throw error;
    }
  },

  async queue(batch: QueueBatch<PushQueueMessage>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await deliverPushMessage(env, message.body.deliveryId);
        message.ack();
      } catch (error) {
        console.error(JSON.stringify({
          type: "push_delivery_retry",
          deliveryId: message.body.deliveryId,
          message: error instanceof Error ? error.message : "Unknown push delivery error",
        }));
        message.retry({ delaySeconds: 60 });
      }
    }
  },
};
