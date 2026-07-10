import { useState } from "react";
import type { ResolvedLocation, RadiusOption, Criticality, LocationType, Location } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import type { SupplementalRiskSignal } from "../types/supplementalRisk";
import type { CurrentWeather } from "../services/weather";
import type { NwsWeatherOverlay } from "../services/nwsWeatherOverlay";
import { weatherLabel } from "../services/weather";
import { formatTimestamp } from "../lib/format";
import { severityColor } from "../lib/riskInsights";

interface UpdatePanelProps {
  location: ResolvedLocation | null;
  radius: RadiusOption;
  onRadiusChange: (r: RadiusOption) => void;
  weatherAlerts: RiskEvent[];
  earthquakes: RiskEvent[];
  femaDeclarations: RiskEvent[];
  wildfires: RiskEvent[];
  spcOutlooks: RiskEvent[];
  nhcStorms: RiskEvent[];
  gdacsEvents: RiskEvent[];
  eonetEvents: RiskEvent[];
  currentWeather: CurrentWeather | null;
  supplementalSignals: SupplementalRiskSignal[];
  weatherOverlay: NwsWeatherOverlay | null;
  showWeatherOverlay: boolean;
  onToggleWeatherOverlay: (show: boolean) => void;
  weatherOverlayLoading: boolean;
  weatherOverlayError: string | null;
  isFetching: boolean;
  lastUpdated: Date | null;
  error: string | null;
  onRefresh: () => void;
  activeSavedLocation: Location | null;
  onSaveLocation: () => void;
  onUpdateLabel: (label: string) => void;
  onUpdateCriticality: (c: Criticality) => void;
  onUpdateType: (t: LocationType) => void;
  onDeleteLocation: () => void;
  isSaving: boolean;
}

function countBySeverity(events: RiskEvent[], ...sevs: string[]): number {
  return events.filter((e) => sevs.includes(e.severity)).length;
}

const CRITICALITIES: Criticality[] = ["Low", "Medium", "High"];
const LOCATION_TYPES: LocationType[] = ["Office", "Supplier", "Data Center", "Travel", "Facility", "Custom"];

