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

  it("merges transitive cross-source matches regardless of input order", () => {
    const input = [
      event({ source: "USGS", sourceEventId: "us", longitude: -118 }),
      event({ source: "GEONET", sourceEventId: "nz", longitude: -117.2 }),
      event({ source: "EMSC", sourceEventId: "eu", longitude: -117.6 }),
    ];
    const result = canonicalIncidentEvents(input);
    const reversed = canonicalIncidentEvents([...input].reverse());

    expect(result).toHaveLength(1);
    expect(reversed.map((item) => item.id)).toEqual(result.map((item) => item.id));
    expect(incidentMetadata(result[0])).toMatchObject({
      agreement: "corroborated",
      eventCount: 3,
      sources: ["EMSC", "GEONET", "USGS"],
    });
  });

  it("distinguishes providers that share a generic source and event identifier", () => {
    const shared = {
      source: "REGIONAL" as const,
      sourceEventId: "42",
      category: "Wildfire" as const,
      type: "Wildfire",
    };
    const result = canonicalIncidentEvents([
      event({
        ...shared,
        provider: { id: "state-fire", label: "State Fire", authority: "state", attributionUrl: "https://example.com/fire" },
      }),
      event({
        ...shared,
        longitude: -117.9,
        provider: { id: "county-oem", label: "County OEM", authority: "local", attributionUrl: "https://example.com/oem" },
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(incidentMetadata(result[0])).toMatchObject({
      agreement: "corroborated",
      providerCount: 2,
    });
  });

  it("correlates an observed SPC report inside an NWS warning polygon", () => {
    const result = canonicalIncidentEvents([
      event({
        source: "NWS",
        sourceEventId: "warning",
        type: "Tornado Warning",
        category: "Weather",
        geometryType: "Polygon",
        latitude: 34,
        longitude: -118,
        polygon: [
          [-118.2, 33.8],
          [-117.8, 33.8],
          [-117.8, 34.2],
          [-118.2, 34.2],
          [-118.2, 33.8],
        ],
      }),
      event({
        source: "SPC",
        sourceEventId: "report",
        type: "Tornado Report",
        category: "Weather",
        latitude: 34.1,
        longitude: -118.1,
        startedAt: "2026-07-14T10:20:00Z",
      }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("NWS");
    expect(incidentMetadata(result[0])?.sources).toEqual(["NWS", "SPC"]);
  });

  it("keeps SPC forecast outlooks separate from observed weather incidents", () => {
    const result = canonicalIncidentEvents([
      event({
        source: "NWS",
        sourceEventId: "warning",
        type: "Tornado Warning",
        category: "Weather",
      }),
      event({
        source: "SPC",
        sourceEventId: "outlook",
        type: "Day 1 Convective Outlook",
        category: "Weather",
      }),
    ]);

    expect(result).toHaveLength(2);
  });
});
