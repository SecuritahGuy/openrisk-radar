import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchTsunamiEvents } from "../tsunami";
import { fetchUkFloods } from "../ukFlood";
import { fetchShakeMap } from "../shakemap";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("NOAA tsunami feed", () => {
  it("parses the provider wrapper and keeps only recent active bulletins", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => `({"items":[{
        "TWCID":"PAAQ","eventMagnitude":7.2,"eventMagnitudeType":"Mwp",
        "eventDepth":10,"eventLat":55,"eventLon":-150,
        "originTime":"2026-07-14T09:00:00Z","bulletinIssueTime":"2026-07-14T10:00:00Z",
        "quakeLocation":"Test region","twcEventID":"test","bulletinNr":"2",
        "segments":[{"id":1,"category":"Warning","headline":"Tsunami warning",
        "recommendedActions":"Move inland.","productDefinition":""}],"observations":[]}, ]})`,
    } as Response);

    const signals = await fetchTsunamiEvents();
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      source: "NOAA_TSUNAMI",
      severity: "Extreme",
      updatedAt: "2026-07-14T10:00:00Z",
    });
  });

  it("drops cancellations and stale bulletins", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => `({"items":[{"TWCID":"PAAQ","eventMagnitude":7,
        "eventMagnitudeType":"M","eventDepth":10,"eventLat":55,"eventLon":-150,
        "originTime":"2025-01-01T00:00:00Z","bulletinIssueTime":"2025-01-01T01:00:00Z",
        "quakeLocation":"Test","twcEventID":"old","bulletinNr":"3",
        "segments":[{"id":1,"category":"Cancellation","headline":"Cancelled",
        "recommendedActions":"","productDefinition":""}],"observations":[]} ]})`,
    } as Response);
    expect(await fetchTsunamiEvents()).toEqual([]);
  });

  it("repairs NOAA's trailing-decimal coordinates without changing strings", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-14T12:00:00Z"));
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () => `({"items":[{"TWCID":"PAAQ","eventMagnitude":7,
        "eventMagnitudeType":"M","eventDepth":10,"eventLat":44.,"eventLon":-93.,
        "originTime":"2026-07-14T09:00:00Z","bulletinIssueTime":"2026-07-14T10:00:00Z",
        "quakeLocation":"Text ending in 93., stays intact","twcEventID":"test","bulletinNr":"1",
        "segments":[{"id":1,"category":"Watch","headline":"Tsunami watch",
        "recommendedActions":"Monitor updates.","productDefinition":""}],"observations":[]}]})`,
    } as Response);

    const signals = await fetchTsunamiEvents();
    expect(signals).toHaveLength(1);
    expect(signals[0].geometry).toEqual({ type: "Point", latitude: 44, longitude: -93 });
    expect((signals[0].raw.quakeLocation)).toBe("Text ending in 93., stays intact");
  });
});

describe("UK Environment Agency flood feed", () => {
  it("uses the official severity order and ignores inactive warnings", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ items: [
        { description: "Severe warning", eaAreaName: "Test area",
          floodArea: { notation: "A1", polygon: "POLYGON ((-1 52, -1 53, 0 53, -1 52))" },
          severity: "Severe Flood Warning", severityLevel: 1, message: "Act now",
          timeRaised: "2026-07-14T08:00:00Z", timeSeverityChanged: "2026-07-14T09:00:00Z" },
        { description: "Ended", eaAreaName: "Old area", floodArea: { notation: "A2", polygon: "" },
          severity: "Warning no longer in force", severityLevel: 4, message: "",
          timeRaised: "2026-07-13T08:00:00Z" },
      ] }),
    } as Response);

    const signals = await fetchUkFloods(52, -1, 50);
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({ source: "UK_EA", severity: "Extreme", updatedAt: "2026-07-14T09:00:00Z" });
    expect(signals[0].geometry.type).toBe("Polygon");
    if (signals[0].geometry.type === "Polygon") {
      expect(signals[0].geometry.polygon[0]).toEqual([-1, 52]);
    }
  });
});

describe("USGS ShakeMap enrichment", () => {
  it("labels event-wide intensity as contextual USGS enrichment", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ id: "test", geometry: { type: "Point", coordinates: [-120, 35, 8] },
        properties: { mag: 5.5, place: "Test region", time: 1784030400000,
          url: "https://earthquake.usgs.gov/test", title: "Test",
          products: { shakemap: [{ preferredWeight: 10, properties: { maxmmi: "6.2", maxpga: "12" }, contents: {} }] } } }),
    } as Response);
    const signal = await fetchShakeMap("test");
    expect(signal).toMatchObject({ source: "USGS_SHAKEMAP", severity: "Severe" });
    expect(signal?.headline).toContain("event maximum");
    expect(signal?.description).toContain("not the intensity at the searched location");
  });
});
