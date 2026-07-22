import { describe, expect, it } from "vitest";
import { normalizeWzdxFeed } from "../wzdx";

const NOW = Date.parse("2026-07-21T12:00:00Z");

function feed(features: unknown[]) {
  return { type: "FeatureCollection", features };
}

describe("WZDx normalization", () => {
  it("normalizes and radius-filters an active road closure", () => {
    const events = normalizeWzdxFeed(
      feed([
        {
          id: "close-1",
          geometry: {
            type: "LineString",
            coordinates: [[-88.04, 42.34], [-88.01, 42.36]],
          },
          properties: {
            core_details: {
              event_type: "work-zone",
              road_names: ["IL 83"],
              direction: "northbound",
              description: "Bridge repairs",
              update_date: "2026-07-21T11:30:00Z",
            },
            start_date: "2026-07-20T00:00:00Z",
            end_date: "2026-07-25T00:00:00Z",
            vehicle_impact: "all-lanes-closed",
          },
        },
        {
          id: "far-away",
          geometry: { type: "Point", coordinates: [-90, 40] },
          properties: { start_date: "2026-07-20T00:00:00Z" },
        },
      ]),
      { id: "idot", label: "Illinois DOT" },
      "IL",
      42.35,
      -88.03,
      20,
      NOW
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "USDOT",
      sourceEventId: "idot:close-1",
      category: "Transportation",
      type: "Road Closure",
      severity: "Severe",
      provider: { id: "idot", label: "Illinois DOT", authority: "state" },
    });
  });

  it("excludes ended and far-future work zones", () => {
    const features = [
      {
        id: "ended",
        geometry: { type: "Point", coordinates: [-88.03, 42.35] },
        properties: {
          start_date: "2026-07-01T00:00:00Z",
          end_date: "2026-07-10T00:00:00Z",
        },
      },
      {
        id: "future",
        geometry: { type: "Point", coordinates: [-88.03, 42.35] },
        properties: { start_date: "2026-08-20T00:00:00Z" },
      },
    ];

    expect(
      normalizeWzdxFeed(
        feed(features),
        { id: "idot", label: "Illinois DOT" },
        "IL",
        42.35,
        -88.03,
        20,
        NOW
      )
    ).toEqual([]);
  });
});
