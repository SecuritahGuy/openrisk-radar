import { CircleMarker, Polygon, Popup, Tooltip } from "react-leaflet";
import type {
  NwsForecastGridCell,
  NwsStationObservation,
  NwsWeatherOverlay,
  NwsWeatherZone,
} from "../services/nwsWeatherOverlay";
import type { WeatherLayerMode } from "../types/weatherLayer";

interface NwsWeatherMapLayersProps {
  overlay: NwsWeatherOverlay | null;
  visible: boolean;
  mode: WeatherLayerMode;
}

function positions(polygon: number[][]): [number, number][] {
  return polygon.map(([lng, lat]) => [lat, lng] as [number, number]);
}

function tempColor(temp: number | null): string {
  if (temp == null) return "#546e7a";
  if (temp >= 100) return "#b71c1c";
  if (temp >= 90) return "#d84315";
  if (temp >= 80) return "#f57c00";
  if (temp >= 70) return "#fbc02d";
  if (temp >= 50) return "#2e7d32";
  return "#1565c0";
}

function percentColor(value: number | null, base: "blue" | "purple"): string {
  if (value == null) return "#546e7a";
  if (value >= 80) return base === "blue" ? "#0d47a1" : "#6a1b9a";
  if (value >= 60) return base === "blue" ? "#1565c0" : "#8e24aa";
  if (value >= 40) return base === "blue" ? "#0288d1" : "#ab47bc";
  if (value >= 20) return base === "blue" ? "#4fc3f7" : "#ce93d8";
  return base === "blue" ? "#b3e5fc" : "#f3e5f5";
}

function heatRiskColor(value: number | null): string {
  if (value == null) return "#546e7a";
  if (value >= 4) return "#7f0000";
  if (value >= 3) return "#c62828";
  if (value >= 2) return "#ef6c00";
  if (value >= 1) return "#fbc02d";
  return "#2e7d32";
}

function windColor(value: number | null): string {
  if (value == null) return "#546e7a";
  if (value >= 35) return "#6a1b9a";
  if (value >= 25) return "#c62828";
  if (value >= 15) return "#ef6c00";
  if (value >= 8) return "#0277bd";
  return "#2e7d32";
}

