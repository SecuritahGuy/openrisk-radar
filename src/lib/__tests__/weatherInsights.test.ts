import { describe, expect, it } from "vitest";
import type { HourlyWeatherPeriod } from "../../services/weather";
import { buildWeatherInsights } from "../weatherInsights";

function hour(overrides: Partial<HourlyWeatherPeriod>): HourlyWeatherPeriod {
  return {
    startTime: "2026-07-14T12:00:00Z",
    temperature: 80,
    humidity: 50,
    precipitationChance: 10,
    precipitationAmount: 0,
    windSpeed: 8,
    windGust: 12,
    shortForecast: "Clear",
    ...overrides,
  };
}

describe("weatherInsights", () => {
  it("summarizes precipitation, gust, and temperature changes", () => {
    const insights = buildWeatherInsights([
      hour({ temperature: 82 }),
      hour({ startTime: "2026-07-14T15:00:00Z", temperature: 76, precipitationChance: 50 }),
      hour({ startTime: "2026-07-14T18:00:00Z", temperature: 64, precipitationChance: 80, windGust: 32 }),
    ]);

    expect(insights.join(" ")).toContain("peak chance 80%");
    expect(insights.join(" ")).toContain("Strongest gusts: 32 mph");
    expect(insights.join(" ")).toContain("18°");
  });
});
