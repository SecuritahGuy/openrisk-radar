import { describe, expect, it } from "vitest";
import { aqiSeverity } from "../openMeteo";
import { parseWindMph } from "../weather";

describe("aqiSeverity", () => {
  it("maps AQI bands to OpenRisk severity levels", () => {
    expect(aqiSeverity(null, 50)).toBe("Minor");
    expect(aqiSeverity(null, 101)).toBe("Moderate");
    expect(aqiSeverity(null, 201)).toBe("Severe");
    expect(aqiSeverity(null, 301)).toBe("Extreme");
  });

  it("prefers US AQI over European AQI when both are present", () => {
    expect(aqiSeverity(320, 80)).toBe("Minor");
    expect(aqiSeverity(80, 320)).toBe("Extreme");
  });
});

describe("weather normalization", () => {
  it("uses the strongest value in an NWS wind range", () => {
    expect(parseWindMph("5 to 15 mph")).toBe(15);
    expect(parseWindMph("Around 8 mph")).toBe(8);
  });
});
