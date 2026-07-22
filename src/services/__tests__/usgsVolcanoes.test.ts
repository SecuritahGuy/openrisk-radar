import { describe, expect, it } from "vitest";
import { normalizeElevatedVolcano, type VolcanoElevated } from "../usgsVolcanoes";

function fixture(overrides: Partial<VolcanoElevated> = {}): VolcanoElevated {
  return {
    vName: "Test Volcano",
    vnum: "123456",
    volcanoCd: "TEST",
    obs: "test observatory",
    lat: 45.1,
    long: -122.2,
    alertLevel: "ADVISORY",
    colorCode: "YELLOW",
    alertLevelPrev: "NORMAL",
    colorCodePrev: "GREEN",
    nvewsThreat: "High",
    noticeSynopsis: "Elevated unrest is occurring.",
    noticeUrl: "https://example.com/notice",
    alertDate: "2026-07-21T10:00:00Z",
    ...overrides,
  };
}

describe("USGS volcano normalization", () => {
  it("normalizes an elevated record with stable timing and geometry", () => {
    expect(normalizeElevatedVolcano(fixture(), "2026-07-22T12:00:00Z")).toMatchObject({
      source: "VOLCANO",
      sourceEventId: "usgs-volcano-123456",
      severity: "Moderate",
      startedAt: "2026-07-21T10:00:00Z",
      updatedAt: "2026-07-22T12:00:00Z",
      geometry: { type: "Point", latitude: 45.1, longitude: -122.2 },
    });
  });

  it("uses aviation color severity when an alert level is unknown", () => {
    expect(normalizeElevatedVolcano(
      fixture({ alertLevel: "UNKNOWN", colorCode: "ORANGE" }),
      "2026-07-22T12:00:00Z"
    ).severity).toBe("Severe");
  });

  it("falls back to the observation time when the provider omits alertDate", () => {
    expect(normalizeElevatedVolcano(
      fixture({ alertDate: "" }),
      "2026-07-22T12:00:00Z"
    ).startedAt).toBe("2026-07-22T12:00:00Z");
  });
});
