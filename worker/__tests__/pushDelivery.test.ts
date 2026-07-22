import { describe, expect, it } from "vitest";
import type { D1Database, D1PreparedStatement } from "../d1";
import { markPushDeliveryExhausted, pushFailureAction } from "../pushDelivery";

describe("push provider failure handling", () => {
  it("invalidates expired endpoints", () => {
    expect(pushFailureAction(404)).toBe("invalid");
    expect(pushFailureAction(410)).toBe("invalid");
  });

  it("retries throttling and provider failures only", () => {
    expect(pushFailureAction(429)).toBe("retry");
    expect(pushFailureAction(503)).toBe("retry");
    expect(pushFailureAction(400)).toBe("failed");
    expect(pushFailureAction()).toBe("failed");
  });

  it("marks an exhausted queued delivery failed before it moves to the DLQ", async () => {
    const bound: unknown[][] = [];
    const db: D1Database = {
      prepare: (): D1PreparedStatement => {
        const statement: D1PreparedStatement = {
          bind: (...values: unknown[]) => {
            bound.push(values);
            return statement;
          },
          first: async () => null,
          all: async () => ({ success: true, results: [] }),
          run: async () => ({ success: true }),
        };
        return statement;
      },
    };
    await markPushDeliveryExhausted(db, "delivery-1", new Error("provider unavailable"));
    expect(bound[0][0]).toContain("Retries exhausted: provider unavailable");
    expect(bound[0][2]).toBe("delivery-1");
  });
});
