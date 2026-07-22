import { describe, expect, it } from "vitest";
import {
  normalizeCalFire,
  normalizeFloridaWildfire,
  normalizeNyHab,
  normalizeOregonEvacuation,
  normalizeWisconsinBeach,
  supportsRegionalSources,
} from "../regionalSources";

describe("regional source normalization", () => {
  it("normalizes a CAL FIRE incident with state provider attribution", () => {
    const event = normalizeCalFire({
      Name: "Canyon Fire",
      UniqueId: "ca-1",
      Type: "Wildfire",
      County: "Butte",
      AcresBurned: 12_500,
      PercentContained: 20,
      Latitude: 39.7,
      Longitude: -121.6,
      Started: "2026-07-20T10:00:00Z",
      Updated: "2026-07-21T10:00:00Z",
      AdminUnit: "CAL FIRE Butte Unit",
    });

    expect(event).toMatchObject({
      source: "REGIONAL",
      sourceEventId: "ca-1",
      category: "Wildfire",
      severity: "Extreme",
      provider: { id: "ca-cal-fire", label: "CAL FIRE", authority: "state" },
    });
  });

  it("drops contained Florida wildfire records", () => {
    const event = normalizeFloridaWildfire({
      geometry: { type: "Point", coordinates: [-81.5, 28.4] },
      properties: {
        Name: "Pine Fire",
        Status: "Contained",
        Contained: 100,
        Size: 200,
      },
    });

    expect(event).toBeNull();
  });

  it("maps Oregon evacuation levels and polygons", () => {
    const event = normalizeOregonEvacuation({
      geometry: {
        type: "Polygon",
        coordinates: [[[-123.2, 44.9], [-123.0, 44.9], [-123.0, 45.1], [-123.2, 44.9]]],
      },
      properties: {
        GlobalID: "or-1",
        Fire_Name: "Ridge Fire",
        Fire_Evacuation_Level: 3,
        County: "Marion",
        PopulationWithin: 250,
        StructuresWithin: 80,
        created_date: 1784560000000,
        last_edited_date: 1784563600000,
      },
    });

    expect(event).toMatchObject({
      sourceEventId: "or-1",
      category: "Disaster",
      severity: "Extreme",
      geometryType: "Polygon",
      provider: { id: "or-oem-evacuations" },
    });
    expect(event?.headline).toContain("GO evacuation");
  });

  it("normalizes a confirmed New York HAB report", () => {
    const event = normalizeNyHab({
      geometry: { type: "Point", coordinates: [-76.5, 42.7] },
      properties: {
        globalid: "ny-1",
        water_name: "Cayuga Lake",
        HAB_STATUS: "Confirmed",
        county: "Cayuga",
        extent_bloom: "Large Localized",
        date_time: 1783457040000,
      },
    });

    expect(event).toMatchObject({
      sourceEventId: "ny-1",
      category: "Coastal Water",
      severity: "Moderate",
      provider: { id: "ny-dec-habs" },
    });
  });

  it("normalizes only non-open Wisconsin beach records", () => {
    const advisory = normalizeWisconsinBeach({
      geometry: { type: "Point", coordinates: [-87.9, 43.1] },
      properties: {
        BEACH_SEQ_NO: 42,
        OGW_BEACH_NAME_TEXT: "Lake Beach",
        MAP_STATUS: "Advisory",
        SAMPLEDATE: 1784559600000,
        ECOLIVALUE: "410 MPN/100ml",
      },
    });
    const open = normalizeWisconsinBeach({
      geometry: { type: "Point", coordinates: [-87.9, 43.1] },
      properties: { OGW_BEACH_NAME_TEXT: "Lake Beach", MAP_STATUS: "Open" },
    });

    expect(advisory).toMatchObject({
      category: "Coastal Water",
      severity: "Moderate",
      provider: { id: "wi-dnr-beaches" },
    });
    expect(open).toBeNull();
  });

  it("activates only explicitly production-ready states", () => {
    expect(supportsRegionalSources("CA")).toBe(true);
    expect(supportsRegionalSources("WI")).toBe(true);
    expect(supportsRegionalSources("WA")).toBe(false);
    expect(supportsRegionalSources("GB")).toBe(false);
  });
});
