import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSpcStormReports } from "../spcReports";

function csvResponse(text: string): Response {
  return { ok: true, text: async () => text } as Response;
}

describe("SPC observed storm reports", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes nearby tornado, hail, and wind CSV rows", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("today_torn.csv")) {
        return csvResponse(
          "Time,F_Scale,Location,County,State,Lat,Lon,Comments\n" +
            "1810,EF3,1 W Testville,Lake,IL,42.10,-88.05,Observed tornado"
        );
      }
      if (url.includes("today_hail.csv")) {
        return csvResponse(
          "Time,Size,Location,County,State,Lat,Lon,Comments\n" +
            "1830,250,Testville,Lake,IL,42.11,-88.06,Large hail"
        );
      }
      return csvResponse(
        "Time,Speed,Location,County,State,Lat,Lon,Comments\n" +
          "1845,80,Testville,Lake,IL,42.12,-88.07,Measured gust"
      );
    });

    const events = await fetchSpcStormReports(42.1, -88.05, 25, {
      now: new Date("2026-07-21T20:00:00Z"),
    });

    expect(events.map((event) => event.type)).toEqual([
      "Wind Report",
      "Hail Report",
      "Tornado Report",
    ]);
    expect(events.find((event) => event.type === "Tornado Report")).toMatchObject({
      severity: "Extreme",
      startedAt: "2026-07-21T18:10:00.000Z",
      geometryType: "Point",
    });
    expect(events.find((event) => event.type === "Hail Report")?.description)
      .toContain("2.50 in hail");
  });

  it("filters distant reports and rolls post-midnight report times back a day", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (String(input).includes("today_wind.csv")) {
        return csvResponse(
          "Time,Speed,Location,County,State,Lat,Lon,Comments\n" +
            "2355,UNK,Nearby,Lake,IL,42.10,-88.05,Tree down\n" +
            "0010,UNK,Distant,Other,CA,34.00,-118.00,Tree down\n" +
            "0015,UNK,Missing coordinates,Lake,IL,,-88.05,Tree down"
        );
      }
      const scale = String(input).includes("today_torn.csv") ? "F_Scale" : "Size";
      return csvResponse(`Time,${scale},Location,County,State,Lat,Lon,Comments\n`);
    });

    const events = await fetchSpcStormReports(42.1, -88.05, 25, {
      now: new Date("2026-07-22T00:30:00Z"),
    });

    expect(events).toHaveLength(1);
    expect(events[0].startedAt).toBe("2026-07-21T23:55:00.000Z");
  });
});
