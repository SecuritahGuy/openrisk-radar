import { describe, expect, it } from "vitest";
import { canonicalIncidentEvents, incidentMetadata } from "../incidents";
import type { RiskEvent } from "../../types/riskEvent";

function event(overrides: Partial<RiskEvent>): RiskEvent {
  return {
    id: "event",
    source: "USGS",
    sourceEventId: "source-event",
    type: "Earthquake",
    category: "Seismic",
    severity: "Moderate",
    headline: "M4.8 earthquake",
    description: "Test event",
    geometryType: "Point",
    latitude: 34,
    longitude: -118,
    polygon: null,
    startedAt: "2026-07-14T10:00:00Z",
    expiresAt: null,
    updatedAt: "2026-07-14T10:02:00Z",
    url: null,
    confidence: "Source reported",
    raw: {},
    ...overrides,
  };
}

describe("canonical incidents", () => {
  it("correlates nearby cross-source reports while preserving the official primary", () => {
    const result = canonicalIncidentEvents([
      event({ source: "USGS", sourceEventId: "us-1" }),
      event({
        source: "EMSC",
        sourceEventId: "eu-1",
        latitude: 34.1,
        longitude: -118.1,
        updatedAt: "2026-07-14T10:05:00Z",
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("USGS");
    expect(incidentMetadata(result[0])).toMatchObject({
      agreement: "corroborated",
      eventCount: 2,
      sources: ["EMSC", "USGS"],
    });
  });

  it("does not merge distant or same-source events", () => {
    const result = canonicalIncidentEvents([
      event({ sourceEventId: "us-1" }),
      event({ sourceEventId: "us-2", latitude: 40, longitude: -75 }),
    ]);
    expect(result).toHaveLength(2);
  });

  it("collapses duplicate records with the same provider identifier", () => {
    const result = canonicalIncidentEvents([
      event({ id: "one" }),
      event({ id: "two", updatedAt: "2026-07-14T10:08:00Z" }),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].updatedAt).toBe("2026-07-14T10:08:00.000Z");
  });
});
