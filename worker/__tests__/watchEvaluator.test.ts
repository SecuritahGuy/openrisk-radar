import { describe, expect, it } from "vitest";
import { classifyAuditSourceCoverage } from "../watchEvaluator";

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
