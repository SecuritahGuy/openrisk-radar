import { readJsonResponse } from "../lib/http";

export interface ApiStatus {
  service: string;
  version: string;
  status: "operational";
  checkedAt: string;
  sources: Array<{
    id: string;
    label: string;
    route: string;
    cacheSeconds: number;
  }>;
  watchRegistry: {
    configured: boolean;
    mode: "audit";
    evaluatedSources: string[];
    operations: {
      available: boolean;
      health: "operational" | "degraded" | "critical";
      alerts: string[];
      activeWatches: number;
      dueWatches: number;
      lastRun: {
        status: "running" | "completed" | "failed";
        startedAt: string;
        completedAt: string | null;
        selected: number;
        processed: number;
        degraded: number;
        failed: number;
        durationMs: number | null;
      } | null;
      recentRuns: {
        windowHours: 24;
        total: number;
        failed: number;
        degradedWatches: number;
        failedWatches: number;
        maxDurationMs: number | null;
        lastSuccessAt: string | null;
      };
      push: {
        activeSubscriptions: number;
        queuedDeliveries: number;
        failedDeliveries: number;
        invalidDeliveries: number;
        oldestQueuedAt: string | null;
      };
      error: string | null;
    };
  };
  pushNotifications: {
    configured: boolean;
    automatedDelivery: boolean;
    rolloutPercent: number;
    mode: "test" | "canary" | "active";
  };
}

export async function fetchApiStatus(): Promise<ApiStatus> {
  const response = await fetch("/api/status", {
    headers: { Accept: "application/json" },
  });
  return readJsonResponse<ApiStatus>(response, "OpenRisk API");
}
