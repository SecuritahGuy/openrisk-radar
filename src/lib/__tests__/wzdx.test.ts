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

  it("collapses linked NYSDOT recurrences and preserves useful roadwork details", () => {
    const description = "Gas main work on NY 208 southbound between Houston Place and Aristotle Drive - alternating traffic";
    const occurrence = (
      id: string,
      start: string,
      end: string,
      relations: Array<{ type: string; id: string }>
    ) => ({
      id,
      geometry: { type: "MultiPoint", coordinates: [[-73.91, 41.79]] },
      properties: {
        core_details: {
          event_type: "work-zone",
          data_source_id: "TRANSCOM",
          road_names: ["NY 208"],
          direction: "unknown",
          description,
          update_date: "2026-07-21T11:30:00Z",
          related_road_events: relations,
        },
        road_event_id: id,
        beginning_cross_street: "Houston Place",
        ending_cross_street: "Aristotle Drive",
        start_date: start,
        end_date: end,
        vehicle_impact: "unknown",
        is_start_position_verified: false,
        is_end_position_verified: false,
      },
    });
    const events = normalizeWzdxFeed(
      feed([
        occurrence("first", "2026-07-21T13:00:00Z", "2026-07-21T19:30:00Z", [
          { type: "next-occurrence", id: "second" },
        ]),
        occurrence("second", "2026-07-22T13:00:00Z", "2026-07-22T19:30:00Z", [
          { type: "first-occurrence", id: "first" },
          { type: "next-occurrence", id: "third" },
        ]),
        occurrence("third", "2026-07-23T13:00:00Z", "2026-07-23T19:30:00Z", [
          { type: "first-occurrence", id: "first" },
        ]),
      ]),
      { id: "new-york-dot", label: "New York DOT", url: "https://511ny.org/api/wzdx" },
      "NY",
      41.79,
      -73.91,
      20,
      NOW
    );

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "Work Zone",
      severity: "Moderate",
      sourceEventId: "new-york-dot:first",
      headline: "Gas main work on NY 208 southbound",
      url: "https://511ny.org/api/wzdx",
      raw: {
        direction: null,
        effectiveVehicleImpact: "some-lanes-closed",
        beginningCrossStreet: "Houston Place",
        endingCrossStreet: "Aristotle Drive",
        occurrenceCount: 3,
        recurrenceId: "first",
        seriesEndAt: "2026-07-23T19:30:00Z",
      },
    });
    expect(events[0].headline).not.toContain("unknown");
  });
});
