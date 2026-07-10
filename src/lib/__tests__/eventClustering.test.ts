import { describe, expect, it } from "vitest";
import {
  clusterCellDegrees,
  clusterPointEvents,
  isEventCluster,
  topClusterSeverity,
} from "../eventClustering";
import type { RiskEvent } from "../../types/riskEvent";

function event(overrides: Partial<RiskEvent>): RiskEvent {
  return {
    id: "evt-1",
    source: "USGS",
    sourceEventId: "source-1",
    type: "Earthquake",
    category: "Seismic",
    severity: "Minor",
    headline: "Test event",
    description: "Test description",
    geometryType: "Point",
    latitude: 36.16,
    longitude: -86.78,
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

describe("eventClustering", () => {
  it("disables clustering at close zoom", () => {
    expect(clusterCellDegrees(11)).toBeNull();
    expect(clusterCellDegrees(12)).toBeNull();
  });

  it("clusters nearby point events at low zoom", () => {
    const layers = clusterPointEvents(
      [
        event({ id: "a", latitude: 36.16, longitude: -86.78 }),
        event({ id: "b", latitude: 36.18, longitude: -86.8 }),
        event({ id: "c", latitude: 40.71, longitude: -74.01 }),
      ],
      5
    );

    const clusters = layers.filter(isEventCluster);
    const singleEvents = layers.filter((layer) => !isEventCluster(layer));

    expect(clusters).toHaveLength(1);
    expect(clusters[0].events.map((item) => item.id)).toEqual(["a", "b"]);
    expect(singleEvents.map((item) => item.id)).toEqual(["c"]);
  });

  it("returns original events when clustering is disabled", () => {
    const events = [
      event({ id: "a", latitude: 36.16, longitude: -86.78 }),
      event({ id: "b", latitude: 36.18, longitude: -86.8 }),
    ];

    expect(clusterPointEvents(events, 11)).toBe(events);
  });

  it("uses the highest severity for a cluster", () => {
    expect(
      topClusterSeverity([
        event({ id: "minor", severity: "Minor" }),
        event({ id: "severe", severity: "Severe" }),
        event({ id: "moderate", severity: "Moderate" }),
      ])
    ).toBe("Severe");
  });
});
