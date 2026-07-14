import { describe, expect, it } from "vitest";
import { compareVisitSnapshots, type VisitSnapshot } from "../visitChanges";

describe("visitChanges", () => {
  it("identifies new, escalated, updated, and resolved signals", () => {
    const previous: VisitSnapshot = {
      "NWS:a": { severity: "Minor", updatedAt: "2026-07-13T10:00:00Z" },
      "USGS:b": { severity: "Minor", updatedAt: "2026-07-13T10:00:00Z" },
      "SPC:c": { severity: "Moderate", updatedAt: "2026-07-13T10:00:00Z" },
      "NHC:d": { severity: "Severe", updatedAt: "2026-07-13T10:00:00Z" },
    };
    const current: VisitSnapshot = {
      "NWS:a": { severity: "Moderate", updatedAt: "2026-07-14T10:00:00Z" },
      "USGS:b": { severity: "Minor", updatedAt: "2026-07-14T10:00:00Z" },
      "SPC:c": { severity: "Moderate", updatedAt: "2026-07-13T10:00:00Z" },
      "EONET:e": { severity: "Minor", updatedAt: "2026-07-14T10:00:00Z" },
    };

    expect(compareVisitSnapshots(previous, current)).toEqual({
      newCount: 1,
      escalatedCount: 1,
      updatedCount: 1,
      resolvedCount: 1,
    });
  });
});
