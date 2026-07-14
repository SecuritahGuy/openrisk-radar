import { newEventId } from "../lib/ids";
import type { CurrentWeather, HourlyWeatherPeriod, WeatherForecastPeriod } from "./weather";
import type { Severity } from "../types/riskEvent";
import type { SupplementalRiskSignal, SupplementalMetric } from "../types/supplementalRisk";

const WEATHER_BASE = "https://api.open-meteo.com/v1";
const AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com/v1";
const MARINE_BASE = "https://marine-api.open-meteo.com/v1";
const FLOOD_BASE = "https://flood-api.open-meteo.com/v1";

interface OpenMeteoCurrent {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  apparent_temperature: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  wind_gusts_10m: number;
  precipitation: number;
  cloud_cover: number;
  pressure_msl: number;
}

interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  current_units: Record<string, string>;
  current: OpenMeteoCurrent;
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
    wind_direction_10m_dominant: number[];
    wind_gusts_10m_max: number[];
    precipitation_probability_max: number[];
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
  };
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
  alder_pollen: number | null;
  birch_pollen: number | null;
  grass_pollen: number | null;
  mugwort_pollen: number | null;
  olive_pollen: number | null;
  ragweed_pollen: number | null;
  uv_index: number | null;
  uv_index_clear_sky: number | null;
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

