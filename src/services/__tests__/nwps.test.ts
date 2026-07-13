import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchNwpsRiverForecasts } from "../nwps";

describe("fetchNwpsRiverForecasts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns elevated NWPS flood forecast signals", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          gauges: [
            {
              lid: "TEST1",
              name: "Test River at Town",
              latitude: 30.5,
              longitude: -90.5,
              pedts: { observed: "HGIRG", forecast: "HGIFF" },
              rfc: { abbreviation: "LMRFC", name: "Lower Mississippi River Forecast Center" },
              wfo: { abbreviation: "LIX", name: "Slidell" },
              state: { abbreviation: "LA", name: "Louisiana" },
              status: {
                observed: {
                  primary: 15.2,
                  primaryUnit: "ft",
                  secondary: 4.1,
                  secondaryUnit: "kcfs",
                  floodCategory: "action",
                  validTime: "2026-07-13T18:00:00Z",
                },
                forecast: {
                  primary: 19.4,
                  primaryUnit: "ft",
                  secondary: 9.5,
                  secondaryUnit: "kcfs",
                  floodCategory: "minor",
                  validTime: "2026-07-14T06:00:00Z",
                },
              },
            },
            {
              lid: "NORMAL",
              name: "Normal River",
              latitude: 30.6,
              longitude: -90.6,
              pedts: { observed: "HGIRG", forecast: "HGIFF" },
              status: {
                forecast: {
                  primary: 3,
                  primaryUnit: "ft",
                  secondary: 1,
                  secondaryUnit: "kcfs",
                  floodCategory: "no_flooding",
                  validTime: "2026-07-14T06:00:00Z",
                },
              },
            },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          forecast: {
            issuedTime: "2026-07-13T12:00:00Z",
            primaryName: "Stage",
            primaryUnits: "ft",
            secondaryName: "Flow",
            secondaryUnits: "kcfs",
            data: [
              { validTime: "2026-07-14T00:00:00Z", primary: 18.5, secondary: 8.5 },
              { validTime: "2026-07-14T06:00:00Z", primary: 20.1, secondary: 10.2 },
            ],
          },
        }),
      } as Response);

    const signals = await fetchNwpsRiverForecasts(30.5, -90.5, 50, "Baton Rouge, LA");

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("bbox.xmin="),
      expect.objectContaining({ headers: { Accept: "application/json" } })
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://api.water.noaa.gov/nwps/v1/gauges/TEST1/stageflow",
      expect.any(Object)
    );
    expect(signals).toHaveLength(1);
    expect(signals[0]).toMatchObject({
      source: "NWPS",
      category: "River Gauge",
      type: "River Forecast",
      severity: "Moderate",
      headline: "Test River at Town: Minor flooding forecast",
    });
    expect(signals[0].metrics.map((metric) => metric.label)).toContain("Peak Forecast");
  });

  it("returns no signals when forecasts are below action stage", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        gauges: [
          {
            lid: "NORMAL",
            name: "Normal River",
            latitude: 30.6,
            longitude: -90.6,
            pedts: { observed: "HGIRG", forecast: "HGIFF" },
            status: {
              forecast: {
                primary: 3,
                primaryUnit: "ft",
                secondary: 1,
                secondaryUnit: "kcfs",
                floodCategory: "no_flooding",
                validTime: "2026-07-14T06:00:00Z",
              },
            },
          },
        ],
      }),
    } as Response);

    await expect(fetchNwpsRiverForecasts(30.5, -90.5, 50)).resolves.toEqual([]);
  });
});
