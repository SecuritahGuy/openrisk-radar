import { describe, expect, it, vi } from "vitest";
import type { RiskEvent } from "../../src/types/riskEvent";
import type { D1Database, D1PreparedStatement } from "../d1";
import { normalizeCanaryPercent, queueAutomatedPush, watchInAutomatedPushCanary } from "../watchAutomation";

function database(): { db: D1Database; writes: string[] } {
  const writes: string[] = [];
  const db: D1Database = {
    prepare(query: string): D1PreparedStatement {
      const statement: D1PreparedStatement = {
        bind: (...values: unknown[]) => {
          if (query.includes("INSERT INTO push_deliveries")) writes.push(String(values[1]));
          return statement;
        },
        first: async <T>() => query.includes("COUNT(DISTINCT created_at)")
          ? ({ batch_count: 0 } as T)
          : null,
        all: async <T>() => ({ success: true, results: [{ id: "sub-1" }, { id: "sub-2" }] as T[] }),
        run: async () => ({ success: true }),
      };
      return statement;
    },
  };
  return { db, writes };
}

const event = {
  headline: "Severe thunderstorm warning",
} as RiskEvent;

describe("automated push rollout", () => {
  it("normalizes rollout percentages and assigns stable buckets", () => {
    expect(normalizeCanaryPercent("10.4")).toBe(10);
    expect(normalizeCanaryPercent("500")).toBe(100);
    expect(normalizeCanaryPercent("bad")).toBe(0);
    expect(watchInAutomatedPushCanary("watch-1", 100)).toBe(true);
    expect(watchInAutomatedPushCanary("watch-1", 0)).toBe(false);
    expect(watchInAutomatedPushCanary("watch-1", 25)).toBe(watchInAutomatedPushCanary("watch-1", 25));
  });

  it("queues one idempotent delivery per active subscription", async () => {
    const { db, writes } = database();
    const send = vi.fn().mockResolvedValue(undefined);
    await expect(queueAutomatedPush(db, {
      enabled: true,
      configured: true,
      canaryPercent: 100,
      queue: { send },
    }, {
      watchId: "watch-1",
      fingerprint: "NWS:warning-1:Severe:now",
      delivery: "immediate",
      locationLabel: "Grayslake, IL",
      matchCount: 2,
      topEvent: event,
      now: "2026-07-22T12:00:00.000Z",
    })).resolves.toEqual({ queued: 2, suppressedReason: null });
    expect(send).toHaveBeenCalledTimes(2);
    expect(new Set(writes).size).toBe(2);
    expect(writes.every((key) => key.startsWith("incident:watch-1:"))).toBe(true);
  });

  it("holds watches outside the canary without writing deliveries", async () => {
    const { db, writes } = database();
    await expect(queueAutomatedPush(db, {
      enabled: true,
      configured: true,
      canaryPercent: 0,
      queue: { send: vi.fn() },
    }, {
      watchId: "watch-1",
      fingerprint: "changed",
      delivery: "immediate",
      locationLabel: "Grayslake, IL",
      matchCount: 1,
      topEvent: event,
      now: "2026-07-22T12:00:00.000Z",
    })).resolves.toEqual({ queued: 0, suppressedReason: "outside_canary" });
    expect(writes).toEqual([]);
  });
});