export function aqiSeverity(europeanAqi: number | null, usAqi: number | null): Severity {
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
      "wind_gusts_10m",
      "precipitation",
      "cloud_cover",
      "pressure_msl",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "wind_speed_10m_max",
      "wind_direction_10m_dominant",
      "wind_gusts_10m_max",
      "precipitation_probability_max",
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "wind_speed_10m",
      "wind_gusts_10m",
    ].join(","),
    forecast_hours: "24",
    forecast_days: "5",
    timezone: "auto",
  });

  const url = `${WEATHER_BASE}/forecast?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo weather API returned ${res.status}`);

  const json: OpenMeteoForecastResponse = await res.json();
  const c = json.current;
  const forecast: WeatherForecastPeriod[] = (json.daily?.time ?? [])
    .slice(0, 5)
    .map((time, index) => ({
      startTime: time,
      temperature: Math.round((json.daily?.temperature_2m_max[index] ?? 0) * 9 / 5 + 32),
      temperatureLow:
        json.daily?.temperature_2m_min[index] != null
          ? Math.round(json.daily.temperature_2m_min[index] * 9 / 5 + 32)
          : null,
      humidity: null,
      windSpeed: Math.round((json.daily?.wind_speed_10m_max[index] ?? 0) * 0.621371),
      windDirection: json.daily?.wind_direction_10m_dominant[index] ?? null,
      windGust: json.daily?.wind_gusts_10m_max[index] != null
        ? Math.round(json.daily.wind_gusts_10m_max[index] * 0.621371)
        : null,
      precipitationChance: json.daily?.precipitation_probability_max[index] ?? null,
      shortForecast: openMeteoWeatherLabel(json.daily?.weather_code[index] ?? -1),
    }));
  const hourlyForecast: HourlyWeatherPeriod[] = (json.hourly?.time ?? [])
    .slice(0, 24)
    .map((time, index) => ({
      startTime: time,
      temperature: Math.round((json.hourly?.temperature_2m[index] ?? 0) * 9 / 5 + 32),
      humidity: json.hourly?.relative_humidity_2m[index] ?? null,
      precipitationChance: json.hourly?.precipitation_probability[index] ?? null,
      precipitationAmount: json.hourly?.precipitation[index] != null
        ? Math.round(json.hourly.precipitation[index] * 0.0393701 * 100) / 100
        : null,
      windSpeed: Math.round((json.hourly?.wind_speed_10m[index] ?? 0) * 0.621371),
      windGust: json.hourly?.wind_gusts_10m[index] != null
        ? Math.round(json.hourly.wind_gusts_10m[index] * 0.621371)
        : null,
      shortForecast: openMeteoWeatherLabel(json.hourly?.weather_code[index] ?? -1),
    }));

  return {
    temperature: Math.round(c.temperature_2m * 9 / 5 + 32),
    feelsLike: Math.round(c.apparent_temperature * 9 / 5 + 32),
    humidity: c.relative_humidity_2m,
    windSpeed: Math.round(c.wind_speed_10m * 0.621371),
    windDirection: c.wind_direction_10m,
    windGust: Math.round(c.wind_gusts_10m * 0.621371),
    dewPoint: null,
    visibility: null,
    precipitation: Math.round(c.precipitation * 0.0393701 * 100) / 100,
    weatherCode: c.weather_code,
    source: "Open-Meteo observation",
    stationName: null,
    observedAt: c.time,
    forecast,
    hourlyForecast,
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
      "alder_pollen",
      "birch_pollen",
      "grass_pollen",
      "mugwort_pollen",
      "olive_pollen",
      "ragweed_pollen",
      "uv_index",
      "uv_index_clear_sky",
    ].join(","),
  });

  const url = `${AIR_QUALITY_BASE}/air-quality?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo air quality API returned ${res.status}`);

  const json: OpenMeteoAirQualityResponse = await res.json();
  const c = json.current;

  const aqiMetrics: SupplementalMetric[] = [];
  if (c.european_aqi != null) aqiMetrics.push({ label: "European AQI", value: c.european_aqi });
  if (c.us_aqi != null) aqiMetrics.push({ label: "US AQI", value: c.us_aqi });
  if (c.pm2_5 != null) aqiMetrics.push({ label: "PM2.5", value: c.pm2_5, unit: "µg/m³" });
  if (c.pm10 != null) aqiMetrics.push({ label: "PM10", value: c.pm10, unit: "µg/m³" });
  if (c.ozone != null) aqiMetrics.push({ label: "Ozone", value: c.ozone, unit: "µg/m³" });
  if (c.nitrogen_dioxide != null) aqiMetrics.push({ label: "NO2", value: c.nitrogen_dioxide, unit: "µg/m³" });
  if (c.sulphur_dioxide != null) aqiMetrics.push({ label: "SO2", value: c.sulphur_dioxide, unit: "µg/m³" });
  if (c.carbon_monoxide != null) aqiMetrics.push({ label: "CO", value: c.carbon_monoxide, unit: "µg/m³" });
  if (c.dust != null) aqiMetrics.push({ label: "Dust", value: c.dust, unit: "µg/m³" });
  if (c.ammonia != null) aqiMetrics.push({ label: "NH3", value: c.ammonia, unit: "µg/m³" });

  const aqi = c.european_aqi ?? c.us_aqi ?? 0;
  const aqiSev = aqiSeverity(c.european_aqi, c.us_aqi);

  const signals: SupplementalRiskSignal[] = [];

  signals.push({
    id: newEventId(),
    source: "AIRNOW",
    sourceEventId: `openmeteo-aq-${lat.toFixed(2)}-${lng.toFixed(2)}`,
    category: "Air Quality",
    type: "Air Quality",
    severity: aqiSev,
    headline: `Air Quality Index: ${aqi}${c.european_aqi != null ? ` (EAQI: ${c.european_aqi})` : ""}`,
    description: `Air quality near ${locationName || `${lat.toFixed(2)}, ${lng.toFixed(2)}`}.`,
    geometry: { type: "Point", latitude: lat, longitude: lng },
    startedAt: new Date().toISOString(),
    expiresAt: null,
    updatedAt: new Date().toISOString(),
    url: "https://open-meteo.com/en/docs/air-quality-api",
    confidence: "Source reported",
    metrics: aqiMetrics,
    raw: c as unknown as Record<string, unknown>,
  });

  const pollenValues = [c.alder_pollen, c.birch_pollen, c.grass_pollen, c.mugwort_pollen, c.olive_pollen, c.ragweed_pollen]
    .filter((v): v is number => v != null);
  if (pollenValues.length > 0) {
    const maxPollen = Math.max(...pollenValues);
    const pollenSev: Severity = maxPollen >= 200 ? "Extreme" : maxPollen >= 100 ? "Severe" : maxPollen >= 50 ? "Moderate" : "Minor";

    const pollenMetrics: SupplementalMetric[] = [];
    if (c.alder_pollen != null) pollenMetrics.push({ label: "Alder", value: c.alder_pollen, unit: "grains/m³" });
    if (c.birch_pollen != null) pollenMetrics.push({ label: "Birch", value: c.birch_pollen, unit: "grains/m³" });
    if (c.grass_pollen != null) pollenMetrics.push({ label: "Grass", value: c.grass_pollen, unit: "grains/m³" });
    if (c.mugwort_pollen != null) pollenMetrics.push({ label: "Mugwort", value: c.mugwort_pollen, unit: "grains/m³" });
    if (c.olive_pollen != null) pollenMetrics.push({ label: "Olive", value: c.olive_pollen, unit: "grains/m³" });
    if (c.ragweed_pollen != null) pollenMetrics.push({ label: "Ragweed", value: c.ragweed_pollen, unit: "grains/m³" });

    signals.push({
      id: newEventId(),
      source: "AIRNOW",
      sourceEventId: `openmeteo-pollen-${lat.toFixed(2)}-${lng.toFixed(2)}`,
      category: "Pollen",
      type: "Pollen",
      severity: pollenSev,
      headline: `Pollen: ${maxPollen.toFixed(0)} grains/m³ peak`,
      description: `Pollen levels near ${locationName || `${lat.toFixed(2)}, ${lng.toFixed(2)}`}.`,
      geometry: { type: "Point", latitude: lat, longitude: lng },
      startedAt: new Date().toISOString(),
      expiresAt: null,
      updatedAt: new Date().toISOString(),
      url: "https://open-meteo.com/en/docs/air-quality-api",
      confidence: "Source reported",
      metrics: pollenMetrics,
      raw: c as unknown as Record<string, unknown>,
    });
  }

  if (c.uv_index != null) {
    const uvSev: Severity = c.uv_index >= 11 ? "Extreme" : c.uv_index >= 8 ? "Severe" : c.uv_index >= 6 ? "Moderate" : "Minor";

    const uvMetrics: SupplementalMetric[] = [{ label: "UV Index", value: c.uv_index }];
    if (c.uv_index_clear_sky != null) uvMetrics.push({ label: "UV Index (Clear Sky)", value: c.uv_index_clear_sky });

    signals.push({
      id: newEventId(),
      source: "AIRNOW",
      sourceEventId: `openmeteo-uv-${lat.toFixed(2)}-${lng.toFixed(2)}`,
      category: "UV Index",
      type: "UV Index",
      severity: uvSev,
      headline: `UV Index: ${c.uv_index}`,
      description: `UV index near ${locationName || `${lat.toFixed(2)}, ${lng.toFixed(2)}`}.`,
      geometry: { type: "Point", latitude: lat, longitude: lng },
      startedAt: new Date().toISOString(),
      expiresAt: null,
      updatedAt: new Date().toISOString(),
      url: "https://open-meteo.com/en/docs/air-quality-api",
      confidence: "Source reported",
      metrics: uvMetrics,
      raw: c as unknown as Record<string, unknown>,
    });
  }

  return signals;
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

  if (metrics.length === 0) return [];

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

