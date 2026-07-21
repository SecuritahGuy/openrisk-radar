import { afterEach, describe, expect, it, vi } from "vitest";
import { geocode } from "../nominatim";

const grayslakeResult = {
  lat: "42.3443070",
  lon: "-88.0335501",
  display_name: "60030, Grayslake, Lake County, Illinois, United States",
  address: {
    postcode: "60030",
    town: "Grayslake",
    county: "Lake County",
    state: "Illinois",
    country: "United States",
    country_code: "us",
  },
};

describe("geocode", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("restricts five-digit ZIP fallbacks to U.S. postal codes", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [grayslakeResult],
    } as Response);

    const result = await geocode("60030");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(url.searchParams.get("postalcode")).toBe("60030");
    expect(url.searchParams.get("countrycodes")).toBe("us");
    expect(url.searchParams.has("q")).toBe(false);
    expect(result).toMatchObject({
      city: "Grayslake",
      state: "IL",
      postalCode: "60030",
      country: "USA",
    });
  });

  it("keeps non-ZIP place searches global", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await geocode("Paris, France");
    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(url.searchParams.get("q")).toBe("Paris, France");
    expect(url.searchParams.has("postalcode")).toBe(false);
    expect(url.searchParams.has("countrycodes")).toBe(false);
  });
});
