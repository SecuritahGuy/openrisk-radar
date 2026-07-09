import { newEventId } from "../lib/ids";
import type { CurrentWeather } from "./weather";
import type { Severity } from "../types/riskEvent";
import type { SupplementalRiskSignal, SupplementalMetric } from "../types/supplementalRisk";

const WEATHER_BASE = "https://api.open-meteo.com/v1";
const AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com/v1";
const MARINE_BASE = "https://marine-api.open-meteo.com/v1";

interface OpenMeteoCurrent {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  precipitation: number;
  cloud_cover: number;
  pressure_msl: number;
}

interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  current_units: Record<string, string>;
  current: OpenMeteoCurrent;
}

interface OpenMeteoAirQualityCurrent {
  time: string;
  european_aqi: number | null;
  us_aqi: number | null;
  pm2_5: number | null;
  pm10: number | null;
  ozone: number | null;
  nitrogen_dioxide: number | null;
  sulphur_dioxide: number | null;
  carbon_monoxide: number | null;
  dust: number | null;
  ammonia: number | null;
}

interface OpenMeteoAirQualityResponse {
  latitude: number;
  longitude: number;
  current_units: Record<string, string>;
  current: OpenMeteoAirQualityCurrent;
}

interface OpenMeteoMarineCurrent {
  time: string;
  wave_height: number | null;
  wave_direction: number | null;
  wave_period: number | null;
  swell_wave_height: number | null;
  swell_wave_direction: number | null;
  swell_wave_period: number | null;
  ocean_current_velocity: number | null;
  ocean_current_direction: number | null;
}

interface OpenMeteoMarineResponse {
  latitude: number;
  longitude: number;
  current_units: Record<string, string>;
  current: OpenMeteoMarineCurrent;
}

export function openMeteoWeatherLabel(code: number): string {
  const labels: Record<number, string> = {
    0: "Clear", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Depositing rime fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    56: "Light freezing drizzle", 57: "Dense freezing drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    66: "Light freezing rain", 67: "Heavy freezing rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Slight rain showers", 81: "Moderate rain showers", 82: "Violent rain showers",
    85: "Slight snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with slight hail", 99: "Thunderstorm with heavy hail",
  };
  return labels[code] ?? "Unknown";
}

function aqiSeverity(europeanAqi: number | null, usAqi: number | null): Severity {
  const aqi = usAqi ?? europeanAqi ?? 0;
  if (aqi >= 301) return "Extreme";
  if (aqi >= 201) return "Severe";
  if (aqi >= 101) return "Moderate";
  return "Minor";
}

export async function fetchOpenMeteoWeather(
  lat: number,
  lng: number
): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: [
      "temperature_2m",
      "relative_humidity_2m",
      "apparent_temperature",
      "weather_code",
      "wind_speed_10m",
      "wind_direction_10m",
      "precipitation",
      "cloud_cover",
      "pressure_msl",
    ].join(","),
    timezone: "auto",
  });

  const url = `${WEATHER_BASE}/forecast?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo weather API returned ${res.status}`);

  const json: OpenMeteoForecastResponse = await res.json();
  const c = json.current;

  return {
    temperature: Math.round(c.temperature_2m * 9 / 5 + 32),
    feelsLike: Math.round(c.apparent_temperature * 9 / 5 + 32),
    humidity: c.relative_humidity_2m,
    windSpeed: Math.round(c.wind_speed_10m * 0.621371),
    windDirection: c.wind_direction_10m,
    weatherCode: c.weather_code,
    source: "Open-Meteo observation",
    stationName: null,
    observedAt: c.time,
  };
}

