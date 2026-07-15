import { describe, expect, it } from "vitest";
import { eventMatchesWatch, isWatchExpired, watchExpiration } from "../watchPreferences";
import type { RiskEvent } from "../../types/riskEvent";
import type { WatchPreferences } from "../../types/location";

const preferences: WatchPreferences = {
  enabled: true,
  minimumSeverity: "Moderate",
  hazards: ["weather", "wildfire"],
  delivery: "immediate",
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  expiresAt: null,
};

const event = {
  category: "Weather",
  severity: "Moderate",
} as RiskEvent;

describe("watch preferences", () => {
  it("matches selected hazards at or above the severity threshold", () => {
    expect(eventMatchesWatch(event, preferences)).toBe(true);
    expect(eventMatchesWatch({ ...event, severity: "Minor" }, preferences)).toBe(false);
    expect(eventMatchesWatch({ ...event, category: "Seismic" }, preferences)).toBe(false);
  });

  it("disables expired watches", () => {
    const now = new Date("2026-07-14T12:00:00Z").getTime();
    const expiring = { ...preferences, expiresAt: "2026-07-14T11:00:00Z" };
    expect(isWatchExpired(expiring, now)).toBe(true);
    expect(eventMatchesWatch(event, expiring, now)).toBe(false);
  });

  it("creates deterministic temporary watch expirations", () => {
    const now = new Date("2026-07-14T12:00:00Z").getTime();
    expect(watchExpiration(7, now)).toBe("2026-07-21T12:00:00.000Z");
    expect(watchExpiration(null, now)).toBeNull();
  });
});
