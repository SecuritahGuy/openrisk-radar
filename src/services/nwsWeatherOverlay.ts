interface QuantitativeValue {
  value: number | null;
  unitCode?: string;
  qualityControl?: string;
}

interface GeoJsonPolygon {
  type: "Polygon";
  coordinates: number[][][];
}

interface NwsPointResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecastHourly: string;
    forecastGridData: string;
    observationStations: string;
    forecastZone: string;
    fireWeatherZone: string | null;
  };
}

interface NwsHourlyResponse {
  geometry: GeoJsonPolygon;
  properties: {
    generatedAt: string;
    periods: Array<{
      temperature: number;
      relativeHumidity?: QuantitativeValue;
      probabilityOfPrecipitation?: QuantitativeValue;
      windSpeed: string;
      windDirection: string;
      shortForecast: string;
      startTime: string;
    }>;
  };
}

interface NwsGridResponse {
  properties: {
    hazards?: { values: Array<{ validTime: string; value: Array<{ phenomenon: string; significance: string }> }> };
    heatRisk?: { values: Array<{ validTime: string; value: number | null }> };
    skyCover?: { values: Array<{ validTime: string; value: number | null }> };
    probabilityOfThunder?: { values: Array<{ validTime: string; value: number | null }> };
  };
}

interface NwsZoneResponse {
  geometry: GeoJsonPolygon | null;
  properties: {
    id: string;
    name: string;
    type: string;
  };
}

