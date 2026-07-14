import { describe, expect, it } from "vitest";
import {
  activeConcernEvents,
  buildRiskSummary,
  concernContextLabel,
  distanceMiles,
  explainRiskScore,
  filterEvents,
  isStaleConcernEvent,
  sourceColor,
  sourceLabel,
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
  const now = new Date("2026-07-13T12:00:00Z").getTime();

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
      NOAA: true,
      NWPS: true,
      USGS: false,
      USGS_WATER: true,
      VOLCANO: true,
      DROUGHT: true,
      EMSC: true,
      FEMA: true,
      NIFC: true,
      SPC: true,
      NHC: true,
      GDACS: true,
      EONET: true,
      AIRNOW: true,
      COOPS: true,
      SPACE_WEATHER: true,
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

  it("supports environmental event sources", () => {
    expect(sourceColor("USGS_WATER")).toBe("#0288d1");
    expect(sourceColor("NOAA")).toBe("#0065a8");
    expect(sourceColor("NWPS")).toBe("#01579b");
    expect(sourceColor("VOLCANO")).toBe("#8d6e63");
    expect(sourceColor("DROUGHT")).toBe("#795548");
    expect(sourceColor("EMSC")).toBe("#43a047");
    expect(sourceColor("AIRNOW")).toBe("#455a64");
    expect(sourceColor("COOPS")).toBe("#0277bd");
    expect(sourceColor("SPACE_WEATHER")).toBe("#5e35b1");
  });

  it("provides readable labels for internal source codes", () => {
    expect(sourceLabel("USGS_WATER")).toBe("USGS Water");
    expect(sourceLabel("SPACE_WEATHER")).toBe("NOAA Space Weather");
  });

  it("explains risk score contributions and source counts", () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const explanation = explainRiskScore([
      event({ id: "extreme", source: "NWS", severity: "Extreme", expiresAt }),
      event({ id: "severe", source: "SPC", severity: "Severe" }),
      event({ id: "moderate", source: "SPC", severity: "Moderate" }),
    ]);

    expect(explanation.score).toBe(76);
    expect(explanation.level).toBe("Critical");
    expect(explanation.rule).toContain("extreme signal");
    expect(explanation.contributions).toEqual([
      {
        id: "extreme",
        label: "Extreme signals",
        count: 1,
        points: 40,
        detail: "+40 each",
      },
      {
        id: "severe",
        label: "Severe signals",
        count: 1,
        points: 18,
        detail: "+18 each",
      },
      {
        id: "moderate",
        label: "Moderate signals",
        count: 1,
        points: 7,
        detail: "+7 each",
      },
      {
        id: "expiring",
        label: "Expiring soon",
        count: 1,
        points: 8,
        detail: "+8 each",
      },
      {
        id: "active",
        label: "Active signals",
        count: 3,
        points: 3,
        detail: "+1 each",
      },
    ]);
    expect(explanation.sourceCounts).toEqual([
      { source: "SPC", count: 2 },
      { source: "NWS", count: 1 },
    ]);
  });

  it("excludes FEMA history from active concern scoring", () => {
    const femaHistory = event({
      id: "covid-disaster",
      source: "FEMA",
      sourceEventId: "DR-4489-IL",
      type: "COVID-19",
      category: "Disaster",
      severity: "Severe",
      headline: "COVID-19 Pandemic",
      startedAt: "2020-01-20T00:00:00Z",
      updatedAt: "2020-03-26T00:00:00Z",
      expiresAt: "2023-05-11T00:00:00Z",
    });

    expect(activeConcernEvents([femaHistory], now)).toEqual([]);
    expect(concernContextLabel(femaHistory)).toBe("Historical");
    expect(buildRiskSummary(activeConcernEvents([femaHistory], now))).toMatchObject({
      level: "Clear",
      score: 0,
      topDriver: "No active signals",
    });
  });

  it("excludes expired and very old non-expiring records from active concerns", () => {
    const expired = event({
      id: "expired",
      severity: "Severe",
      updatedAt: "2026-07-13T10:00:00Z",
      expiresAt: "2026-07-13T11:00:00Z",
    });
    const veryOld = event({
      id: "old",
      severity: "Severe",
      updatedAt: "2026-01-01T00:00:00Z",
      expiresAt: null,
    });
    const current = event({
      id: "current",
      severity: "Severe",
      updatedAt: "2026-07-13T11:00:00Z",
      expiresAt: null,
    });

    expect(isStaleConcernEvent(expired, now)).toBe(true);
    expect(isStaleConcernEvent(veryOld, now)).toBe(true);
    expect(concernContextLabel(expired)).toBe("Expired");
    expect(activeConcernEvents([expired, veryOld, current], now).map((e) => e.id))
      .toEqual(["current"]);
  });
});
