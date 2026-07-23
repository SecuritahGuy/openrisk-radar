import { afterEach, describe, expect, it, vi } from "vitest";
import { aqiSeverity, fetchOpenMeteoWeather } from "../openMeteo";
import { parseWindMph } from "../weather";

afterEach(() => vi.restoreAllMocks());

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

  it("requests and normalizes richer five-day forecast details", async () => {
    const hourlyTimes = Array.from({ length: 120 }, (_, index) =>
      new Date(Date.UTC(2026, 6, 22, index)).toISOString()
    );
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      latitude: 41.68,
      longitude: -88.35,
      current_units: {},
      current: {
        time: "2026-07-22T12:00",
        temperature_2m: 25,
        relative_humidity_2m: 50,
        apparent_temperature: 27,
        weather_code: 1,
        wind_speed_10m: 16,
        wind_direction_10m: 225,
        wind_gusts_10m: 32,
        precipitation: 0,
        cloud_cover: 20,
        pressure_msl: 1012,
      },
      daily: {
        time: ["2026-07-22", "2026-07-23", "2026-07-24", "2026-07-25", "2026-07-26"],
        temperature_2m_max: [30, 31, 32, 33, 34],
        temperature_2m_min: [20, 21, 22, 23, 24],
        apparent_temperature_max: [32, 33, 34, 35, 36],
        apparent_temperature_min: [19, 20, 21, 22, 23],
        weather_code: [1, 2, 3, 61, 0],
        wind_speed_10m_max: [16, 17, 18, 19, 20],
        wind_direction_10m_dominant: [225, 225, 225, 225, 225],
        wind_gusts_10m_max: [32, 33, 34, 35, 36],
        precipitation_probability_max: [40, 30, 20, 60, 10],
        precipitation_sum: [12.7, 0, 0, 25.4, 0],
        snowfall_sum: [0, 0, 2.54, 0, 0],
        sunrise: Array(5).fill("2026-07-22T05:30"),
        sunset: Array(5).fill("2026-07-22T20:20"),
        uv_index_max: [7.5, 8, 6, 4, 7],
      },
      hourly: {
        time: hourlyTimes,
        temperature_2m: Array(120).fill(25),
        relative_humidity_2m: Array(120).fill(50),
        precipitation_probability: Array(120).fill(40),
        precipitation: Array(120).fill(1),
        weather_code: Array(120).fill(1),
        wind_speed_10m: Array(120).fill(16),
        wind_gusts_10m: Array(120).fill(32),
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const weather = await fetchOpenMeteoWeather(41.68, -88.35);
    expect(weather.forecast[0]).toMatchObject({
      apparentTemperature: 90,
      precipitationAmount: 0.5,
      snowfallAmount: 0,
      uvIndex: 7.5,
    });
    expect(weather.hourlyForecast).toHaveLength(120);
    const requestedUrl = vi.mocked(fetch).mock.calls[0][0].toString();
    expect(requestedUrl).toContain("forecast_hours=120");
    expect(requestedUrl).toContain("uv_index_max");
  });
});