export async function fetchOpenMeteoAirQuality(
  lat: number,
  lng: number,
  locationName?: string
): Promise<SupplementalRiskSignal[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: [
      "european_aqi",
      "us_aqi",
      "pm2_5",
      "pm10",
      "ozone",
      "nitrogen_dioxide",
      "sulphur_dioxide",
      "carbon_monoxide",
      "dust",
      "ammonia",
    ].join(","),
  });

  const url = `${AIR_QUALITY_BASE}/air-quality?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo air quality API returned ${res.status}`);

  const json: OpenMeteoAirQualityResponse = await res.json();
  const c = json.current;
  const aqi = c.european_aqi ?? c.us_aqi ?? 0;
  const sev = aqiSeverity(c.european_aqi, c.us_aqi);

  const metrics: SupplementalMetric[] = [];
  if (c.european_aqi != null) metrics.push({ label: "European AQI", value: c.european_aqi });
  if (c.us_aqi != null) metrics.push({ label: "US AQI", value: c.us_aqi });
  if (c.pm2_5 != null) metrics.push({ label: "PM2.5", value: c.pm2_5, unit: "µg/m³" });
  if (c.pm10 != null) metrics.push({ label: "PM10", value: c.pm10, unit: "µg/m³" });
  if (c.ozone != null) metrics.push({ label: "Ozone", value: c.ozone, unit: "µg/m³" });
  if (c.nitrogen_dioxide != null) metrics.push({ label: "NO2", value: c.nitrogen_dioxide, unit: "µg/m³" });
  if (c.sulphur_dioxide != null) metrics.push({ label: "SO2", value: c.sulphur_dioxide, unit: "µg/m³" });

  const signal: SupplementalRiskSignal = {
    id: newEventId(),
    source: "AIRNOW",
    sourceEventId: `openmeteo-aq-${lat.toFixed(2)}-${lng.toFixed(2)}`,
    category: "Air Quality",
    type: "Air Quality",
    severity: sev,
    headline: `Air Quality Index: ${aqi}${c.european_aqi != null ? ` (EAQI: ${c.european_aqi})` : ""}`,
    description: `Air quality near ${locationName || `${lat.toFixed(2)}, ${lng.toFixed(2)}`}.`,
    geometry: { type: "Point", latitude: lat, longitude: lng },
    startedAt: new Date().toISOString(),
    expiresAt: null,
    updatedAt: new Date().toISOString(),
    url: "https://open-meteo.com/en/docs/air-quality-api",
    confidence: "Source reported",
    metrics,
    raw: c as unknown as Record<string, unknown>,
  };

  return [signal];
}

export async function fetchOpenMeteoMarine(
  lat: number,
  lng: number,
  locationName?: string
): Promise<SupplementalRiskSignal[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: [
      "wave_height",
      "wave_direction",
      "wave_period",
      "swell_wave_height",
      "swell_wave_direction",
      "swell_wave_period",
      "ocean_current_velocity",
      "ocean_current_direction",
    ].join(","),
  });

  const url = `${MARINE_BASE}/marine?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo marine API returned ${res.status}`);

  const json: OpenMeteoMarineResponse = await res.json();
  const c = json.current;

  const maxWave = Math.max(c.wave_height ?? 0, c.swell_wave_height ?? 0);
  const sev: Severity = maxWave >= 14 ? "Extreme" : maxWave >= 8 ? "Severe" : maxWave >= 4 ? "Moderate" : "Minor";

  const metrics: SupplementalMetric[] = [];
  if (c.wave_height != null) metrics.push({ label: "Wave Height", value: c.wave_height, unit: "m" });
  if (c.wave_direction != null) metrics.push({ label: "Wave Direction", value: c.wave_direction, unit: "°" });
  if (c.wave_period != null) metrics.push({ label: "Wave Period", value: c.wave_period, unit: "s" });
  if (c.swell_wave_height != null) metrics.push({ label: "Swell Height", value: c.swell_wave_height, unit: "m" });
  if (c.swell_wave_direction != null) metrics.push({ label: "Swell Direction", value: c.swell_wave_direction, unit: "°" });
  if (c.ocean_current_velocity != null) metrics.push({ label: "Current Velocity", value: c.ocean_current_velocity, unit: "km/h" });

  const signal: SupplementalRiskSignal = {
    id: newEventId(),
    source: "COOPS",
    sourceEventId: `open-meteo-marine-${lat.toFixed(2)}-${lng.toFixed(2)}`,
    category: "Coastal Water",
    type: "Marine Conditions",
    severity: sev,
    headline: `Marine conditions: ${maxWave > 0 ? `${maxWave.toFixed(1)}m waves` : "Calm"}`,
    description: `Marine conditions near ${locationName || `${lat.toFixed(2)}, ${lng.toFixed(2)}`}.`,
    geometry: { type: "Point", latitude: lat, longitude: lng },
    startedAt: new Date().toISOString(),
    expiresAt: null,
    updatedAt: new Date().toISOString(),
    url: "https://open-meteo.com/en/docs/marine-weather-api",
    confidence: "Source reported",
    metrics,
    raw: json as unknown as Record<string, unknown>,
  };

  return [signal];
}