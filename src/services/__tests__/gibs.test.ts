import { describe, expect, it } from "vitest";
import {
  GIBS_LAYERS,
  gibsDateOptions,
  gibsTileTemplate,
  gibsTileUrl,
  latestGibsDate,
  readGibsPreferences,
  writeGibsPreferences,
} from "../gibs";

describe("NASA GIBS map layers", () => {
  it("uses Web Mercator Google Maps matrix sets", () => {
    expect(GIBS_LAYERS.MODIS_Terra_CorrectedReflectance_TrueColor.tileMatrixSet)
      .toBe("GoogleMapsCompatible_Level9");
    expect(Object.values(GIBS_LAYERS).every((layer) => layer.maxNativeZoom > 0)).toBe(true);
  });

  it("builds WMTS templates in z, row, column order", () => {
    expect(gibsTileTemplate("Snow_Cover", "2026-07-21"))
      .toContain("/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png");
    expect(gibsTileUrl({
      layer: "Snow_Cover",
      date: new Date("2026-07-21T12:00:00Z"),
      zoom: 5,
      x: 9,
      y: 12,
    })).toContain("/5/12/9.png");
  });

  it("defaults to yesterday and offers a bounded recent date list", () => {
    const now = new Date("2026-07-22T12:00:00Z");
    expect(latestGibsDate(now)).toBe("2026-07-21");
    expect(gibsDateOptions(now, 3)).toEqual(["2026-07-21", "2026-07-20", "2026-07-19"]);
  });

  it("requires the WMS renderer for thermal anomaly vectors", () => {
    expect(() => gibsTileTemplate("VIIRS_SNPP_Thermal_Anomalies_375m", "2026-07-21"))
      .toThrow("uses the GIBS WMS renderer");
  });

  it("persists valid imagery preferences and expires dates outside the selector window", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => void values.set(key, value),
    };
    writeGibsPreferences(storage, {
      layer: "Snow_Cover",
      date: "2026-07-20",
      opacity: 0.55,
    });
    expect(readGibsPreferences(storage, new Date("2026-07-22T12:00:00Z"))).toEqual({
      layer: "Snow_Cover",
      date: "2026-07-20",
      opacity: 0.55,
    });
    expect(readGibsPreferences(storage, new Date("2026-08-22T12:00:00Z"))).toMatchObject({
      layer: "Snow_Cover",
      date: "2026-08-21",
    });
  });
});
