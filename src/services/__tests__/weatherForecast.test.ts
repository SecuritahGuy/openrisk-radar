import { describe, expect, it } from "vitest";
import { compassDirection, forecastDateKey } from "../../lib/forecastFormat";
import {
  normalizeNwsDailyForecast,
  normalizeNwsHourlyForecast,
  type NwsForecastPeriod,
} from "../weather";

function nwsPeriod(
  index: number,
  overrides: Partial<NwsForecastPeriod> = {}
): NwsForecastPeriod {
  const day = String(22 + Math.floor(index / 2)).padStart(2, "0");
  const daytime = index % 2 === 0;
  return {
    name: daytime ? "Day" : "Night",
    isDaytime: daytime,
    temperature: daytime ? 80 + index : 60 + index,
    relativeHumidity: { value: 55 },
    windSpeed: "5 to 15 mph",
    windDirection: "SW",
    probabilityOfPrecipitation: { value: 35 },
    shortForecast: "Partly Cloudy",
    detailedForecast: daytime ? `Detailed forecast ${index}` : "Overnight",
    startTime: `2026-07-${day}T${daytime ? "06" : "18"}:00:00-05:00`,
    ...overrides,
  };
}

describe("forecast normalization", () => {
  it("pairs NWS daytime highs with overnight lows and preserves narrative detail", () => {
    const normalized = normalizeNwsDailyForecast(
      Array.from({ length: 10 }, (_, index) => nwsPeriod(index))
    );

    expect(normalized).toHaveLength(5);
    expect(normalized[0]).toMatchObject({
      temperature: 80,
      temperatureLow: 61,
      windSpeed: 15,
      windDirection: 225,
      detailedForecast: "Detailed forecast 0",
    });
  });

  it("retains five days of NWS hourly periods", () => {
    const periods = Array.from({ length: 140 }, (_, index) =>
      nwsPeriod(index, {
        startTime: new Date(Date.UTC(2026, 6, 22, index)).toISOString(),
      })
    );

    const normalized = normalizeNwsHourlyForecast(periods);
    expect(normalized).toHaveLength(120);
    expect(normalized[normalized.length - 1]?.startTime).toBe(periods[119].startTime);
  });

  it("formats forecast dates and compass directions deterministically", () => {
    expect(forecastDateKey("2026-07-22T12:00:00-05:00")).toBe("2026-07-22");
    expect(compassDirection(0)).toBe("N");
    expect(compassDirection(225)).toBe("SW");
    expect(compassDirection(null)).toBeNull();
  });
});
