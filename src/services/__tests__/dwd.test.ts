import { afterEach, describe, expect, it, vi } from "vitest";
import {
  dwdFeatureMatchesLocation,
  fetchDwdWarnings,
  normalizeDwdFeature,
  supportsDwd,
  type DwdWarningFeature,
} from "../dwd";

const berlinWarning: DwdWarningFeature = {
  id: "Warnungen_Gemeinden_vereinigt.berlin",
  type: "Feature",
  geometry: {
    type: "MultiPolygon",
    coordinates: [[[[13.2, 52.4], [13.6, 52.4], [13.6, 52.7], [13.2, 52.7], [13.2, 52.4]]]],
  },
  properties: {
    IDENTIFIER: "dwd-berlin-wind",
    SENT: "2026-07-22T05:06:00Z",
    ONSET: "2026-07-22T08:00:00Z",
    EXPIRES: "2026-07-22T19:00:00Z",
    EVENT: "STURMBÖEN",
    SEVERITY: "Severe",
    HEADLINE: "Amtliche WARNUNG vor STURMBÖEN",
    DESCRIPTION: "Wind gusts are expected.",
    INSTRUCTION: "Secure loose objects.",
    WEB: "https://dwd.de/warnungen",
  },
};

const munichWarning: DwdWarningFeature = {
  ...berlinWarning,
  id: "Warnungen_Gemeinden_vereinigt.munich",
  geometry: {
    type: "Polygon",
    coordinates: [[[11.4, 48.0], [11.8, 48.0], [11.8, 48.3], [11.4, 48.3], [11.4, 48.0]]],
  },
  properties: { ...berlinWarning.properties, IDENTIFIER: "dwd-munich-wind" },
};

afterEach(() => vi.restoreAllMocks());

describe("DWD warnings", () => {
  it("activates only for resolved German locations", () => {
    const location = {
      city: "Berlin", state: "Berlin", postalCode: "10115", country: "Germany",
      latitude: 52.52, longitude: 13.405, county: null, stateFips: null, countyFips: null,
    };
    expect(supportsDwd(location)).toBe(true);
    expect(supportsDwd({ ...location, country: "Deutschland" })).toBe(true);
    expect(supportsDwd({ ...location, country: "USA" })).toBe(false);
  });

  it("normalizes CAP severity, geometry, times, and attribution", () => {
    expect(normalizeDwdFeature(berlinWarning, 52.52, 13.405)).toMatchObject({
      source: "DWD",
      sourceEventId: "dwd-berlin-wind",
      type: "STURMBÖEN",
      severity: "Severe",
      headline: "Amtliche WARNUNG vor STURMBÖEN",
      geometryType: "Polygon",
      startedAt: "2026-07-22T08:00:00Z",
      expiresAt: "2026-07-22T19:00:00Z",
      provider: { id: "dwd-de", label: "Deutscher Wetterdienst" },
    });
  });

  it("matches containing polygons and rejects distant polygons", () => {
    expect(dwdFeatureMatchesLocation(berlinWarning, 52.52, 13.405, 10)).toBe(true);
    expect(dwdFeatureMatchesLocation(munichWarning, 52.52, 13.405, 50)).toBe(false);
  });

  it("requests a bounded WFS window, filters by radius, and deduplicates identifiers", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      type: "FeatureCollection",
      features: [berlinWarning, { ...berlinWarning, id: "duplicate-shape" }, munichWarning],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const events = await fetchDwdWarnings(52.52, 13.405, 25);
    expect(events.map((event) => event.sourceEventId)).toEqual(["dwd-berlin-wind"]);
    const requestedUrl = vi.mocked(fetch).mock.calls[0][0].toString();
    expect(requestedUrl).toContain("typeNames=dwd%3AWarnungen_Gemeinden_vereinigt");
    expect(requestedUrl).toContain("bbox=");
  });
});
