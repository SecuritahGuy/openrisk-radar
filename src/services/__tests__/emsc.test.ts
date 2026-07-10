import { describe, expect, it } from "vitest";
import type { EmscFeature, EmscProperties } from "../emsc";

// severities depend on the internal function — import it via the module
import { normalize } from "../emsc";

function makeProps(overrides: Partial<EmscProperties> = {}): EmscProperties {
  return {
    source_id: "12345",
    source_catalog: "EMSC-RTS",
    lastupdate: "2026-07-10T06:17:30",
    time: "2026-07-10T06:17:24",
    flynn_region: "ISLAND OF HAWAII, HAWAII",
    lat: 19.28,
    lon: -155.39,
    depth: 30.3,
    evtype: "ke",
    auth: "EMSC",
    mag: 4.6,
    magtype: "ml",
    unid: "EMSC20260710000001",
    ...overrides,
  };
}

function makeFeature(props: EmscProperties): EmscFeature {
  return {
    type: "Feature",
    id: props.unid,
    geometry: {
      type: "Point",
      coordinates: [props.lon, props.lat, props.depth],
    },
    properties: props,
  };
}

describe("normalize", () => {
  it("produces a valid RiskEvent from an EMSC feature", () => {
    const props = makeProps();
    const feature = makeFeature(props);
    const event = normalize(feature);

    expect(event.source).toBe("EMSC");
    expect(event.sourceEventId).toBe("EMSC20260710000001");
    expect(event.category).toBe("Seismic");
    expect(event.type).toBe("Earthquake");
    expect(event.latitude).toBe(19.28);
    expect(event.longitude).toBe(-155.39);
    expect(event.polygon).toBeNull();
    expect(event.confidence).toBe("Source reported");
    expect(event.url).toMatch(/emsc-csem\.org/);
  });

  it("uses absolute depth value", () => {
    const props = makeProps({ depth: -30.3 });
    const feature = makeFeature(props);
    const event = normalize(feature);
    expect(event.description).toContain("30.3 km");
  });

  it("maps mag < 4 to Minor severity", () => {
    const feature = makeFeature(makeProps({ mag: 3.5 }));
    expect(normalize(feature).severity).toBe("Minor");
  });

  it("maps mag 4–5.4 to Moderate severity", () => {
    const feature4 = makeFeature(makeProps({ mag: 4.0 }));
    expect(normalize(feature4).severity).toBe("Moderate");

    const feature5 = makeFeature(makeProps({ mag: 5.4 }));
    expect(normalize(feature5).severity).toBe("Moderate");
  });

  it("maps mag 5.5–6.9 to Severe severity", () => {
    const feature = makeFeature(makeProps({ mag: 5.5 }));
    expect(normalize(feature).severity).toBe("Severe");
  });

  it("maps mag >= 7 to Extreme severity", () => {
    const feature = makeFeature(makeProps({ mag: 7.0 }));
    expect(normalize(feature).severity).toBe("Extreme");
  });

  it("includes flynn_region in headline", () => {
    const feature = makeFeature(makeProps({ flynn_region: "CRETE, GREECE", mag: 4.2 }));
    expect(normalize(feature).headline).toMatch(/CRETE, GREECE/);
  });

  it("stores magnitude in headline", () => {
    const feature = makeFeature(makeProps({ mag: 5.1 }));
    expect(normalize(feature).headline).toMatch(/M5\.1/);
  });

  it("stores raw feature data", () => {
    const feature = makeFeature(makeProps());
    const event = normalize(feature);
    expect(event.raw).toBeDefined();
    expect((event.raw as Record<string, unknown>).id).toBe("EMSC20260710000001");
  });
});
