import { describe, expect, it } from "vitest";
import {
  buildSignalCorrelations,
  summarizeSourceAgreement,
} from "../signalCorrelation";
import type { RiskEvent } from "../../types/riskEvent";

const NOW = new Date("2026-07-13T12:00:00Z").getTime();

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
    startedAt: "2026-07-13T10:00:00Z",
    expiresAt: null,
    updatedAt: "2026-07-13T11:00:00Z",
    url: null,
    confidence: "Source reported",
    raw: {},
    ...overrides,
  };
}

describe("signalCorrelation", () => {
  it("corroborates related weather signals across sources", () => {
    const correlations = buildSignalCorrelations(
      [
        event({ id: "nws", source: "NWS", severity: "Severe" }),
        event({ id: "spc", source: "SPC", severity: "Moderate" }),
      ],
      NOW
    );

    expect(correlations[0]).toMatchObject({
      id: "weather",
      label: "Weather hazard",
      agreement: "corroborated",
      agreementLabel: "Corroborated",
      severity: "Severe",
      sources: ["NWS", "SPC"],
      eventCount: 2,
    });
  });

  it("identifies single-source concerns", () => {
    const correlations = buildSignalCorrelations(
      [event({ id: "fire", source: "NIFC", category: "Wildfire" })],
      NOW
    );

    expect(correlations[0]).toMatchObject({
      id: "fire-air-drought",
      label: "Fire, air & drought",
      agreement: "single-source",
      sources: ["NIFC"],
    });
    expect(
      summarizeSourceAgreement(
        [event({ source: "NIFC", category: "Wildfire" })],
        NOW
      )
    )
      .toContain("none are corroborated");
  });

  it("marks stale groups when the latest update is more than 24 hours old", () => {
    const correlations = buildSignalCorrelations(
      [
        event({
          id: "old",
          source: "AIRNOW",
          category: "Air Quality",
          updatedAt: "2026-07-11T11:00:00Z",
        }),
        event({
          id: "older",
          source: "DROUGHT",
          category: "Drought",
          updatedAt: "2026-07-10T11:00:00Z",
        }),
      ],
      NOW
    );

    expect(correlations[0]).toMatchObject({
      id: "fire-air-drought",
      agreement: "stale",
      agreementLabel: "Stale",
      sources: ["AIRNOW", "DROUGHT"],
    });
    expect(
      summarizeSourceAgreement(
        [
          event({
            source: "AIRNOW",
            category: "Air Quality",
            updatedAt: "2026-07-11T11:00:00Z",
          }),
        ],
        NOW
      )
    ).toContain("appear stale");
  });

  it("does not treat FEMA history as source agreement concern", () => {
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

    expect(buildSignalCorrelations([femaHistory], NOW)).toEqual([]);
    expect(summarizeSourceAgreement([femaHistory], NOW)).toBe(
      "No active hazard feeds are reporting in this radius."
    );
  });
});
