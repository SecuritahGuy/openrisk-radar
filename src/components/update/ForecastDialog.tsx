import { useEffect, useMemo, useState } from "react";
import type { CurrentWeather, WeatherForecastPeriod } from "../../services/weather";
import type { ResolvedLocation } from "../../types/location";
import { formatTimestamp } from "../../lib/format";
import { compassDirection, forecastDateKey } from "../../lib/forecastFormat";
import { ModalDialog } from "../ModalDialog";

interface ForecastDialogProps {
  currentWeather: CurrentWeather;
  location: ResolvedLocation;
  onClose: () => void;
}

function parseForecastTime(iso: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00` : iso);
}

function dayLabel(iso: string, long = false): string {
  const date = parseForecastTime(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-US", long
    ? { weekday: "long", month: "long", day: "numeric" }
    : { weekday: "short", month: "short", day: "numeric" });
}

function timeLabel(iso: string): string {
  const date = parseForecastTime(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString("en-US", { hour: "numeric" });
}

function Metric({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div style={styles.metric}>
      <span style={styles.metricLabel}>{label}</span>
      <strong style={styles.metricValue}>{value}</strong>
    </div>
  );
}

function forecastMetrics(period: WeatherForecastPeriod) {
  const direction = compassDirection(period.windDirection);
  return [
    {
      label: "High / low",
      value: `${Math.round(period.temperature)}°${period.temperatureLow != null ? ` / ${Math.round(period.temperatureLow)}°` : ""}`,
    },
    {
      label: "Feels like",
      value: period.apparentTemperature != null
        ? `${Math.round(period.apparentTemperature)}°${period.apparentTemperatureLow != null ? ` / ${Math.round(period.apparentTemperatureLow)}°` : ""}`
        : null,
    },
    {
      label: "Precipitation",
      value: period.precipitationChance != null
        ? `${Math.round(period.precipitationChance)}% chance`
        : null,
    },
    {
      label: "Expected total",
      value: period.precipitationAmount != null
        ? `${period.precipitationAmount.toFixed(2)} in`
        : null,
    },
    {
      label: "Snowfall",
      value: period.snowfallAmount != null && period.snowfallAmount > 0
        ? `${period.snowfallAmount.toFixed(1)} in`
        : null,
    },
    {
      label: "Wind",
      value: `${direction ? `${direction} ` : ""}${Math.round(period.windSpeed)} mph`,
    },
    {
      label: "Peak gust",
      value: period.windGust != null ? `${Math.round(period.windGust)} mph` : null,
    },
    {
      label: "Humidity",
      value: period.humidity != null ? `${Math.round(period.humidity)}%` : null,
    },
    {
      label: "UV index",
      value: period.uvIndex != null ? period.uvIndex.toFixed(1) : null,
    },
    {
      label: "Sunrise / sunset",
      value: period.sunrise && period.sunset
        ? `${timeLabel(period.sunrise)} / ${timeLabel(period.sunset)}`
        : null,
    },
  ];
}

export function ForecastDialog({
  currentWeather,
  location,
  onClose,
}: ForecastDialogProps) {
  const forecast = currentWeather.forecast.slice(0, 5);
  const [selectedDate, setSelectedDate] = useState(
    forecastDateKey(forecast[0]?.startTime ?? "")
  );

  useEffect(() => {
    const firstDate = forecastDateKey(forecast[0]?.startTime ?? "");
    if (firstDate && !forecast.some((period) => forecastDateKey(period.startTime) === selectedDate)) {
      setSelectedDate(firstDate);
    }
  }, [forecast, selectedDate]);

  const selectedPeriod = forecast.find(
    (period) => forecastDateKey(period.startTime) === selectedDate
  ) ?? forecast[0];
  const hourlyPeriods = useMemo(
    () => currentWeather.hourlyForecast
      .filter((period) => forecastDateKey(period.startTime) === selectedDate)
      .filter((_, index) => index % 3 === 0),
    [currentWeather.hourlyForecast, selectedDate]
  );

  return (
    <ModalDialog
      titleId="forecast-dialog-title"
      onClose={onClose}
      panelClassName="forecast-dialog-panel"
      panelStyle={styles.panel}
    >
      <header className="forecast-dialog-header" style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Weather outlook</div>
          <h2
            id="forecast-dialog-title"
            data-modal-initial-focus
            tabIndex={-1}
            style={styles.title}
          >
            5-day forecast
          </h2>
          <div style={styles.subtitle}>
            {location.city}, {location.state} · {currentWeather.source}
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close 5-day forecast"
          style={styles.closeButton}
        >
          &times;
        </button>
      </header>

      <div className="forecast-dialog-body" style={styles.body}>
        <div style={styles.updateLine}>
          {currentWeather.observedAt
            ? `Data current as of ${formatTimestamp(currentWeather.observedAt)}`
            : "Latest available forecast"}
          <span aria-hidden="true"> · </span>
          <span>Scroll for hourly details</span>
        </div>

        <div className="forecast-day-grid" style={styles.dayGrid} aria-label="Forecast days">
          {forecast.map((period) => {
            const key = forecastDateKey(period.startTime);
            const selected = key === selectedDate;
            return (
              <button
                type="button"
                key={period.startTime}
                aria-pressed={selected}
                onClick={() => setSelectedDate(key)}
                className="forecast-day-button"
                style={{
                  ...styles.dayButton,
                  ...(selected ? styles.dayButtonSelected : {}),
                }}
              >
                <span style={styles.dayName}>{dayLabel(period.startTime)}</span>
                <strong style={styles.dayTemperature}>
                  {Math.round(period.temperature)}°
                  {period.temperatureLow != null ? ` / ${Math.round(period.temperatureLow)}°` : ""}
                </strong>
                <span style={styles.dayCondition}>{period.shortForecast}</span>
                <span style={styles.dayPrecipitation}>
                  {period.precipitationChance != null
                    ? `${Math.round(period.precipitationChance)}% precip`
                    : "Precip unavailable"}
                </span>
              </button>
            );
          })}
        </div>

        {selectedPeriod ? (
          <section style={styles.section} aria-labelledby="selected-day-heading">
            <div style={styles.sectionHeadingRow}>
              <div>
                <div style={styles.sectionLabel}>Selected day</div>
                <h3 id="selected-day-heading" style={styles.sectionTitle}>
                  {dayLabel(selectedPeriod.startTime, true)}
                </h3>
              </div>
              <strong style={styles.condition}>{selectedPeriod.shortForecast}</strong>
            </div>

            {selectedPeriod.detailedForecast ? (
              <p style={styles.narrative}>{selectedPeriod.detailedForecast}</p>
            ) : null}

            <div className="forecast-metric-grid" style={styles.metricGrid}>
              {forecastMetrics(selectedPeriod).map((metric) => (
                <Metric key={metric.label} label={metric.label} value={metric.value} />
              ))}
            </div>
          </section>
        ) : null}

        <section style={styles.section} aria-labelledby="hourly-heading">
          <div style={styles.sectionLabel}>Three-hour intervals</div>
          <h3 id="hourly-heading" style={styles.sectionTitle}>Hourly outlook</h3>
          {hourlyPeriods.length > 0 ? (
            <div className="forecast-hourly-grid" style={styles.hourlyGrid}>
              {hourlyPeriods.map((period) => (
                <div key={period.startTime} style={styles.hourlyCard}>
                  <strong style={styles.hourlyTime}>{timeLabel(period.startTime)}</strong>
                  <span style={styles.hourlyTemperature}>{Math.round(period.temperature)}°</span>
                  <span style={styles.hourlyCondition}>{period.shortForecast}</span>
                  <span>{Math.round(period.precipitationChance ?? 0)}% precip</span>
                  <span>
                    {Math.round(period.windSpeed)} mph wind
                    {period.windGust != null ? ` · ${Math.round(period.windGust)} gusts` : ""}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p style={styles.unavailable}>Hourly details are unavailable for this day.</p>
          )}
        </section>

        <div style={styles.sourceNote}>
          Forecasts describe expected conditions and may change. Follow active official alerts for urgent instructions.
        </div>
      </div>
    </ModalDialog>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    maxWidth: 840,
    padding: 0,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    alignItems: "flex-start",
    borderBottom: "1px solid #e3e9ef",
    display: "flex",
    flex: "0 0 auto",
    justifyContent: "space-between",
    padding: "18px 22px 16px",
  },
  eyebrow: {
    color: "#546e7a",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
  },
  title: {
    color: "#212121",
    fontSize: 22,
    lineHeight: 1.2,
    margin: "3px 0 2px",
    outline: "none",
  },
  subtitle: { color: "#546e7a", fontSize: 12, fontWeight: 600 },
  closeButton: {
    alignItems: "center",
    background: "#f7f9fb",
    border: "1px solid #d7e0e7",
    borderRadius: 8,
    color: "#546e7a",
    cursor: "pointer",
    display: "flex",
    fontSize: 24,
    height: 44,
    justifyContent: "center",
    lineHeight: 1,
    width: 44,
  },
  body: { overflowY: "auto", padding: "16px 22px 22px" },
  updateLine: { color: "#546e7a", fontSize: 11, marginBottom: 12 },
  dayGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  },
  dayButton: {
    background: "#f7f9fb",
    borderColor: "#dce5ec",
    borderStyle: "solid",
    borderWidth: 1,
    borderRadius: 9,
    color: "#37474f",
    cursor: "pointer",
    display: "grid",
    gap: 4,
    minWidth: 0,
    padding: "10px",
    textAlign: "left",
  },
  dayButtonSelected: {
    background: "#eaf4ff",
    borderColor: "#1976d2",
    boxShadow: "inset 0 0 0 1px #1976d2",
  },
  dayName: { color: "#546e7a", fontSize: 10, fontWeight: 800, textTransform: "uppercase" },
  dayTemperature: { color: "#263238", fontSize: 17 },
  dayCondition: { fontSize: 11, lineHeight: 1.25, minHeight: 28 },
  dayPrecipitation: { color: "#1565c0", fontSize: 10, fontWeight: 700 },
  section: { borderTop: "1px solid #e7edf2", marginTop: 18, paddingTop: 16 },
  sectionHeadingRow: { alignItems: "flex-start", display: "flex", gap: 16, justifyContent: "space-between" },
  sectionLabel: { color: "#546e7a", fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" },
  sectionTitle: { color: "#263238", fontSize: 16, margin: "2px 0 0" },
  condition: { color: "#1565c0", fontSize: 12, textAlign: "right" },
  narrative: { color: "#455a64", fontSize: 13, lineHeight: 1.5, margin: "10px 0 0" },
  metricGrid: { display: "grid", gap: 8, gridTemplateColumns: "repeat(5, minmax(0, 1fr))", marginTop: 12 },
  metric: { background: "#f8fafb", border: "1px solid #e4eaef", borderRadius: 8, display: "grid", gap: 3, padding: "9px" },
  metricLabel: { color: "#546e7a", fontSize: 9, fontWeight: 800, textTransform: "uppercase" },
  metricValue: { color: "#37474f", fontSize: 12 },
  hourlyGrid: { display: "grid", gap: 8, gridTemplateColumns: "repeat(4, minmax(0, 1fr))", marginTop: 10 },
  hourlyCard: { background: "#fff", border: "1px solid #dfe7ed", borderRadius: 8, color: "#455a64", display: "grid", fontSize: 10, gap: 3, padding: "10px" },
  hourlyTime: { color: "#263238", fontSize: 12 },
  hourlyTemperature: { color: "#1565c0", fontSize: 18, fontWeight: 800 },
  hourlyCondition: { color: "#455a64", fontWeight: 700, minHeight: 26 },
  unavailable: { color: "#546e7a", fontSize: 12, marginTop: 8 },
  sourceNote: { background: "#eef6ff", border: "1px solid #cfe3f6", borderRadius: 8, color: "#36566f", fontSize: 11, lineHeight: 1.45, marginTop: 18, padding: "10px" },
};
