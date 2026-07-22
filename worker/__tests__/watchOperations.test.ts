import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement } from "../d1";
import { readWatchAuditOperations } from "../watchOperations";

function database(): D1Database {
  return {
    prepare(query: string): D1PreparedStatement {
      const statement: D1PreparedStatement = {
        bind: () => statement,
        first: async <T>() => {
          if (query.includes("FROM watches")) {
            return { active_count: 12, due_count: 4 } as T;
          }
          return {
            id: "run-1",
            status: "completed",
            started_at: "2026-07-22T12:00:00.000Z",
            completed_at: "2026-07-22T12:00:03.000Z",
            selected_count: 4,
            processed_count: 2,
            degraded_count: 1,
            failed_count: 1,
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
  it("returns active, due, and last-run metrics", async () => {
    await expect(readWatchAuditOperations(database())).resolves.toMatchObject({
      available: true,
      activeWatches: 12,
      dueWatches: 4,
      lastRun: {
        id: "run-1",
        status: "completed",
        selected: 4,
        processed: 2,
        degraded: 1,
        failed: 1,
        durationMs: 3000,
      },
    });
  });

  it("reports an unavailable registry without D1", async () => {
    await expect(readWatchAuditOperations(undefined)).resolves.toMatchObject({
      available: false,
      error: "D1 binding unavailable",
    });
  });
});
