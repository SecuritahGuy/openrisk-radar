import { describe, expect, it } from "vitest";
import type { ResolvedLocation } from "../../types/location";
import { alertMatchesLocation, supportsMeteoalarm } from "../meteoalarm";

const leipzig: ResolvedLocation = {
  city: "Leipzig",
  state: "SN",
  postalCode: "04109",
  country: "Germany",
  latitude: 51.34,
  longitude: 12.37,
  county: "Leipzig County",
  stateFips: null,
  countyFips: null,
};

describe("Meteoalarm locality scoping", () => {
  it("matches the warning area to the resolved city or county", () => {
    expect(alertMatchesLocation("Kreis Leipzig", leipzig)).toBe(true);
    expect(alertMatchesLocation("Kreis Waldeck-Frankenberg", leipzig)).toBe(false);
  });

  it("only enables the source in supported countries", () => {
    expect(supportsMeteoalarm(leipzig)).toBe(true);
    expect(supportsMeteoalarm({ ...leipzig, country: "USA" })).toBe(false);
  });
});