export function UpdatePanel({
  location,
  radius,
  onRadiusChange,
  weatherAlerts,
  earthquakes,
  femaDeclarations,
  wildfires,
  spcOutlooks,
  nhcStorms,
  gdacsEvents,
  eonetEvents,
  currentWeather,
  supplementalSignals,
  weatherOverlay,
  showWeatherOverlay,
  onToggleWeatherOverlay,
  weatherOverlayLoading,
  weatherOverlayError,
  isFetching,
  lastUpdated,
  error,
  onRefresh,
  activeSavedLocation,
  onSaveLocation,
  onUpdateLabel,
  onUpdateCriticality,
  onUpdateType,
  onDeleteLocation,
  isSaving,
}: UpdatePanelProps) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");

  const allEvents = [...weatherAlerts, ...earthquakes, ...femaDeclarations, ...wildfires, ...spcOutlooks, ...nhcStorms, ...gdacsEvents, ...eonetEvents];
  const total = allEvents.length;
  const criticalCount = countBySeverity(allEvents, "Extreme", "Severe");
  const moderateCount = countBySeverity(allEvents, "Moderate");
  const airQualitySignals = supplementalSignals.filter((s) => s.category === "Air Quality");
  const marineSignals = supplementalSignals.filter((s) => s.category === "Coastal Water");
  const riverSignals = supplementalSignals.filter((s) => s.category === "River Gauge");
  const shownSupplementalCount =
    airQualitySignals.length + marineSignals.length + riverSignals.length;

  const label = activeSavedLocation?.label ?? (location ? `${location.city}, ${location.state}` : "");
  const criticality = activeSavedLocation?.criticality ?? "Medium";
  const locationType = activeSavedLocation?.locationType ?? "Custom";
  const isSaved = !!activeSavedLocation;

  function handleStartEditLabel() {
    setDraftLabel(label);
    setEditingLabel(true);
  }

  function handleSaveLabel() {
    if (draftLabel.trim()) {
      onUpdateLabel(draftLabel.trim());
    }
    setEditingLabel(false);
  }

  return (
    <aside className="update-panel" style={styles.container}>
      <div style={styles.titleRow}>
        <div>
          <h3 style={styles.title}>OpenRisk Radar</h3>
          <a
            href="https://github.com/SecuritahGuy/openrisk-radar"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.githubLink}
          >
            View source on GitHub ↗
          </a>
        </div>
        <button
          onClick={onRefresh}
          disabled={isFetching || !location}
          style={styles.refreshBtn}
          title="Refresh feeds"
        >
          {isFetching ? "..." : "\u21BB"}
        </button>
      </div>

      {location ? (
        <>
          <div style={styles.section}>
            <div style={styles.label}>Location</div>
            {editingLabel ? (
              <div style={styles.editRow}>
                <input
                  style={styles.editInput}
                  value={draftLabel}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveLabel()}
                  autoFocus
                />
                <button style={styles.editSaveBtn} onClick={handleSaveLabel}>
                  Save
                </button>
              </div>
            ) : (
              <div
                style={styles.value}
                onClick={isSaved ? handleStartEditLabel : undefined}
                title={isSaved ? "Click to edit label" : undefined}
              >
                {label}
              </div>
            )}
            {location.county && (
              <div style={styles.detail}>{location.county}</div>
            )}
            {location.postalCode && (
              <div style={styles.detail}>ZIP {location.postalCode}</div>
            )}
          </div>

          {currentWeather && (
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
          )}

          <div style={styles.section}>
            <div style={styles.label}>Radius</div>
            <div style={styles.radiusRow}>
              {([10, 25, 50, 100] as RadiusOption[]).map((r) => (
                <button
                  key={r}
                  onClick={() => onRadiusChange(r)}
                  style={{
                    ...styles.radiusBtn,
                    ...(r === radius ? styles.radiusBtnActive : {}),
                  }}
                >
                  {r} mi
                </button>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.label}>Map layers</div>
            <label style={styles.toggleRow}>
              <input
                type="checkbox"
                checked={showWeatherOverlay}
                onChange={(e) => onToggleWeatherOverlay(e.target.checked)}
                style={styles.checkbox}
              />
              <span>
                NWS weather grid, zones, and stations
              </span>
            </label>
            {showWeatherOverlay && (
              <div style={styles.detail}>
                {weatherOverlayLoading
                  ? "Loading NWS map layer..."
                  : weatherOverlay
                    ? `${weatherOverlay.stations.length} station observation${weatherOverlay.stations.length !== 1 ? "s" : ""} plus forecast and fire weather zones`
                    : "Waiting for NWS map layer"}
              </div>
            )}
            {showWeatherOverlay && weatherOverlayError && (
              <div style={styles.layerError}>{weatherOverlayError}</div>
            )}
          </div>

          {isSaved && (
            <div style={styles.section}>
              <div style={styles.label}>Properties</div>
              <div style={styles.propRow}>
                <span style={styles.propLabel}>Criticality</span>
                <select
                  value={criticality}
                  onChange={(e) => onUpdateCriticality(e.target.value as Criticality)}
                  style={styles.select}
                >
                  {CRITICALITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div style={styles.propRow}>
                <span style={styles.propLabel}>Type</span>
                <select
                  value={locationType}
                  onChange={(e) => onUpdateType(e.target.value as LocationType)}
                  style={styles.select}
                >
                  {LOCATION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div style={styles.propRow}>
                <span style={styles.propLabel}>Radius</span>
                <select
                  value={radius}
                  onChange={(e) => onRadiusChange(Number(e.target.value) as RadiusOption)}
                  style={styles.select}
                >
                  {([10, 25, 50, 100] as RadiusOption[]).map((r) => (
                    <option key={r} value={r}>{r} mi</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {lastUpdated && (
            <div style={styles.section}>
              <div style={styles.label}>Last checked</div>
              <div style={styles.detail}>
                {formatTimestamp(lastUpdated.toISOString())}
              </div>
            </div>
          )}

          <div style={styles.section}>
            <div style={styles.label}>
              Current signals
              {isFetching && <span style={styles.spinner}> &#8987;</span>}
            </div>
            <div style={styles.signal}>
              <span
                style={{
                  ...styles.signalDot,
                  color: weatherAlerts.length > 0 ? "#f57c00" : "#9e9e9e",
                }}
              >
                &#9679;
              </span>{" "}
              {weatherAlerts.length > 0
                ? `${weatherAlerts.length} active weather alert${weatherAlerts.length !== 1 ? "s" : ""} nearby`
                : "No active weather alerts"}
            </div>
            <div style={styles.signal}>
              <span
                style={{
                  ...styles.signalDot,
                  color: earthquakes.length > 0 ? "#2e7d32" : "#9e9e9e",
                }}
              >
                &#9679;
              </span>{" "}
              {earthquakes.length > 0
                ? `${earthquakes.length} earthquake${earthquakes.length !== 1 ? "s" : ""} nearby`
                : "No earthquakes nearby"}
            </div>
            <div style={styles.signal}>
              <span
                style={{
                  ...styles.signalDot,
                  color: femaDeclarations.length > 0 ? "#7b1fa2" : "#9e9e9e",
                }}
              >
                &#9679;
              </span>{" "}
              {femaDeclarations.length > 0
                ? `${femaDeclarations.length} FEMA disaster declaration${femaDeclarations.length !== 1 ? "s" : ""} on record`
                : "No FEMA disaster declarations on record"}
              {femaDeclarations.length > 0 && (
                <span style={{ fontSize: 10, color: "#9e9e9e", marginLeft: 4 }}>
                  (historical data)
                </span>
              )}
            </div>
            <div style={styles.signal}>
              <span
                style={{
                  ...styles.signalDot,
                  color: wildfires.length > 0 ? "#d84315" : "#9e9e9e",
                }}
              >
                &#9679;
              </span>{" "}
              {wildfires.length > 0
                ? `${wildfires.length} wildfire${wildfires.length !== 1 ? "s" : ""} nearby`
                : "No wildfires nearby"}
            </div>
            <div style={styles.signal}>
              <span
                style={{
                  ...styles.signalDot,
                  color: spcOutlooks.length > 0 ? "#00897b" : "#9e9e9e",
                }}
              >
                &#9679;
              </span>{" "}
              {spcOutlooks.length > 0
                ? `${spcOutlooks.length} SPC outlook polygon${spcOutlooks.length !== 1 ? "s" : ""} nearby`
                : "No SPC outlook polygons nearby"}
            </div>
            <div style={styles.signal}>
              <span
                style={{
                  ...styles.signalDot,
                  color: nhcStorms.length > 0 ? "#c62828" : "#9e9e9e",
                }}
              >
                &#9679;
              </span>{" "}
              {nhcStorms.length > 0
                ? `${nhcStorms.length} active tropical cyclone${nhcStorms.length !== 1 ? "s" : ""} in range`
                : "No active tropical cyclones in range"}
            </div>
            <div style={styles.signal}>
              <span
                style={{
                  ...styles.signalDot,
                  color: gdacsEvents.length > 0 ? "#1565c0" : "#9e9e9e",
                }}
              >
                &#9679;
              </span>{" "}
              {gdacsEvents.length > 0
                ? `${gdacsEvents.length} GDACS global event${gdacsEvents.length !== 1 ? "s" : ""} nearby`
                : "No GDACS global events nearby"}
            </div>
            <div style={styles.signal}>
              <span
                style={{
                  ...styles.signalDot,
                  color: eonetEvents.length > 0 ? "#6a1b9a" : "#9e9e9e",
                }}
              >
                &#9679;
              </span>{" "}
              {eonetEvents.length > 0
                ? `${eonetEvents.length} NASA EONET event${eonetEvents.length !== 1 ? "s" : ""} nearby`
                : "No NASA EONET events nearby"}
            </div>
          </div>

          {supplementalSignals.length > 0 && (
            <div style={styles.section}>
              <div style={styles.label}>Environmental signals</div>
              {airQualitySignals.map((signal) => (
                <SupplementalSignalLine key={signal.id} signal={signal} />
              ))}
              {marineSignals.map((signal) => (
                <SupplementalSignalLine key={signal.id} signal={signal} />
              ))}
              {riverSignals.map((signal) => (
                <SupplementalSignalLine key={signal.id} signal={signal} />
              ))}
              {supplementalSignals.length > shownSupplementalCount && (
                <div style={styles.detail}>
                  {supplementalSignals.length - shownSupplementalCount} additional supplemental signal
                  {supplementalSignals.length - shownSupplementalCount !== 1 ? "s" : ""}
                </div>
              )}
              <div style={styles.detail}>
                Sources: {[airQualitySignals.length || marineSignals.length ? "Open-Meteo" : null, riverSignals.length ? "USGS Water" : null].filter(Boolean).join(", ")}
              </div>
            </div>
          )}

          {total > 0 && (
            <div style={styles.section}>
              <div style={styles.label}>Potential impact</div>
              {criticalCount > 0 && (
                <div style={{ ...styles.impactLine, color: "#d32f2f" }}>
                  {criticalCount} critical/severe event
                  {criticalCount !== 1 ? "s" : ""} within {radius} miles
                </div>
              )}
              {moderateCount > 0 && (
                <div style={{ ...styles.impactLine, color: "#f57c00" }}>
                  {moderateCount} moderate event
                  {moderateCount !== 1 ? "s" : ""} within {radius} miles
                </div>
              )}
              {criticalCount === 0 && moderateCount === 0 && (
                <div style={styles.detail}>
                  No critical or moderate events detected
                </div>
              )}
            </div>
          )}

          {error && (
            <div style={styles.section}>
              <div style={{ ...styles.label, color: "#c62828" }}>
                Feed errors
              </div>
              <div style={{ fontSize: 12, color: "#c62828" }}>{error}</div>
            </div>
          )}

          <div style={styles.actionRow}>
            {isSaved ? (
              <button onClick={onDeleteLocation} style={styles.deleteBtn2}>
                Remove saved location
              </button>
            ) : (
              <button
                onClick={onSaveLocation}
                disabled={isSaving}
                style={styles.saveBtn}
              >
                {isSaving ? "Saving..." : "+ Save Location"}
              </button>
            )}
          </div>
        </>
      ) : (
        <div style={styles.placeholder}>
          Enter a ZIP code or city, state above to begin.
        </div>
      )}
    </aside>
  );
}

function SupplementalSignalLine({ signal }: { signal: SupplementalRiskSignal }) {
  const metricSummary = signal.metrics
    .slice(0, 3)
    .map((metric) => `${metric.label} ${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`)
    .join(" · ");

  return (
    <div style={styles.supplementalLine}>
      <span
        style={{
          ...styles.signalDot,
          color: severityColor(signal.severity),
        }}
      >
        &#9679;
      </span>{" "}
      <span style={styles.supplementalHeadline}>{signal.headline}</span>
      {metricSummary && (
        <div style={styles.supplementalMetrics}>{metricSummary}</div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: 320,
    background: "#fff",
    borderLeft: "1px solid #e0e0e0",
    padding: 16,
    overflowY: "auto",
    fontFamily: "system-ui, sans-serif",
  },
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#1565c0",
  },
  githubLink: {
    display: "inline-block",
    marginTop: 3,
    fontSize: 11,
    color: "#607d8b",
    textDecoration: "none",
    fontWeight: 600,
  },
  refreshBtn: {
    padding: "4px 10px",
    fontSize: 16,
    border: "1px solid #bdbdbd",
    borderRadius: 4,
    background: "#fafafa",
    cursor: "pointer",
    color: "#424242",
  },
  section: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#757575",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: 600,
    color: "#212121",
    cursor: "pointer",
  },
  detail: { fontSize: 13, color: "#616161", marginTop: 2 },
  radiusRow: { display: "flex", gap: 6, marginTop: 4 },
  radiusBtn: {
    padding: "4px 12px",
    fontSize: 12,
    border: "1px solid #bdbdbd",
    borderRadius: 4,
    background: "#fafafa",
    cursor: "pointer",
    fontWeight: 600,
    color: "#424242",
  },
  radiusBtnActive: {
    background: "#1565c0",
    color: "#fff",
    borderColor: "#1565c0",
  },
  editRow: { display: "flex", gap: 4, marginTop: 4 },
  editInput: {
    flex: 1,
    padding: "4px 8px",
    fontSize: 14,
    border: "1px solid #1565c0",
    borderRadius: 4,
    outline: "none",
  },
  editSaveBtn: {
    padding: "4px 10px",
    fontSize: 12,
    background: "#1565c0",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  propRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  propLabel: { fontSize: 13, color: "#616161" },
  select: {
    fontSize: 12,
    padding: "2px 6px",
    border: "1px solid #bdbdbd",
    borderRadius: 4,
    background: "#fff",
  },
  signal: {
    fontSize: 13,
    color: "#616161",
    marginTop: 4,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  signalDot: { fontSize: 10 },
  supplementalLine: {
    fontSize: 13,
    color: "#424242",
    marginTop: 8,
  },
  supplementalHeadline: {
    fontWeight: 600,
  },
  supplementalMetrics: {
    fontSize: 11,
    color: "#757575",
    marginLeft: 16,
    marginTop: 2,
  },
  spinner: { fontSize: 13 },
  impactLine: { fontSize: 13, fontWeight: 600, marginTop: 4 },
  weatherRow: { display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 },
  weatherTemp: { fontSize: 22, fontWeight: 700, color: "#212121" },
  weatherDesc: { fontSize: 13, color: "#616161", fontWeight: 500 },
  weatherMeta: { fontSize: 12, color: "#9e9e9e", marginTop: 2 },
  toggleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13,
    color: "#424242",
    cursor: "pointer",
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: "#1565c0",
  },
  layerError: {
    fontSize: 12,
    color: "#c62828",
    marginTop: 4,
  },
  placeholder: {
    fontSize: 14,
    color: "#9e9e9e",
    textAlign: "center",
    marginTop: 40,
  },
  actionRow: { marginTop: 16, borderTop: "1px solid #e0e0e0", paddingTop: 12 },
  saveBtn: {
    width: "100%",
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    background: "#1565c0",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  deleteBtn2: {
    width: "100%",
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    background: "#fff",
    color: "#c62828",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    cursor: "pointer",
  },
};
