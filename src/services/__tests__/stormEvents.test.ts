import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStormEvents } from "../stormEvents";

describe("fetchStormEvents", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches county-level NOAA Storm Events CSV and maps notable records", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      text: async () =>
        [
          "EVENT_ID,CZ_NAME_STR,BEGIN_LOCATION,BEGIN_DATE,BEGIN_TIME,EVENT_TYPE,MAGNITUDE,TOR_F_SCALE,DEATHS_DIRECT,INJURIES_DIRECT,DAMAGE_PROPERTY_NUM,DAMAGE_CROPS_NUM,STATE_ABBR,CZ_TIMEZONE,MAGNITUDE_TYPE,EPISODE_ID,CZ_TYPE,CZ_FIPS,WFO,INJURIES_INDIRECT,DEATHS_INDIRECT,SOURCE,FLOOD_CAUSE,TOR_LENGTH,TOR_WIDTH,BEGIN_RANGE,BEGIN_AZIMUTH,END_RANGE,END_AZIMUTH,END_LOCATION,END_DATE,END_TIME,BEGIN_LAT,BEGIN_LON,END_LAT,END_LON,EVENT_NARRATIVE,EPISODE_NARRATIVE,ABSOLUTE_ROWNUMBER",
          '1304426,KANE (ZONE),AURORA,12/29/2025,0205,High Wind,50.00,,0,0,500000,0,IL,CST-6,MG,208514,Z,89,LOT,0,0,ASOS,,,,,,,,,12/29/2025,0205,41.76,-88.32,41.76,-88.32,"Wind damage with commas, still parsed.","Episode narrative",1',
          "1304425,KANE (ZONE),BATAVIA,05/15/2024,1530,Hail,1.00,,0,0,0,0,IL,CST-6,EG,208000,C,89,LOT,0,0,Public,,,,,,,,,05/15/2024,1530,41.85,-88.31,41.85,-88.31,,Episode narrative,2",
        ].join("\n"),
    } as Response);

    const events = await fetchStormEvents(
      "IL",
      "17",
      "Kane County",
      "089",
      { now: new Date("2026-07-13T00:00:00Z"), lookbackYears: 10 }
    );

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("statefips=17%2CILLINOIS"),
      expect.any(Object)
    );
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("county=KANE%3A89"),
      expect.any(Object)
    );
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({
      source: "NOAA",
      sourceEventId: "1304426",
      type: "High Wind",
      category: "Weather",
      severity: "Moderate",
      headline: "High Wind - AURORA",
      latitude: 41.76,
      longitude: -88.32,
    });
    expect(events[0].description).toBe("Wind damage with commas, still parsed.");
  });

  it("returns no rows when state or county metadata is missing", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await expect(fetchStormEvents("IL", "17", null, "089")).resolves.toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
