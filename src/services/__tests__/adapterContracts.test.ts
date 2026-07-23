import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchCoopsWaterLevels } from "../coops";
import { fetchEonetEvents } from "../eonet";
import { fetchFemaDeclarations } from "../fema";
import { fetchGdacsEvents } from "../gdacs";
import { fetchNhcStorms } from "../nhc";
import { fetchWildfires } from "../nifc";
import { fetchNwsAlerts } from "../nws";
import { fetchSpcOutlooks } from "../spc";
import { fetchEarthquakes } from "../usgs";
import { fetchRiverConditions } from "../usgsWater";

function jsonResponse(payload: unknown): Response {
  return { ok: true, json: async () => payload } as Response;
}

describe("authoritative adapter contracts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes NWS alert polygons and severity", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        features: [
          {
            id: "https://api.weather.gov/alerts/alert-1",
            properties: {
              id: "alert-1",
              event: "Tornado Warning",
              headline: "Tornado Warning for Lake County",
              description: "Take shelter now.",
              severity: "Extreme",
              urgency: "Immediate",
              certainty: "Observed",
              effective: "2026-07-21T20:00:00Z",
              expires: "2026-07-21T21:00:00Z",
              sent: "2026-07-21T19:58:00Z",
              status: "Actual",
              category: "Met",
              areaDesc: "Lake County",
              polygon: "42.1,-88.1 42.2,-88.1 42.2,-88.0 42.1,-88.1",
              parameter: null,
            },
          },
        ],
      })
    );

    const [event] = await fetchNwsAlerts("IL");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(url.searchParams.get("area")).toBe("IL");
    expect(event).toMatchObject({
      source: "NWS",
      sourceEventId: "alert-1",
      severity: "Extreme",
      geometryType: "Polygon",
      latitude: 42.1,
      longitude: -88.1,
    });
  });

  it("normalizes USGS earthquake magnitude and coordinates", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        features: [
          {
            id: "us-1",
            properties: {
              mag: 5.4,
              place: "10 km W of Testville",
              time: Date.parse("2026-07-21T10:00:00Z"),
              updated: Date.parse("2026-07-21T10:05:00Z"),
              url: "https://earthquake.usgs.gov/earthquakes/eventpage/us-1",
              title: "M 5.4 - Testville",
              type: "earthquake",
              magType: "mww",
            },
            geometry: { type: "Point", coordinates: [-118.2, 34.1, 8] },
          },
        ],
      })
    );

    const [event] = await fetchEarthquakes(34, -118, 100);

    expect(event).toMatchObject({
      source: "USGS",
      sourceEventId: "us-1",
      severity: "Severe",
      latitude: 34.1,
      longitude: -118.2,
    });
  });

  it("keeps FEMA declarations non-spatial and county-scoped", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        DisasterDeclarationsSummaries: [
          {
            femaDeclarationString: "DR-9999-IL",
            disasterNumber: 9999,
            declarationTitle: "SEVERE STORMS",
            declarationType: "DR",
            incidentType: "Severe Storm",
            state: "IL",
            county: "Lake (County)",
            countyCode: "IL-097",
            fipsStateCode: "17",
            fipsCountyCode: "097",
            declarationDate: "2026-07-21T00:00:00Z",
            incidentBeginDate: "2026-07-20T00:00:00Z",
            incidentEndDate: null,
            disasterCloseOutDate: null,
            programType: "Public Assistance",
          },
        ],
      })
    );

    const [event] = await fetchFemaDeclarations("IL", "17097");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(url.searchParams.get("$filter")).toContain("fipsCountyCode eq '097'");
    expect(event).toMatchObject({
      source: "FEMA",
      severity: "Severe",
      geometryType: "None",
      latitude: null,
      longitude: null,
    });
  });

  it("normalizes NIFC wildfire size and containment", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        features: [
          {
            geometry: { type: "Point", coordinates: [-120.5, 38.5] },
            properties: {
              IncidentName: "Contract Fire",
              IncidentTypeCategory: "WF",
              CalculatedAcres: 12000,
              PercentContained: 20,
              FireDiscoveryDateTime: Date.parse("2026-07-20T12:00:00Z"),
              ModifiedOnDateTime: Date.parse("2026-07-21T12:00:00Z"),
              POOCounty: "Test",
              POOState: "US-CA",
              FireCauseGeneral: "Natural",
              FireCause: null,
              TotalIncidentPersonnel: 100,
              ResidencesDestroyed: 0,
              OtherStructuresDestroyed: 0,
              Injuries: 0,
              Fatalities: 0,
              IncidentTypeKind: "FI",
              IrwinID: "irwin-1",
            },
          },
        ],
      })
    );

    const [event] = await fetchWildfires(38.5, -120.5, 100);

    expect(event).toMatchObject({
      source: "NIFC",
      sourceEventId: "irwin-1",
      severity: "Extreme",
      headline: "Contract Fire",
      latitude: 38.5,
      longitude: -120.5,
    });
    expect(event.description).toContain("12,000 acres");
  });

  it("normalizes SPC outlook polygons without treating them as observations", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        features: [
          {
            id: 1,
            type: "Feature",
            properties: {
              objectid: 10,
              dn: 3,
              valid: "202607211200",
              expire: "202607221200",
              issue: "202607211130",
              label: "ENH",
              label2: "Enhanced severe-weather risk",
              idp_source: "spc",
            },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-88.3, 41.9],
                  [-87.8, 41.9],
                  [-87.8, 42.3],
                  [-88.3, 42.3],
                  [-88.3, 41.9],
                ],
              ],
            },
          },
        ],
      })
    );

    const events = await fetchSpcOutlooks(42.1, -88.0, 50);

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      source: "SPC",
      type: "Day 1 Convective Outlook",
      severity: "Severe",
      geometryType: "Polygon",
    });
  });

  it("normalizes an in-range NHC named storm", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("/5/query")) {
        return jsonResponse({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [-80, 25] },
              properties: {
                stormname: "ALPHA",
                stormtype: "HU",
                maxwind: 80,
                mslp: 970,
                advdate: "2026-07-21T12:00:00Z",
                advisnum: "5",
                basin: "AL",
                binnumber: "01",
              },
            },
          ],
        });
      }
      return jsonResponse({ type: "FeatureCollection", features: [] });
    });

    const events = await fetchNhcStorms(25, -80, 50);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "NHC",
      sourceEventId: "nhc-AL-01",
      severity: "Severe",
      headline: "NHC Hurricane ALPHA",
    });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("normalizes a nearby GDACS centroid and ignores other feeds", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      if (!String(input).includes("gdacsEQ.geojson")) {
        return jsonResponse({ type: "FeatureCollection", features: [] });
      }
      return jsonResponse({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "eq-1",
            properties: {
              name: "M6.2 earthquake",
              description: "Strong earthquake",
              link: "https://www.gdacs.org/report.aspx?eventid=1",
              alertlevel: "Orange",
              alertscore: "2",
              eventtype: "EQ",
              eventid: "1",
              episodeid: "1",
              eventname: "Test earthquake",
              fromdate: "2026-07-21T12:00:00Z",
              todate: "2026-07-22T12:00:00Z",
              country: "USA",
              countrylist: "USA",
              iso3: "USA",
              severity: "6.2",
              latitude: "34.1",
              longitude: "-118.1",
              Class: "Point_Centroid",
            },
            geometry: { type: "Point", coordinates: [-118.1, 34.1] },
          },
        ],
      });
    });

    const events = await fetchGdacsEvents(34, -118, 100);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      source: "GDACS",
      sourceEventId: "EQ1",
      category: "Seismic",
      severity: "Severe",
    });
  });

  it("normalizes a nearby EONET wildfire with source attribution", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {
              id: "EONET_1",
              title: "Large wildfire",
              description: "Satellite-observed fire",
              link: "https://eonet.gsfc.nasa.gov/api/v3/events/EONET_1",
              closed: null,
              date: "2026-07-21T12:00:00Z",
              magnitudeValue: 12000,
              magnitudeUnit: "acres",
              categories: [{ id: "wildfires", title: "Wildfires" }],
              sources: [{ id: "NASA", url: "https://example.com" }],
            },
            geometry: { type: "Point", coordinates: [-120.1, 38.1] },
          },
        ],
      })
    );

    const events = await fetchEonetEvents(38, -120, 100);

    expect(events[0]).toMatchObject({
      source: "EONET",
      category: "Wildfire",
      severity: "Severe",
      latitude: 38.1,
      longitude: -120.1,
    });
    expect(events[0].description).toContain("Source: NASA");
  });

  it("normalizes NOAA CO-OPS station water levels", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("stations.json")) {
        return jsonResponse({
          stations: [
            { id: "9087044", name: "Calumet Harbor", lat: 41.73, lng: -87.54 },
          ],
        });
      }
      return jsonResponse({
        metadata: { id: "9087044", name: "Calumet Harbor", lat: "41.73", lon: "-87.54" },
        data: [{
          t: new Date().toISOString().slice(0, 16).replace("T", " "),
          v: "1.25",
          s: "0.05",
          q: "v",
        }],
      });
    });

    const [signal] = await fetchCoopsWaterLevels(41.73, -87.54, 50);

    expect(signal).toMatchObject({
      source: "COOPS",
      sourceEventId: "9087044",
      category: "Coastal Water",
    });
    expect(signal.metrics).toContainEqual({
      label: "Water level",
      value: 1.25,
      unit: "ft MLLW",
    });
  });

  it("normalizes USGS Water discharge and gauge metrics", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("monitoring-locations/items")) {
        return jsonResponse({
          features: [
            {
              type: "Feature",
              geometry: { type: "Point", coordinates: [-88, 42] },
              properties: {
                id: "USGS-05500000",
                monitoring_location_name: "Test River",
                site_type_code: "ST",
                county_name: "Lake",
                state_name: "Illinois",
              },
            },
          ],
        });
      }
      return jsonResponse({
        features: [
          {
            type: "Feature",
            geometry: { type: "Point", coordinates: [-88, 42] },
            properties: {
              monitoring_location_id: "USGS-05500000",
              parameter_code: "00060",
              value: "60000",
              time: new Date().toISOString(),
              unit_of_measure: "ft3/s",
              approval_status: "Approved",
            },
          },
        ],
      });
    });

    const [signal] = await fetchRiverConditions(42, -88, 50, "Grayslake, IL");

    expect(signal).toMatchObject({
      source: "USGS_WATER",
      severity: "Severe",
      headline: "Test River: 60,000 ft³/s",
    });
    expect(signal.metrics).toContainEqual({
      label: "Discharge",
      value: 60000,
      unit: "ft³/s",
    });
  });
});
