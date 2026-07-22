import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGlobalTsunamiAlerts, normalizeGtm, type GtmFeature } from "../gtm";

const feature: GtmFeature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [-92.65, 14.82] },
  properties: {
    guid: "46578772",
    event_time: "2026-07-22T10:00:00Z",
    place: "Chiapas",
    magnitude: "7.4",
    warning_level: "ORANGE",
  },
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Global Tsunami Monitor freshness", () => {
  it("uses the event time for freshness and supplies a 24-hour expiry", () => {
    expect(normalizeGtm(feature, "2026-07-22T12:00:00Z")).toMatchObject({
      source: "GTM",
      severity: "Severe",
      startedAt: "2026-07-22T10:00:00Z",
      updatedAt: "2026-07-22T10:00:00Z",
      expiresAt: "2026-07-23T10:00:00.000Z",
      provider: { id: "gtm-crisisinfo" },
    });
  });

  it("does not return events older than the active window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-22T12:00:00Z"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      ...feature,
      properties: { ...feature.properties, event_time: "2026-07-20T10:00:00Z" },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(fetchGlobalTsunamiAlerts(14.82, -92.65, 100)).resolves.toEqual([]);
  });
});
