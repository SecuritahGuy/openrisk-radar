import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement } from "../d1";
import { evaluateOperationsHealth, readWatchAuditOperations } from "../watchOperations";

function database(): D1Database {
  return {
    prepare(query: string): D1PreparedStatement {
      const statement: D1PreparedStatement = {
        bind: () => statement,
        first: async <T>() => {
          if (query.includes("FROM watches")) {
            return { active_count: 12, due_count: 0 } as T;
          }
          if (query.includes("COUNT(*) AS run_count")) {
            return {
              run_count: 96,
              failed_runs: 0,
              degraded_watches: 0,
              failed_watches: 0,
              max_duration_ms: 3000,
              last_success_at: "2026-07-22T12:00:03.000Z",
            } as T;
          }
          if (query.includes("active_subscriptions")) {
            return {
              active_subscriptions: 3,
              queued_deliveries: 0,
              failed_deliveries: 0,
              invalid_deliveries: 1,
              oldest_queued_at: null,
            } as T;
          }
          return {
            id: "run-1",
            status: "completed",
            started_at: "2026-07-22T12:00:00.000Z",
            completed_at: "2026-07-22T12:00:03.000Z",
            selected_count: 4,
            processed_count: 4,
            degraded_count: 0,
            failed_count: 0,
            duration_ms: 3000,
            error: null,
          } as T;
        },
        all: async () => ({ success: true, results: [] }),
        run: async () => ({ success: true }),
      };
      return statement;
    },
  };
}

describe("watch audit operations", () => {
  it("returns watch, run-window, push, and health metrics", async () => {
    await expect(readWatchAuditOperations(database(), "2026-07-22T12:10:00.000Z")).resolves.toMatchObject({
      available: true,
      health: "operational",
      activeWatches: 12,
      dueWatches: 0,
      recentRuns: { total: 96, failed: 0, maxDurationMs: 3000 },
      push: { activeSubscriptions: 3, queuedDeliveries: 0, invalidDeliveries: 1 },
      lastRun: {
        id: "run-1",
        status: "completed",
        selected: 4,
        processed: 4,
        durationMs: 3000,
      },
    });
  });

  it("classifies stale audits and stuck deliveries as critical", () => {
    expect(evaluateOperationsHealth({
      available: true,
      dueWatches: 30,
      lastRun: null,
      recentRuns: { windowHours: 24, total: 0, failed: 0, degradedWatches: 0, failedWatches: 0, maxDurationMs: null, lastSuccessAt: null },
      push: { activeSubscriptions: 2, queuedDeliveries: 1, failedDeliveries: 0, invalidDeliveries: 0, oldestQueuedAt: "2026-07-22T11:00:00.000Z" },
    }, new Date("2026-07-22T12:00:00.000Z").getTime())).toMatchObject({
      health: "critical",
      alerts: expect.arrayContaining([
        "No watch audit has started in the last 45 minutes.",
        "30 watches are overdue, exceeding one audit batch.",
      ]),
    });
  });

  it("reports an unavailable registry without D1", async () => {
    await expect(readWatchAuditOperations(undefined)).resolves.toMatchObject({
      available: false,
      health: "critical",
      error: "D1 binding unavailable",
    });
  });
});
