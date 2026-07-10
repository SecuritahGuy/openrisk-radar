import type { CurrentWeather } from "../../services/weather";
import { weatherLabel } from "../../services/weather";
import { formatTimestamp } from "../../lib/format";

interface CurrentConditionsPanelProps {
  currentWeather: CurrentWeather | null;
}

export function CurrentConditionsPanel({
  currentWeather,
}: CurrentConditionsPanelProps) {
  if (!currentWeather) return null;

  return (
    <div style={styles.section}>
      <div style={styles.label}>Current Conditions</div>
      <div style={styles.weatherRow}>
        <span style={styles.weatherTemp}>
          {Math.round(currentWeather.temperature)}&deg;F
        </span>
        <span style={styles.weatherDesc}>
          {weatherLabel(currentWeather.weatherCode)}
        </span>
      </div>
      <div style={styles.weatherMeta}>
        Feels like {Math.round(currentWeather.feelsLike)}&deg;F &middot;{" "}
        {currentWeather.humidity}% humidity &middot;{" "}
        {Math.round(currentWeather.windSpeed)} mph wind
      </div>
      <div style={styles.weatherMeta}>
        {currentWeather.source}
        {currentWeather.stationName ? ` - ${currentWeather.stationName}` : ""}
        {currentWeather.observedAt
          ? ` - ${formatTimestamp(currentWeather.observedAt)}`
          : ""}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#757575",
    marginBottom: 4,
  },
  weatherRow: { display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 },
  weatherTemp: { fontSize: 22, fontWeight: 700, color: "#212121" },
  weatherDesc: { fontSize: 13, color: "#616161", fontWeight: 500 },
  weatherMeta: { fontSize: 12, color: "#9e9e9e", marginTop: 2 },
};
