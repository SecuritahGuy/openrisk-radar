import type { RadiusOption } from "../../types/location";
import type { NwsWeatherOverlay } from "../../services/nwsWeatherOverlay";

interface MapLayerControlsProps {
  radius: RadiusOption;
  onRadiusChange: (radius: RadiusOption) => void;
  weatherOverlay: NwsWeatherOverlay | null;
  showWeatherOverlay: boolean;
  onToggleWeatherOverlay: (show: boolean) => void;
  weatherOverlayLoading: boolean;
  weatherOverlayError: string | null;
}

export function MapLayerControls({
  radius,
  onRadiusChange,
  weatherOverlay,
  showWeatherOverlay,
  onToggleWeatherOverlay,
  weatherOverlayLoading,
  weatherOverlayError,
}: MapLayerControlsProps) {
  return (
    <>
      <div style={styles.section}>
        <div style={styles.label}>Radius</div>
        <div style={styles.radiusRow}>
          {([10, 25, 50, 100] as RadiusOption[]).map((option) => (
            <button
              key={option}
              onClick={() => onRadiusChange(option)}
              style={{
                ...styles.radiusBtn,
                ...(option === radius ? styles.radiusBtnActive : {}),
              }}
            >
              {option} mi
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
            onChange={(event) => onToggleWeatherOverlay(event.target.checked)}
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
    </>
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
};
