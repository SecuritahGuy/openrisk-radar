import { useState } from "react";
import type { CurrentWeather } from "../../services/weather";
import { weatherLabel } from "../../services/weather";
import { formatTimestamp } from "../../lib/format";
import { buildWeatherInsights } from "../../lib/weatherInsights";

interface CurrentConditionsPanelProps {
  currentWeather: CurrentWeather | null;
}

export function CurrentConditionsPanel({
  currentWeather,
}: CurrentConditionsPanelProps) {
  const [showForecast, setShowForecast] = useState(false);
  if (!currentWeather) return null;
  const forecast = currentWeather.forecast ?? [];
  const hourly = currentWeather.hourlyForecast ?? [];
  const insights = buildWeatherInsights(hourly);

  return (
    <div style={styles.section}>
      <div style={styles.label}>Current Conditions</div>
      <button
        type="button"
        style={styles.weatherRow}
        onClick={() => setShowForecast((value) => !value)}
        aria-expanded={showForecast}
        disabled={forecast.length === 0}
        title={forecast.length > 0 ? "Show 5-day forecast" : "Forecast unavailable"}
      >
        <span style={styles.weatherTemp}>
          {Math.round(currentWeather.temperature)}&deg;F
        </span>
        <span style={styles.weatherDesc}>
          {weatherLabel(currentWeather.weatherCode)}
        </span>
        {forecast.length > 0 && (
          <span style={styles.forecastToggle}>
            {showForecast ? "Hide forecast" : "5-day forecast"}
          </span>
        )}
      </button>
      <div style={styles.weatherMeta}>
        Feels like {Math.round(currentWeather.feelsLike)}&deg;F &middot;{" "}
        {currentWeather.humidity}% humidity &middot;{" "}
        {Math.round(currentWeather.windSpeed)} mph wind
        {currentWeather.windGust != null
          ? ` · gusts ${Math.round(currentWeather.windGust)} mph`
          : ""}
      </div>
      {(currentWeather.dewPoint != null || currentWeather.visibility != null || currentWeather.precipitation != null) && (
        <div style={styles.weatherMeta}>
          {[
            currentWeather.dewPoint != null ? `Dew point ${Math.round(currentWeather.dewPoint)}°F` : null,
            currentWeather.visibility != null ? `Visibility ${currentWeather.visibility.toFixed(1)} mi` : null,
            currentWeather.precipitation != null ? `Precipitation ${currentWeather.precipitation.toFixed(2)} in` : null,
          ].filter(Boolean).join(" · ")}
        </div>
      )}
      <div style={styles.weatherMeta}>
        {currentWeather.source}
        {currentWeather.stationName ? ` - ${currentWeather.stationName}` : ""}
        {currentWeather.observedAt
          ? ` - ${formatTimestamp(currentWeather.observedAt)}`
          : ""}
      </div>
      {insights.length > 0 && (
        <div style={styles.insights} aria-label="Next 24 hour weather outlook">
          {insights.map((insight) => <div key={insight}>{insight}</div>)}
        </div>
      )}
      {showForecast && forecast.length > 0 && (
        <>
        {hourly.length > 0 && (
          <div style={styles.hourlyStrip} aria-label="Hourly weather forecast">
            {hourly.slice(0, 12).filter((_, index) => index % 3 === 0).map((period) => (
              <div key={period.startTime} style={styles.hourlyCell}>
                <strong>{hourLabel(period.startTime)}</strong>
                <span>{Math.round(period.temperature)}°</span>
                <span>{Math.round(period.precipitationChance ?? 0)}% precip</span>
                <span>{Math.round(period.windGust ?? period.windSpeed)} mph wind</span>
              </div>
            ))}
          </div>
        )}
        <div style={styles.forecastList}>
          {forecast.slice(0, 5).map((period) => (
            <div key={period.startTime} style={styles.forecastRow}>
              <div style={styles.forecastTime}>{forecastDay(period.startTime)}</div>
              <div style={styles.forecastMain}>
                <strong>
                  {Math.round(period.temperature)}&deg;
                  {period.temperatureLow != null && (
                    <> / {Math.round(period.temperatureLow)}&deg;</>
                  )}
                </strong>
                <span>{period.shortForecast}</span>
              </div>
              <div style={styles.forecastMeta}>
                {period.precipitationChance != null ? `${Math.round(period.precipitationChance)}% precip · ` : ""}
                {period.humidity != null ? `${Math.round(period.humidity)}% humidity · ` : ""}
                {Math.round(period.windSpeed)} mph wind
                {period.windGust != null ? ` · ${Math.round(period.windGust)} mph gusts` : ""}
              </div>
            </div>
          ))}
        </div>
        </>
      )}
    </div>
  );
}

function hourLabel(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleTimeString("en-US", { hour: "numeric" });
}

function forecastDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#616161",
    marginBottom: 4,
  },
  weatherRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    marginTop: 4,
    border: "1px solid transparent",
    background: "transparent",
    cursor: "pointer",
    font: "inherit",
    padding: 0,
    textAlign: "left",
    width: "100%",
  },
  weatherTemp: { fontSize: 22, fontWeight: 700, color: "#212121" },
  weatherDesc: { fontSize: 13, color: "#616161", fontWeight: 500 },
  forecastToggle: {
    color: "#1565c0",
    fontSize: 11,
    fontWeight: 800,
    marginLeft: "auto",
    textTransform: "uppercase",
  },
  weatherMeta: { fontSize: 12, color: "#9e9e9e", marginTop: 2 },
  insights: {
    background: "#eef6ff",
    border: "1px solid #cfe3f6",
    borderRadius: 8,
    color: "#24445f",
    display: "grid",
    fontSize: 11,
    gap: 4,
    lineHeight: 1.4,
    marginTop: 8,
    padding: "8px 9px",
  },
  hourlyStrip: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(82px, 1fr))",
    gap: 6,
    marginTop: 9,
    overflowX: "auto",
  },
  hourlyCell: {
    background: "#f7f9fb",
    border: "1px solid #e3e9ef",
    borderRadius: 7,
    color: "#546e7a",
    display: "grid",
    fontSize: 10,
    gap: 2,
    minWidth: 82,
    padding: "7px",
  },
  forecastList: {
    border: "1px solid #e3e9ef",
    borderRadius: 8,
    display: "grid",
    gap: 0,
    marginTop: 9,
    overflow: "hidden",
  },
  forecastRow: {
    background: "#fff",
    borderBottom: "1px solid #edf1f5",
    display: "grid",
    gap: 3,
    padding: "8px 9px",
  },
  forecastTime: {
    color: "#546e7a",
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  forecastMain: {
    alignItems: "baseline",
    color: "#263238",
    display: "flex",
    fontSize: 12,
    gap: 7,
  },
  forecastMeta: {
    color: "#616161",
    fontSize: 11,
  },
};
