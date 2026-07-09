import { describe, expect, it } from "vitest";
import {
  distanceMiles,
  filterEvents,
  severityRank,
  type SeverityFilters,
  type SourceFilters,
} from "../riskInsights";
import type { ResolvedLocation } from "../../types/location";
import type { RiskEvent } from "../../types/riskEvent";

function event(overrides: Partial<RiskEvent>): RiskEvent {
  return {
    id: "evt-1",
    source: "NWS",
    sourceEventId: "source-1",
    type: "Weather Alert",
    category: "Weather",
    severity: "Minor",
    headline: "Test event",
    description: "Test description",
    geometryType: "Point",
    latitude: 41.8781,
    longitude: -87.6298,
    polygon: null,
    startedAt: "2026-01-01T00:00:00Z",
    expiresAt: null,
    updatedAt: "2026-01-01T00:00:00Z",
    url: null,
    confidence: "Source reported",
    raw: {},
    ...overrides,
  };
}

describe("riskInsights", () => {
  it("ranks severity from minor to extreme", () => {
    expect(severityRank("Minor")).toBeLessThan(severityRank("Moderate"));
    expect(severityRank("Moderate")).toBeLessThan(severityRank("Severe"));
    expect(severityRank("Severe")).toBeLessThan(severityRank("Extreme"));
  });

  it("computes practical distance between two points", () => {
    const location: ResolvedLocation = {
      city: "Chicago",
      state: "IL",
      postalCode: null,
      country: "USA",
      latitude: 41.8781,
      longitude: -87.6298,
      county: "Cook County",
      stateFips: "17",
      countyFips: "031",
    };

    const miles = distanceMiles(location, event({
      latitude: 42.3314,
      longitude: -83.0458,
    }));

    expect(miles).not.toBeNull();
    expect(miles!).toBeGreaterThan(230);
    expect(miles!).toBeLessThan(250);
  });

  it("filters by source and severity", () => {
    const events = [
      event({ id: "nws", source: "NWS", severity: "Severe" }),
      event({ id: "usgs", source: "USGS", category: "Seismic", severity: "Minor" }),
      event({ id: "spc", source: "SPC", severity: "Moderate" }),
    ];

    const sourceFilters: SourceFilters = {
      NWS: true,
      USGS: false,
      FEMA: true,
      NIFC: true,
      SPC: true,
      NHC: true,
      GDACS: true,
      EONET: true,
    };
    const severityFilters: SeverityFilters = {
      Extreme: true,
      Severe: true,
      Moderate: false,
      Minor: true,
    };

    expect(filterEvents(events, sourceFilters, severityFilters).map((e) => e.id))
      .toEqual(["nws"]);
  });
});