interface OpenMeteoFloodDaily {
  time: string[];
  river_discharge: (number | null)[];
  river_discharge_mean: (number | null)[];
  river_discharge_median: (number | null)[];
  river_discharge_max: (number | null)[];
  river_discharge_min: (number | null)[];
}

interface OpenMeteoFloodResponse {
  latitude: number;
  longitude: number;
  daily_units: Record<string, string>;
  daily: OpenMeteoFloodDaily;
}

export async function fetchOpenMeteoFlood(
  lat: number,
  lng: number,
  locationName?: string
): Promise<SupplementalRiskSignal[]> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    daily: [
      "river_discharge",
      "river_discharge_mean",
      "river_discharge_median",
      "river_discharge_max",
      "river_discharge_min",
    ].join(","),
    forecast_days: "10",
  });

  const url = `${FLOOD_BASE}/flood?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo flood API returned ${res.status}`);

  const json: OpenMeteoFloodResponse = await res.json();
  const d = json.daily;
  if (!d?.time?.length) return [];

  let peakDischarge = 0;
  let peakIndex = -1;
  for (let i = 0; i < d.time.length; i++) {
    const val = d.river_discharge[i];
    if (val != null && val > peakDischarge) {
      peakDischarge = val;
      peakIndex = i;
    }
  }

  if (peakDischarge <= 0) return [];

  const meanAtPeak = peakIndex >= 0 ? (d.river_discharge_mean[peakIndex] ?? null) : null;
  const ratio = meanAtPeak != null && meanAtPeak > 0.1 ? peakDischarge / meanAtPeak : null;

  let sev: Severity;
  if (ratio != null) {
    sev = ratio >= 5 ? "Extreme" : ratio >= 3 ? "Severe" : ratio >= 2 ? "Moderate" : "Minor";
  } else {
    sev = peakDischarge >= 2000 ? "Extreme" : peakDischarge >= 500 ? "Severe" : peakDischarge >= 100 ? "Moderate" : "Minor";
  }

  const metrics: SupplementalMetric[] = [
    { label: "River Discharge", value: Math.round(peakDischarge * 10) / 10, unit: "m³/s" },
  ];
  if (meanAtPeak != null) {
    metrics.push({ label: "Ensemble Mean", value: Math.round(meanAtPeak * 10) / 10, unit: "m³/s" });
  }
  if (ratio != null) {
    metrics.push({ label: "Peak/Mean Ratio", value: Math.round(ratio * 10) / 10 });
  }
  if (d.river_discharge_max[peakIndex] != null) {
    metrics.push({ label: "Ensemble Max", value: Math.round(d.river_discharge_max[peakIndex]! * 10) / 10, unit: "m³/s" });
  }

  const peakTime = d.time[peakIndex];

  return [{
    id: newEventId(),
    source: "USGS_WATER",
    sourceEventId: `openmeteo-flood-${lat.toFixed(2)}-${lng.toFixed(2)}`,
    category: "River Gauge",
    type: "Flood Risk",
    severity: sev,
    headline: ratio != null
      ? `River discharge ${ratio >= 2 ? "elevated" : "normal"}: ${Math.round(peakDischarge)} m³/s peak`
      : `River discharge: ${Math.round(peakDischarge)} m³/s`,
    description: `Flood forecast near ${locationName || `${lat.toFixed(2)}, ${lng.toFixed(2)}`} peaks at ${Math.round(peakDischarge)} m³/s on ${peakTime}.`,
    geometry: { type: "Point", latitude: lat, longitude: lng },
    startedAt: new Date().toISOString(),
    expiresAt: null,
    updatedAt: new Date().toISOString(),
    url: "https://open-meteo.com/en/docs/flood-api",
    confidence: "Source reported",
    metrics,
    raw: json as unknown as Record<string, unknown>,
  }];
}
