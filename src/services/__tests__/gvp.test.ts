import { afterEach, describe, expect, it, vi } from "vitest";
import type { GvpProperties } from "../gvp";
import { fetchVolcanoesNearby, normalize } from "../gvp";
import { supplementalSignalContributesToCurrentRisk } from "../../lib/supplementalContext";

afterEach(() => {
  vi.restoreAllMocks();
});

function makeProps(overrides: Partial<GvpProperties> = {}): GvpProperties {
  return {
    Volcano_Number: "332010",
    Volcano_Name: "Kilauea",
    Primary_Volcano_Type: "Shield",
    Volcanic_Landform: "Shield volcano",
    Last_Eruption_Year: "2026",
    Country: "United States",
    Region: "Hawaii and Pacific Ocean",
    Subregion: "Hawaiian Islands",
    Latitude: "19.421",
    Longitude: "-155.287",
    Elevation: "1247",
    Tectonic_Setting: "Intraplate / Hotspot",
    Geologic_Epoch: "Holocene",
    Evidence_Category: "Eruption Dated",
    Major_Rock_Type: "Basalt / Picro-Basalt",
    ...overrides,
  };
}

describe("normalize", () => {
  it("produces stable historical baseline context rather than an active signal", () => {
    const props = makeProps();
    const signal = normalize(props);

    expect(signal.id).toBe("gvp-332010");
    expect(signal.source).toBe("GVP");
    expect(signal.sourceEventId).toBe("gvp-332010");
    expect(signal.context).toBe("baseline");
    expect(signal.category).toBe("Volcano");
    expect(signal.severity).toBe("Minor");
    expect(signal.description).toContain("not a current activity alert");
    expect(supplementalSignalContributesToCurrentRisk(signal)).toBe(false);
    expect(signal.confidence).toBe("Source reported");
    expect(signal.url).toContain("volcano.si.edu");
  });

  it("extracts coordinates from Latitude/Longitude properties", () => {
    const signal = normalize(makeProps({ Latitude: "19.421", Longitude: "-155.287" }));
    expect(signal.geometry).toEqual({
      type: "Point",
      latitude: 19.421,
      longitude: -155.287,
    });
  });

  it("includes volcano name and country in headline", () => {
    const signal = normalize(makeProps({ Volcano_Name: "Mount Fuji", Country: "Japan" }));
    expect(signal.headline).toContain("Mount Fuji");
    expect(signal.headline).toContain("Japan");
  });

  it("constructs description from volcano attributes", () => {
    const props = makeProps({
      Volcano_Name: "Mount Rainier",
      Primary_Volcano_Type: "Stratovolcano",
      Region: "Cascade Volcanic Arc",
      Country: "United States",
      Elevation: "4321",
    });
    const signal = normalize(props);
    expect(signal.description).toContain("Mount Rainier");
    expect(signal.description).toContain("Stratovolcano");
    expect(signal.description).toContain("Cascade Volcanic Arc");
    expect(signal.description).toContain("4321 m");
  });

  it("includes metrics for type, elevation, last eruption, evidence, tectonic setting, rock type", () => {
    const signal = normalize(makeProps());
    const labels = signal.metrics.map((m) => m.label);
    expect(labels).toContain("Type");
    expect(labels).toContain("Elevation");
    expect(labels).toContain("Last Eruption");
    expect(labels).toContain("Evidence");
    expect(labels).toContain("Tectonic Setting");
    expect(labels).toContain("Rock Type");
  });

  it("stores raw properties", () => {
    const props = makeProps();
    const signal = normalize(props);
    expect(signal.raw).toBeDefined();
    expect((signal.raw as Record<string, unknown>).Volcano_Name).toBe("Kilauea");
  });
});

describe("fetchVolcanoesNearby", () => {
  it("keeps only in-radius records and sorts nearest first", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      type: "FeatureCollection",
      numberReturned: 3,
      numberMatched: 3,
      features: [
        {
          type: "Feature",
          id: "far",
          geometry: { type: "Point", coordinates: [-156.5, 20.5] },
          properties: makeProps({
            Volcano_Number: "3",
            Volcano_Name: "Far Volcano",
            Latitude: "20.5",
            Longitude: "-156.5",
          }),
        },
        {
          type: "Feature",
          id: "nearer",
          geometry: { type: "Point", coordinates: [-155.3, 19.43] },
          properties: makeProps({
            Volcano_Number: "1",
            Volcano_Name: "Nearer Volcano",
            Latitude: "19.43",
            Longitude: "-155.3",
          }),
        },
        {
          type: "Feature",
          id: "near",
          geometry: { type: "Point", coordinates: [-155.5, 19.6] },
          properties: makeProps({
            Volcano_Number: "2",
            Volcano_Name: "Near Volcano",
            Latitude: "19.6",
            Longitude: "-155.5",
          }),
        },
      ],
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));

    const signals = await fetchVolcanoesNearby(19.421, -155.287, 50);

    expect(signals.map((signal) => signal.sourceEventId)).toEqual([
      "gvp-1",
      "gvp-2",
    ]);
    const requestUrl = new URL(
      String(vi.mocked(fetch).mock.calls[0][0]),
      "https://example.test"
    );
    const bbox = requestUrl.searchParams.get("bbox")?.split(",").map(Number) ?? [];
    expect(bbox).toHaveLength(4);
    expect(bbox[0]).toBeLessThan(19.421);
    expect(bbox[1]).toBeLessThan(-155.287);
    expect(bbox[2]).toBeGreaterThan(19.421);
    expect(bbox[3]).toBeGreaterThan(-155.287);
  });
});
