import { describe, expect, it } from "vitest";
import type { GvpProperties } from "../gvp";
import { gvpSeverity, normalize } from "../gvp";

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

describe("gvpSeverity", () => {
  it("returns Moderate for volcanoes that erupted in 2000 or later", () => {
    expect(gvpSeverity(makeProps({ Last_Eruption_Year: "2026" }))).toBe("Moderate");
    expect(gvpSeverity(makeProps({ Last_Eruption_Year: "2000" }))).toBe("Moderate");
  });

  it("returns Minor for volcanoes with no known eruption", () => {
    expect(gvpSeverity(makeProps({ Last_Eruption_Year: "None" }))).toBe("Minor");
    expect(gvpSeverity(makeProps({ Last_Eruption_Year: "Unknown" }))).toBe("Minor");
  });

  it("returns Minor for volcanoes with pre-2000 eruptions", () => {
    expect(gvpSeverity(makeProps({ Last_Eruption_Year: "1999" }))).toBe("Minor");
    expect(gvpSeverity(makeProps({ Last_Eruption_Year: "1800" }))).toBe("Minor");
  });

  it("returns Minor for empty eruption year", () => {
    expect(gvpSeverity(makeProps({ Last_Eruption_Year: "" }))).toBe("Minor");
  });
});

describe("normalize", () => {
  it("produces a valid SupplementalRiskSignal from GVP properties", () => {
    const props = makeProps();
    const signal = normalize(props);

    expect(signal.source).toBe("GVP");
    expect(signal.sourceEventId).toBe("gvp-332010");
    expect(signal.category).toBe("Volcano");
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
