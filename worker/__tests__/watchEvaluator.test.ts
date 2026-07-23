import { describe, expect, it, vi } from "vitest";
import type { D1Database, D1PreparedStatement } from "../d1";
import { isWatchAuditQueueMessage } from "../queueMessages";
import { classifyAuditSourceCoverage, scheduleWatchAudit } from "../watchEvaluator";

describe("watch audit source coverage", () => {
  it("continues with successful feeds when one source fails", () => {
    expect(classifyAuditSourceCoverage([
      { label: "USGS", error: null },
      { label: "GDACS", error: "upstream timed out" },
    ])).toEqual({
      usable: true,
      warning: "GDACS: upstream timed out",
      error: null,
    });
  });

  it("stops only when every applicable source fails", () => {
    expect(classifyAuditSourceCoverage([
      { label: "USGS", error: "bad gateway" },
      { label: "GDACS", error: "upstream timed out" },
    ])).toEqual({
      usable: false,
      warning: null,
      error: "USGS: bad gateway; GDACS: upstream timed out",
    });
  });

  it("reports when no source covers a hazard selection", () => {
    expect(classifyAuditSourceCoverage([])).toEqual({
      usable: false,
      warning: null,
      error: "No audit-mode source currently covers the selected hazards",
    });
  });
});

function scheduleDatabase(): D1Database {
  const rows = [
    {
      id: "watch-1",
      latitude: 42,
      longitude: -88,
      radius_miles: 50,
      location_json: "{}",
      preferences_json: "{}",
      timezone: "America/Chicago",
      last_incident_fingerprint: null,
    },
    {
      id: "watch-2",
      latitude: 41,
      longitude: -87,
      radius_miles: 25,
      location_json: "{}",
      preferences_json: "{}",
      timezone: "America/Chicago",
      last_incident_fingerprint: null,
    },
  ];
  const db: D1Database = {
    prepare(query: string): D1PreparedStatement {
      const statement: D1PreparedStatement = {
        bind: () => statement,
        first: async () => null,
        all: async <T>() => ({
          success: true,
          results: (query.includes("FROM watches") ? rows : []) as T[],
        }),
        run: async () => ({ success: true }),
      };
      return statement;
    },
    batch: async (statements) => Promise.all(statements.map((statement) => statement.run())),
  };
  return db;
}

describe("queued watch audits", () => {
  it("enqueues one isolated queue message per selected watch", async () => {
    const sendBatch = vi.fn().mockResolvedValue(undefined);
    const result = await scheduleWatchAudit(scheduleDatabase(), {
      send: vi.fn().mockResolvedValue(undefined),
      sendBatch,
    });

    expect(result).toMatchObject({ selected: 2, queued: 2 });
    expect(sendBatch).toHaveBeenCalledTimes(1);
    const messages = sendBatch.mock.calls[0][0] as Array<{ body: unknown }>;
    expect(messages).toHaveLength(2);
    expect(messages.every(({ body }) =>
      isWatchAuditQueueMessage(body as { watchAuditJobId: string })
    )).toBe(true);
  });

  it("does not confuse push deliveries with audit jobs", () => {
    expect(isWatchAuditQueueMessage({ watchAuditJobId: "job-1" })).toBe(true);
    expect(isWatchAuditQueueMessage({ deliveryId: "delivery-1" })).toBe(false);
  });
});
