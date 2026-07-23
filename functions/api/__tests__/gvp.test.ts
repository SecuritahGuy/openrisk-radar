import { describe, expect, it } from "vitest";
import { buildGvpUpstreamUrl } from "../smithsonian/gvp";

describe("Smithsonian GVP proxy", () => {
  it("builds a fixed WFS query with latitude/longitude axis order", () => {
    const upstream = buildGvpUpstreamUrl(
      "https://example.test/api/smithsonian/gvp?bbox=19,-155.8,20,-154.8"
    );

    expect(upstream?.hostname).toBe("webservices.volcano.si.edu");
    expect(upstream?.searchParams.get("typeNames")).toBe(
      "GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes"
    );
    expect(upstream?.searchParams.get("bbox")).toBe("19,-155.8,20,-154.8");
  });

  it("rejects malformed, inverted, oversized, and out-of-range bounds", () => {
    const route = "https://example.test/api/smithsonian/gvp?bbox=";
    expect(buildGvpUpstreamUrl(`${route}bad`)).toBeNull();
    expect(buildGvpUpstreamUrl(`${route}20,-155,19,-154`)).toBeNull();
    expect(buildGvpUpstreamUrl(`${route}0,0,20,20`)).toBeNull();
    expect(buildGvpUpstreamUrl(`${route}-91,-155,20,-154`)).toBeNull();
  });
});
