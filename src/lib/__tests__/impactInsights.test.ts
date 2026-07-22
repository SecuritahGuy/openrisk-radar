import { describe, expect, it } from "vitest";
import type { ResolvedLocation } from "../../types/location";
import type { RiskEvent } from "../../types/riskEvent";
import {
  assessImpact,
  buildImpactSeveritySummary,
  currentImpactConcernEvents,
} from "../impactInsights";
import { buildActionGuidance } from "../actionGuidance";
import { buildRiskSummary } from "../riskInsights";

const location: ResolvedLocation = {
  city: "Chicago", state: "IL", country: "USA", postalCode: null,
  latitude: 41.8781, longitude: -87.6298, county: "Cook County",
  stateFips: "17", countyFips: "031",
};

function event(overrides: Partial<RiskEvent>): RiskEvent {
  return {
    id: "event", source: "NWS", sourceEventId: "source", type: "Alert",
    category: "Weather", severity: "Minor", headline: "Test alert",
    description: "Test", geometryType: "Point", latitude: 41.88,
    longitude: -87.63, polygon: null, startedAt: "2026-07-14T10:00:00Z",
    expiresAt: "2026-07-15T10:00:00Z", updatedAt: "2026-07-14T10:00:00Z",
    url: "https://example.com", confidence: "Source reported", raw: {}, ...overrides,
  };
}

describe("current impact severity", () => {
  const now = new Date("2026-07-14T12:00:00Z").getTime();

  it("excludes severe historical and out-of-radius events", () => {
    const summary = buildImpactSeveritySummary([
      event({ id: "history", source: "FEMA", severity: "Severe" }),
      event({ id: "far", severity: "Severe", latitude: 40.7, longitude: -74 }),
      event({ id: "near", severity: "Moderate" }),
    ], location, 50, now);

    expect(summary.criticalCount).toBe(0);
    expect(summary.moderateCount).toBe(1);
    expect(summary.events.map((item) => item.id)).toEqual(["near"]);
  });

  it("produces actionable guidance from the highest relevant severity", () => {
    const guidance = buildActionGuidance([
      event({ id: "minor" }),
      event({ id: "severe", severity: "Severe", category: "Wildfire" }),
    ], location, 50, now);

    expect(guidance.level).toBe("act");
    expect(guidance.sourceEvent?.id).toBe("severe");
    expect(guidance.detail).toContain("evacuation");
  });

  it("keeps country-only WHO reports from changing local risk", () => {
    const remoteWhoReport = event({
      id: "remote-who",
      source: "WHO",
      severity: "Severe",
      geometryType: "None",
      latitude: null,
      longitude: null,
      expiresAt: null,
      raw: {
        openRiskScope: {
          whoCountryMatch: true,
          whoLocalityMatch: false,
        },
      },
    });

    expect(assessImpact(remoteWhoReport, location, 50)).toMatchObject({
      level: "monitor",
    });
    const localConcerns = currentImpactConcernEvents(
      [remoteWhoReport],
      location,
      50,
      now
    );
    expect(localConcerns).toEqual([]);
    expect(buildRiskSummary(localConcerns).level).toBe("Clear");
  });

  it("includes WHO reports that name the searched state or locality", () => {
    const localWhoReport = event({
      id: "local-who",
      source: "WHO",
      severity: "Severe",
      geometryType: "None",
      latitude: null,
      longitude: null,
      expiresAt: null,
      raw: {
        openRiskScope: {
          whoCountryMatch: true,
          whoLocalityMatch: true,
        },
      },
    });

    expect(assessImpact(localWhoReport, location, 50)).toMatchObject({
      level: "affects",
    });
    expect(
      currentImpactConcernEvents([localWhoReport], location, 50, now).map(
        (item) => item.id
      )
    ).toEqual(["local-who"]);
  });
});
