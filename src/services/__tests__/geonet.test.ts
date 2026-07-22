import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGeoNetQuakes, normalizeGeoNet, supportsGeoNet, type GeoNetFeature } from "../geonet";

const feature: GeoNetFeature = {
  type: "Feature",
  geometry: { type: "Point", coordinates: [174.78, -41.29] },
  properties: {
    publicID: "2026p123456",
    time: "2026-07-21T12:00:00Z",
    depth: 12.345,
    magnitude: 4.2,
    locality: "10 km north of Wellington",
    quality: "best",
  },
};

afterEach(() => vi.restoreAllMocks());

describe("GeoNet", () => {
  it("normalizes the live two-coordinate shape and uses the depth property", () => {
    const event = normalizeGeoNet(feature);
    expect(event).toMatchObject({
      source: "GEONET",
      sourceEventId: "2026p123456",
      severity: "Moderate",
      latitude: -41.29,
      longitude: 174.78,
      provider: { id: "geonet-nz", label: "GeoNet New Zealand" },
    });
    expect(event.description).toContain("Depth: 12.3 km");
    expect(event.headline).toBe("M4.2 — 10 km north of Wellington");
    expect(event.description).not.toContain("NaN");
  });

  it("activates only for resolved New Zealand locations", () => {
    const location = {
      city: "Wellington", state: "Wellington", postalCode: null, country: "New Zealand",
      latitude: -41.29, longitude: 174.78, county: null, stateFips: null, countyFips: null,
    };
    expect(supportsGeoNet(location)).toBe(true);
    expect(supportsGeoNet({ ...location, country: "USA" })).toBe(false);
  });

  it("keeps only earthquakes inside the selected radius", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      type: "FeatureCollection",
      features: [
        feature,
        { ...feature, properties: { ...feature.properties, publicID: "far" }, geometry: { type: "Point", coordinates: [170, -45] } },
      ],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const events = await fetchGeoNetQuakes(-41.29, 174.78, 50);
    expect(events.map((event) => event.sourceEventId)).toEqual(["2026p123456"]);
  });
});
