import { useState } from "react";
import type { CurrentWeather } from "../../services/weather";
import { weatherLabel } from "../../services/weather";
import { formatTimestamp } from "../../lib/format";
import { buildWeatherInsights } from "../../lib/weatherInsights";
import type { ResolvedLocation } from "../../types/location";
import { ForecastDialog } from "./ForecastDialog";

interface CurrentConditionsPanelProps {
  currentWeather: CurrentWeather | null;
  location: ResolvedLocation;
}

export function CurrentConditionsPanel({
  currentWeather,
  location,
}: CurrentConditionsPanelProps) {
  const [showForecast, setShowForecast] = useState(false);
  if (!currentWeather) return null;
  const forecast = currentWeather.forecast ?? [];
  const hourly = currentWeather.hourlyForecast ?? [];
  const insights = buildWeatherInsights(hourly);

  return (
    <div style={styles.section}>
      <div style={styles.label}>Current Conditions</div>
      <div
        style={styles.weatherRow}
      >
        <span style={styles.weatherTemp}>
          {Math.round(currentWeather.temperature)}&deg;F
        </span>
        <span style={styles.weatherDesc}>
          {weatherLabel(currentWeather.weatherCode)}
        </span>
        {forecast.length > 0 && (
          <button
            type="button"
            style={styles.forecastToggle}
            onClick={() => setShowForecast(true)}
            aria-haspopup="dialog"
          >
            View 5-day forecast
          </button>
        )}
      </div>
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
      {showForecast && forecast.length > 0 ? (
        <ForecastDialog
          currentWeather={currentWeather}
          location={location}
          onClose={() => setShowForecast(false)}
        />
      ) : null}
    </div>
  );
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
    width: "100%",
  },
  weatherTemp: { fontSize: 22, fontWeight: 700, color: "#212121" },
  weatherDesc: { fontSize: 13, color: "#616161", fontWeight: 500 },
  forecastToggle: {
    background: "#fff",
    border: "1px solid #bbdefb",
    borderRadius: 6,
    color: "#1565c0",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 800,
    marginLeft: "auto",
    padding: "5px 7px",
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
};