function parseWindSpeed(value: string): number | null {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

function gridModeColor(
  grid: NwsForecastGridCell,
  mode: WeatherLayerMode
): string {
  if (mode === "precip") return percentColor(grid.precipitationChance, "blue");
  if (mode === "thunder") return percentColor(grid.thunderChance, "purple");
  if (mode === "heat") return heatRiskColor(grid.heatRisk);
  if (mode === "wind") return windColor(parseWindSpeed(grid.windSpeed));
  return tempColor(grid.temperature);
}

function stationColor(
  station: NwsStationObservation,
  mode: WeatherLayerMode
): string {
  if (mode === "wind") return windColor(station.windSpeed);
  return tempColor(station.temperature);
}

function stationRadius(
  station: NwsStationObservation,
  mode: WeatherLayerMode
): number {
  const wind = station.windSpeed ?? 0;
  if (mode === "wind") return Math.max(5, Math.min(16, 5 + wind / 2));
  return Math.max(5, Math.min(12, 5 + wind / 3));
}

function modeSummary(grid: NwsForecastGridCell, mode: WeatherLayerMode): string {
  if (mode === "precip") {
    return `Precipitation chance ${grid.precipitationChance ?? "n/a"}%`;
  }
  if (mode === "thunder") {
    return `Thunder chance ${grid.thunderChance ?? "n/a"}%`;
  }
  if (mode === "heat") return `Heat risk ${grid.heatRisk ?? "n/a"}`;
  if (mode === "wind") return `Wind ${grid.windSpeed} ${grid.windDirection}`;
  if (mode === "stations") return "Nearest NWS station observations";
  return `${grid.shortForecast} · ${grid.temperature}°F`;
}

function WeatherGridPopup({
  grid,
  mode,
}: {
  grid: NwsForecastGridCell;
  mode: WeatherLayerMode;
}) {
  return (
    <div>
      <strong>NWS Grid {grid.gridId} {grid.gridX},{grid.gridY}</strong>
      <br />
      {modeSummary(grid, mode)}
      <br />
      {grid.shortForecast} · {grid.temperature}&deg;F
      <br />
      Humidity {grid.humidity ?? "n/a"}% · Wind {grid.windSpeed}{" "}
      {grid.windDirection}
      <br />
      Precip {grid.precipitationChance ?? "n/a"}% · Sky {grid.skyCover ?? "n/a"}%
      {grid.hazards.length > 0 && (
        <>
          <br />
          Hazards: {grid.hazards.join(", ")}
        </>
      )}
    </div>
  );
}

function ZoneLayer({
  zone,
  color,
  label,
}: {
  zone: NwsWeatherZone | null;
  color: string;
  label: string;
}) {
  if (!zone) return null;
  return (
    <Polygon
      positions={positions(zone.polygon)}
      pathOptions={{
        color,
        fillOpacity: 0,
        weight: 2,
        dashArray: "5 5",
      }}
    >
      <Tooltip direction="top">{label}: {zone.name}</Tooltip>
      <Popup>
        <strong>{label}</strong>
        <br />
        {zone.id} · {zone.name}
      </Popup>
    </Polygon>
  );
}

function StationMarker({
  station,
  mode,
}: {
  station: NwsStationObservation;
  mode: WeatherLayerMode;
}) {
  const color = stationColor(station, mode);
  return (
    <CircleMarker
      center={[station.latitude, station.longitude]}
      radius={stationRadius(station, mode)}
      pathOptions={{
        color,
        fillColor: color,
        fillOpacity: 0.6,
        weight: 2,
      }}
    >
      <Tooltip direction="top" offset={[0, -8]}>
        {station.id}{" "}
        {mode === "wind"
          ? `${station.windSpeed ?? "n/a"} mph`
          : station.temperature != null
            ? `${Math.round(station.temperature)}F`
            : "n/a"}
      </Tooltip>
      <Popup>
        <strong>{station.name}</strong>
        <br />
        {station.id} · {station.provider}
        {station.distanceMiles != null && (
          <>
            <br />
            {station.distanceMiles} mi from search point
          </>
        )}
        <br />
        Temp {station.temperature != null ? `${Math.round(station.temperature)}F` : "n/a"} · Humidity{" "}
        {station.humidity ?? "n/a"}%
        <br />
        Wind {station.windSpeed ?? "n/a"} mph
        {station.windDirection != null ? ` @ ${station.windDirection} deg` : ""}
        {station.description && (
          <>
            <br />
            {station.description}
          </>
        )}
      </Popup>
    </CircleMarker>
  );
}

export function NwsWeatherMapLayers({
  overlay,
  visible,
  mode,
}: NwsWeatherMapLayersProps) {
  if (!visible || !overlay) return null;

  const showGrid = mode !== "stations";
  const showStations = mode === "temp" || mode === "wind" || mode === "stations";
  const gridColor = gridModeColor(overlay.gridCell, mode);

  return (
    <>
      {showGrid && (
        <Polygon
          positions={positions(overlay.gridCell.polygon)}
          pathOptions={{
            color: gridColor,
            fillColor: gridColor,
            fillOpacity: mode === "wind" ? 0.1 : 0.18,
            weight: 2,
          }}
        >
          <Tooltip direction="top">NWS {modeSummary(overlay.gridCell, mode)}</Tooltip>
          <Popup>
            <WeatherGridPopup grid={overlay.gridCell} mode={mode} />
          </Popup>
        </Polygon>
      )}
      <ZoneLayer
        zone={overlay.forecastZone}
        color="#6a1b9a"
        label="Forecast zone"
      />
      <ZoneLayer
        zone={overlay.fireWeatherZone}
        color="#d84315"
        label="Fire weather zone"
      />
      {showStations &&
        overlay.stations.map((station) => (
          <StationMarker key={station.id} station={station} mode={mode} />
        ))}
    </>
  );
}
