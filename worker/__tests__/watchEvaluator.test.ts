import { describe, expect, it } from "vitest";
import { classifyAuditSourceCoverage, mapWithConcurrency } from "../watchEvaluator";

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

describe("watch audit concurrency", () => {
  it("bounds parallel work and preserves result order", async () => {
    let active = 0;
    let peak = 0;
    const results = await mapWithConcurrency([5, 4, 3, 2, 1], 2, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, value));
      active -= 1;
      return value * 10;
    });

    expect(peak).toBe(2);
    expect(results).toEqual([50, 40, 30, 20, 10]);
  });

  it("rejects invalid concurrency", async () => {
    await expect(mapWithConcurrency([1], 0, async (value) => value)).rejects.toThrow(
      "Concurrency must be a positive integer"
    );
  });
});
