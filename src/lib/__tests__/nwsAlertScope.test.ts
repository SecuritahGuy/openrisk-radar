import { describe, expect, it } from "vitest";
import { scopedNwsAlerts } from "../nwsAlertScope";
import type { ResolvedLocation } from "../../types/location";
import type { RiskEvent } from "../../types/riskEvent";

const location: ResolvedLocation = {
  city: "Nashville",
  state: "TN",
  postalCode: null,
  country: "USA",
  latitude: 36.1627,
  longitude: -86.7816,
  county: "Davidson County",
  stateFips: "47",
  countyFips: "037",
};

function alert(overrides: Partial<RiskEvent>): RiskEvent {
  return {
    id: "alert-1",
    source: "NWS",
    sourceEventId: "nws-1",
    type: "Flood Watch",
    category: "Weather",
    severity: "Severe",
    headline: "Flood Watch",
    description: "Test alert",
    geometryType: "None",
    latitude: null,
    longitude: null,
    polygon: null,
    startedAt: "2026-07-11T12:00:00Z",
    expiresAt: "2026-07-12T12:00:00Z",
    updatedAt: "2026-07-11T12:00:00Z",
    url: null,
    confidence: "Source reported",
    raw: {},
    ...overrides,
  };
}

describe("scopedNwsAlerts", () => {
  it("keeps point-matched alerts without geometry", () => {
    const pointAlert = alert({
      sourceEventId: "point",
      raw: { openRiskScope: { nwsPointMatch: true } },
    });

    expect(
      scopedNwsAlerts({
        pointAlerts: [pointAlert],
        statewideAlerts: [],
        location,
        radius: 10,
      })
    ).toEqual([pointAlert]);
  });

  it("keeps statewide polygon alerts inside the selected radius", () => {
    const nearbyPolygon = alert({
      sourceEventId: "nearby-polygon",
      geometryType: "Polygon",
      polygon: [
        [-86.79, 36.16],
        [-86.78, 36.16],
        [-86.78, 36.17],
        [-86.79, 36.17],
      ],
    });

    expect(
      scopedNwsAlerts({
        pointAlerts: [],
        statewideAlerts: [nearbyPolygon],
        location,
        radius: 10,
      })
    ).toEqual([nearbyPolygon]);
  });

  it("drops statewide polygon alerts outside the selected radius", () => {
    const farPolygon = alert({
      sourceEventId: "far-polygon",
      geometryType: "Polygon",
      polygon: [
        [-90.1, 35.9],
        [-90.0, 35.9],
        [-90.0, 36.0],
        [-90.1, 36.0],
      ],
    });

    expect(
      scopedNwsAlerts({
        pointAlerts: [],
        statewideAlerts: [farPolygon],
        location,
        radius: 10,
      })
    ).toEqual([]);
  });

  it("deduplicates state and point versions of the same alert", () => {
    const pointAlert = alert({
      id: "point-version",
      sourceEventId: "same-id",
      raw: { openRiskScope: { nwsPointMatch: true } },
    });
    const stateAlert = alert({
      id: "state-version",
      sourceEventId: "same-id",
      geometryType: "Polygon",
      polygon: [
        [-86.79, 36.16],
        [-86.78, 36.16],
        [-86.78, 36.17],
        [-86.79, 36.17],
      ],
    });

    expect(
      scopedNwsAlerts({
        pointAlerts: [pointAlert],
        statewideAlerts: [stateAlert],
        location,
        radius: 10,
      })
    ).toEqual([pointAlert]);
  });
});
