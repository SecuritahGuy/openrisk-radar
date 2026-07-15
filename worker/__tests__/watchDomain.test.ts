import { describe, expect, it } from "vitest";
import type { RiskEvent } from "../../src/types/riskEvent";
import type { WatchPreferences } from "../../src/types/location";
import {
  classifyAuditChange,
  incidentFingerprint,
  isWithinQuietHours,
  nextWatchCheck,
  validateWatchRegistration,
  watchStatus,
} from "../watchDomain";

const preferences: WatchPreferences = {
  enabled: true,
  minimumSeverity: "Moderate",
  hazards: ["weather", "earthquake"],
  delivery: "immediate",
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  expiresAt: null,
};

describe("watch domain", () => {
  it("validates an anonymous watch registration", () => {
    const result = validateWatchRegistration({
      location: { latitude: 41.8781, longitude: -87.6298, radiusMiles: 50 },
      preferences,
      timezone: "America/Chicago",
    });
    expect(result.valid).toBe(true);
    expect(result.value?.location.radiusMiles).toBe(50);
  });

  it("rejects unsupported radius and timezone values", () => {
    expect(validateWatchRegistration({
      location: { latitude: 41, longitude: -87, radiusMiles: 500 },
      preferences,
      timezone: "Mars/Olympus",
    }).valid).toBe(false);
  });

  it("handles paused, expired, and next-check state", () => {
    const now = new Date("2026-07-15T12:00:00Z").getTime();
    expect(watchStatus({ ...preferences, enabled: false }, now)).toBe("paused");
    expect(watchStatus({ ...preferences, expiresAt: "2026-07-15T11:00:00Z" }, now)).toBe("expired");
    expect(nextWatchCheck(preferences, now)).toBe("2026-07-15T13:00:00.000Z");
  });

  it("creates order-independent incident fingerprints", () => {
    const first = { source: "NWS", sourceEventId: "a", severity: "Severe", updatedAt: "2026-07-15T12:00:00Z" } as RiskEvent;
    const second = { source: "USGS", sourceEventId: "b", severity: "Moderate", updatedAt: "2026-07-15T11:00:00Z" } as RiskEvent;
    expect(incidentFingerprint([first, second])).toBe(incidentFingerprint([second, first]));
    expect(incidentFingerprint([])).toBe("none");
  });

  it("supports quiet hours that cross midnight", () => {
    expect(isWithinQuietHours(preferences, "America/Chicago", new Date("2026-07-15T04:00:00Z").getTime())).toBe(true);
    expect(isWithinQuietHours(preferences, "America/Chicago", new Date("2026-07-15T18:00:00Z").getTime())).toBe(false);
  });

  it("classifies baseline, changed, quiet, and resolved audit states", () => {
    expect(classifyAuditChange(null, "new", false)).toEqual({
      kind: "baseline", wouldNotify: false, suppressedReason: null,
    });
    expect(classifyAuditChange("old", "new", false)).toEqual({
      kind: "change", wouldNotify: true, suppressedReason: null,
    });
    expect(classifyAuditChange("old", "new", true)).toEqual({
      kind: "change", wouldNotify: false, suppressedReason: "quiet_hours",
    });
    expect(classifyAuditChange("old", "none", false).kind).toBe("resolved");
    expect(classifyAuditChange("same", "same", false).kind).toBeNull();
  });
});
