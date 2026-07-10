import { describe, expect, it } from "vitest";

// Tests for usgsVolcanoes service — the fetch functions are integration-only,
// but the severity mapping logic can be verified structurally via the source type.

describe("usgsVolcanoes module shape", () => {
  it("exports expected functions", async () => {
    const mod = await import("../usgsVolcanoes");
    expect(typeof mod.fetchElevatedVolcanoes).toBe("function");
    expect(typeof mod.fetchNearbyVolcanoes).toBe("function");
    expect(typeof mod.fetchAllVolcanoStatus).toBe("function");
  });
});
