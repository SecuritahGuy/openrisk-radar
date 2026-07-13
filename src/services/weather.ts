export interface WeatherForecastPeriod {
  startTime: string;
  temperature: number;
  temperatureLow: number | null;
  humidity: number | null;
  windSpeed: number;
  windDirection: number | null;
  shortForecast: string;
}

export interface CurrentWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windDirection: number | null;
  weatherCode: number | string;
  source: string;
  stationName: string | null;
  observedAt: string | null;
  forecast: WeatherForecastPeriod[];
}

const BASE = "https://api.weather.gov";

export function weatherLabel(code: number | string): string {
  if (typeof code === "string") return code || "Unknown";
  return WMO_DESCRIPTIONS[code] ?? "Unknown";
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

interface QuantitativeValue {
  value: number | null;
  unitCode?: string;
}

interface NwsPointResponse {
  properties: {
    forecast: string;
    observationStations: string;
  };
}

interface NwsForecastResponse {
  properties: {
    periods: Array<{
      name?: string;
      isDaytime?: boolean;
      temperature: number;
      relativeHumidity?: QuantitativeValue;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      startTime: string;
    }>;
  };
}

interface NwsStationsResponse {
  features: Array<{
    id: string;
    properties: {
      name: string;
    };
  }>;
}

interface NwsObservationResponse {
  properties: {
    stationName: string;
    timestamp: string;
    textDescription: string | null;
    temperature: QuantitativeValue;
    relativeHumidity: QuantitativeValue;
    windSpeed: QuantitativeValue;
    windDirection: QuantitativeValue;
    heatIndex: QuantitativeValue;
    windChill: QuantitativeValue;
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/geo+json, application/json",
    },
  });
  if (!res.ok) throw new Error(`NWS API returned ${res.status}`);
  return res.json() as Promise<T>;
}

function cToF(value: number | null | undefined): number | null {
  if (value == null) return null;
  return value * 9 / 5 + 32;
}

function kmhToMph(value: number | null | undefined): number | null {
  if (value == null) return null;
  return value * 0.621371;
}

function parseWindMph(raw: string): number {
  const match = raw.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function windDirectionLabelToDegrees(label: string): number | null {
  const directions: Record<string, number> = {
    N: 0,
    NNE: 23,
    NE: 45,
    ENE: 68,
    E: 90,
    ESE: 113,
    SE: 135,
    SSE: 158,
    S: 180,
    SSW: 203,
    SW: 225,
    WSW: 248,
    W: 270,
    WNW: 293,
    NW: 315,
    NNW: 338,
  };
  return directions[label] ?? null;
}

async function fetchNearestObservation(
  stationsUrl: string
): Promise<CurrentWeather | null> {
  const stations = await fetchJson<NwsStationsResponse>(stationsUrl);
  const candidates = stations.features.slice(0, 6);

  for (const station of candidates) {
    try {
      const obs = await fetchJson<NwsObservationResponse>(
        `${station.id}/observations/latest`
      );
      const p = obs.properties;
      const temperature = cToF(p.temperature?.value);
      if (temperature == null) continue;

      return {
        temperature,
        feelsLike:
          cToF(p.heatIndex?.value) ??
          cToF(p.windChill?.value) ??
          temperature,
        humidity: Math.round(p.relativeHumidity?.value ?? 0),
        windSpeed: kmhToMph(p.windSpeed?.value) ?? 0,
        windDirection: p.windDirection?.value ?? null,
        weatherCode: p.textDescription || "Observed conditions",
        source: "NWS observation",
        stationName: p.stationName || station.properties.name,
        observedAt: p.timestamp,
        forecast: [],
      };
    } catch {
      // Try the next nearest station when one observation endpoint is missing.
    }
  }

  return null;
}

function fromForecast(forecast: NwsForecastResponse): CurrentWeather {
  const first = forecast.properties.periods[0];
  return {
    temperature: first.temperature,
    feelsLike: first.temperature,
    humidity: Math.round(first.relativeHumidity?.value ?? 0),
    windSpeed: parseWindMph(first.windSpeed),
    windDirection: windDirectionLabelToDegrees(first.windDirection),
    weatherCode: first.shortForecast || "Forecast conditions",
    source: "NWS forecast",
    stationName: null,
    observedAt: first.startTime,
    forecast: dailyForecastPeriods(forecast),
  };
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

function dailyForecastPeriods(forecast: NwsForecastResponse): WeatherForecastPeriod[] {
  const days: WeatherForecastPeriod[] = [];
  const periods = forecast.properties.periods;

  for (let index = 0; index < periods.length && days.length < 5; index += 1) {
    const period = periods[index];
    const isDaytime = period.isDaytime !== false;
    if (!isDaytime) continue;

    const overnight = periods
      .slice(index + 1)
      .find(
        (candidate) =>
          candidate.isDaytime === false &&
          dateKey(candidate.startTime) === dateKey(period.startTime)
      );
    days.push({
      startTime: period.startTime,
      temperature: period.temperature,
      temperatureLow: overnight?.temperature ?? null,
      humidity: period.relativeHumidity?.value ?? null,
      windSpeed: parseWindMph(period.windSpeed),
      windDirection: windDirectionLabelToDegrees(period.windDirection),
      shortForecast: period.shortForecast || "Forecast conditions",
    });
  }

  return days.length > 0
    ? days
    : periods.slice(0, 5).map((period) => ({
        startTime: period.startTime,
        temperature: period.temperature,
        temperatureLow: null,
        humidity: period.relativeHumidity?.value ?? null,
        windSpeed: parseWindMph(period.windSpeed),
        windDirection: windDirectionLabelToDegrees(period.windDirection),
        shortForecast: period.shortForecast || "Forecast conditions",
      }));
}

export async function fetchCurrentWeather(
  lat: number,
  lng: number
): Promise<CurrentWeather> {
  const point = await fetchJson<NwsPointResponse>(`${BASE}/points/${lat},${lng}`);
  const [observation, forecast] = await Promise.all([
    fetchNearestObservation(point.properties.observationStations).catch(() => null),
    fetchJson<NwsForecastResponse>(point.properties.forecast),
  ]);

  const dailyForecast = dailyForecastPeriods(forecast);
  return observation ? { ...observation, forecast: dailyForecast } : fromForecast(forecast);
}