interface NwsStationsResponse {
  features: Array<{
    id: string;
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    properties: {
      stationIdentifier: string;
      name: string;
      provider: string;
      distance?: QuantitativeValue;
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
  };
}

export interface NwsForecastGridCell {
  gridId: string;
  gridX: number;
  gridY: number;
  polygon: number[][];
  validAt: string;
  temperature: number;
  humidity: number | null;
  precipitationChance: number | null;
  windSpeed: string;
  windDirection: string;
  shortForecast: string;
  hazards: string[];
  heatRisk: number | null;
  skyCover: number | null;
  thunderChance: number | null;
}

export interface NwsWeatherZone {
  id: string;
  name: string;
  type: string;
  polygon: number[][];
}

export interface NwsStationObservation {
  id: string;
  name: string;
  provider: string;
  latitude: number;
  longitude: number;
  distanceMiles: number | null;
  temperature: number | null;
  humidity: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  description: string | null;
  observedAt: string | null;
}

export interface NwsWeatherOverlay {
  generatedAt: string;
  gridCell: NwsForecastGridCell;
  forecastZone: NwsWeatherZone | null;
  fireWeatherZone: NwsWeatherZone | null;
  stations: NwsStationObservation[];
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
  return Math.round((value * 9 / 5 + 32) * 10) / 10;
}

function kmhToMph(value: number | null | undefined): number | null {
  if (value == null) return null;
  return Math.round(value * 0.621371 * 10) / 10;
}

function metersToMiles(value: number | null | undefined): number | null {
  if (value == null) return null;
  return Math.round(value / 1609.34 * 10) / 10;
}

function polygonFromGeometry(geometry: GeoJsonPolygon | null): number[][] | null {
  return geometry?.coordinates?.[0] ?? null;
}

function durationMs(duration: string): number {
  const match = duration.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
  if (!match) return 0;
  return ((Number(match[1] ?? 0) * 24 + Number(match[2] ?? 0)) * 60 + Number(match[3] ?? 0)) * 60_000;
}

export function gridValueAtTime<T>(
  values: Array<{ validTime: string; value: T | null }> | undefined,
  nowMs = Date.now()
): T | null {
  if (!values?.length) return null;
  const active = values.find((entry) => {
    const [startText, duration = "PT1H"] = entry.validTime.split("/");
    const start = new Date(startText).getTime();
    const end = start + durationMs(duration);
    return Number.isFinite(start) && nowMs >= start && nowMs < end;
  });
  if (active) return active.value;
  const future = values.find((entry) => new Date(entry.validTime.split("/")[0]).getTime() > nowMs);
  return future?.value ?? values[values.length - 1]?.value ?? null;
}

function normalizeHazards(
  values?: Array<{ validTime: string; value: Array<{ phenomenon: string; significance: string }> }>,
  nowMs = Date.now()
): string[] {
  const current = gridValueAtTime(values, nowMs) ?? [];
  return current
    .filter((h) => h.phenomenon || h.significance)
    .map((h) => `${h.phenomenon}${h.significance}`);
}

async function fetchZone(url: string | null): Promise<NwsWeatherZone | null> {
  if (!url) return null;
  const zone = await fetchJson<NwsZoneResponse>(url);
  const polygon = polygonFromGeometry(zone.geometry);
  if (!polygon) return null;
  return {
    id: zone.properties.id,
    name: zone.properties.name,
    type: zone.properties.type,
    polygon,
  };
}

async function fetchStationObservation(
  station: NwsStationsResponse["features"][number]
): Promise<NwsStationObservation> {
  const obs = await fetchJson<NwsObservationResponse>(
    `${station.id}/observations/latest`
  );
  const p = obs.properties;
  const [longitude, latitude] = station.geometry.coordinates;

  return {
    id: station.properties.stationIdentifier,
    name: p.stationName || station.properties.name,
    provider: station.properties.provider,
    latitude,
    longitude,
    distanceMiles: metersToMiles(station.properties.distance?.value),
    temperature: cToF(p.temperature?.value),
    humidity:
      p.relativeHumidity?.value == null
        ? null
        : Math.round(p.relativeHumidity.value),
    windSpeed: kmhToMph(p.windSpeed?.value),
    windDirection: p.windDirection?.value ?? null,
    description: p.textDescription || null,
    observedAt: p.timestamp ?? null,
  };
}

export async function fetchNwsWeatherOverlay(
  lat: number,
  lng: number
): Promise<NwsWeatherOverlay> {
  const point = await fetchJson<NwsPointResponse>(
    `https://api.weather.gov/points/${lat},${lng}`
  );
  const props = point.properties;

  const [hourly, grid, stations, forecastZone, fireWeatherZone] =
    await Promise.all([
      fetchJson<NwsHourlyResponse>(props.forecastHourly),
      fetchJson<NwsGridResponse>(props.forecastGridData),
      fetchJson<NwsStationsResponse>(props.observationStations),
      fetchZone(props.forecastZone),
      props.fireWeatherZone === props.forecastZone
        ? Promise.resolve(null)
        : fetchZone(props.fireWeatherZone),
    ]);

  const first = hourly.properties.periods[0];
  const gridPolygon = polygonFromGeometry(hourly.geometry);
  if (!gridPolygon) throw new Error("NWS grid geometry missing");

  const stationResults = await Promise.allSettled(
    stations.features.slice(0, 8).map(fetchStationObservation)
  );

  return {
    generatedAt: hourly.properties.generatedAt,
    gridCell: {
      gridId: props.gridId,
      gridX: props.gridX,
      gridY: props.gridY,
      polygon: gridPolygon,
      validAt: first.startTime,
      temperature: first.temperature,
      humidity: first.relativeHumidity?.value ?? null,
      precipitationChance: first.probabilityOfPrecipitation?.value ?? null,
      windSpeed: first.windSpeed,
      windDirection: first.windDirection,
      shortForecast: first.shortForecast,
      hazards: normalizeHazards(grid.properties.hazards?.values),
      heatRisk: gridValueAtTime(grid.properties.heatRisk?.values),
      skyCover: gridValueAtTime(grid.properties.skyCover?.values),
      thunderChance: gridValueAtTime(grid.properties.probabilityOfThunder?.values),
    },
    forecastZone,
    fireWeatherZone,
    stations: stationResults
      .filter((result): result is PromiseFulfilledResult<NwsStationObservation> =>
        result.status === "fulfilled"
      )
      .map((result) => result.value),
  };
}
