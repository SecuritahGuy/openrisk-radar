import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchCoopsWaterLevels } from "../coops";
import { fetchRiverConditions } from "../usgsWater";

function jsonResponse(payload: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => payload } as Response;
}

function usgsSite(id: string, latitude: number, longitude: number) {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [longitude, latitude] },
    properties: {
      id,
      monitoring_location_name: id,
      site_type_code: "ST",
      county_name: "Test",
      state_name: "Illinois",
    },
  };
}

function usgsReading(siteId: string, value: string, time: string, parameterCode = "00060") {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [-88, 42] },
    properties: {
      monitoring_location_id: siteId,
      parameter_code: parameterCode,
      value,
      time,
      unit_of_measure: "ft3/s",
      approval_status: "Approved",
    },
  };
}

describe("water observation locality and freshness contracts", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-23T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("keeps only USGS stream sites inside the requested circular radius", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("monitoring-locations/items")) {
        return jsonResponse({
          features: [
            usgsSite("inside", 42.1, -88),
            usgsSite("bbox-corner", 42.3, -87.6),
          ],
        });
      }
      return jsonResponse({
        features: [usgsReading("inside", "12000", "2026-07-23T11:55:00Z")],
      });
    });

    const signals = await fetchRiverConditions(42, -88, 40);
    const readingRequests = fetchMock.mock.calls
      .map(([input]) => String(input))
      .filter((url) => url.includes("latest-continuous/items"));

    expect(signals.map((signal) => signal.sourceEventId)).toEqual(["usgs-water-inside"]);
    expect(readingRequests).toHaveLength(1);
    expect(readingRequests[0]).toContain("monitoring_location_id=inside");
  });

  it("drops stale and non-numeric USGS readings instead of presenting them as current", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).includes("monitoring-locations/items")) {
        return jsonResponse({ features: [usgsSite("stale", 42, -88)] });
      }
      return jsonResponse({
        features: [
          usgsReading("stale", "not-a-number", "2026-07-23T11:55:00Z"),
          usgsReading("stale", "7.2", "2026-07-23T01:00:00Z", "00065"),
        ],
      });
    });

    await expect(fetchRiverConditions(42, -88, 40)).resolves.toEqual([]);
  });

  it("keeps valid NOAA observations when another station request fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("stations.json")) {
        return jsonResponse({
          stations: [
            { id: "good", name: "Good Harbor", lat: 41.73, lng: -87.54 },
            { id: "failed", name: "Failed Harbor", lat: 41.74, lng: -87.55 },
          ],
        });
      }
      if (url.includes("station=failed")) {
        throw new Error("station temporarily unavailable");
      }
      return jsonResponse({
        data: [{ t: "2026-07-23 11:54", v: "1.25", s: "0.05", q: "v" }],
      });
    });

    const signals = await fetchCoopsWaterLevels(41.73, -87.54, 50);

    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      sourceEventId: "good",
      headline: "Good Harbor water level",
    });
  });

  it("drops stale or invalid NOAA water levels", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("stations.json")) {
        return jsonResponse({
          stations: [
            { id: "good", name: "Good Harbor", lat: 41.73, lng: -87.54 },
            { id: "stale", name: "Stale Harbor", lat: 41.74, lng: -87.55 },
          ],
        });
      }
      return url.includes("station=good")
        ? jsonResponse({ data: [{ t: "2026-07-23 11:54", v: "NaN" }] })
        : jsonResponse({ data: [{ t: "2026-07-23 01:00", v: "2.5" }] });
    });

    await expect(fetchCoopsWaterLevels(41.73, -87.54, 50)).resolves.toEqual([]);
  });
});
