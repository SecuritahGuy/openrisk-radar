import { describe, expect, it } from "vitest";
import { aqiSeverity } from "../openMeteo";

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
