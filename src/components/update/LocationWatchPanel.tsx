import type {
  WatchDelivery,
  WatchHazard,
  WatchPreferences,
} from "../../types/location";
import {
  isWatchExpired,
  WATCH_HAZARDS,
  watchExpiration,
  watchPreferencesFor,
} from "../../lib/watchPreferences";
import type { Location } from "../../types/location";

interface LocationWatchPanelProps {
  location: Location;
  onUpdate: (preferences: WatchPreferences) => void;
}

const SEVERITIES: WatchPreferences["minimumSeverity"][] = [
  "Minor",
  "Moderate",
  "Severe",
  "Extreme",
];

function expirationLabel(expiresAt: string): string {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return "Temporary watch";
  return `Until ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric",
  })}`;
}

export function LocationWatchPanel({ location, onUpdate }: LocationWatchPanelProps) {
  const watch = watchPreferencesFor(location);
  const expired = isWatchExpired(watch);

  function update(changes: Partial<WatchPreferences>) {
    onUpdate({ ...watch, ...changes });
  }

  function toggleHazard(hazard: WatchHazard) {
    const selected = watch.hazards.includes(hazard);
    if (selected && watch.hazards.length === 1) return;
    update({
      hazards: selected
        ? watch.hazards.filter((item) => item !== hazard)
        : [...watch.hazards, hazard],
    });
  }

  return (
    <section style={styles.section} aria-labelledby="location-watch-title">
      <div style={styles.headerRow}>
        <div>
          <div id="location-watch-title" style={styles.label}>Risk watch</div>
          <div style={styles.heading}>What should count for this place?</div>
        </div>
        <label style={styles.switchLabel}>
          <input
            type="checkbox"
            checked={watch.enabled && !expired}
            onChange={(event) =>
              update({
                enabled: event.target.checked,
                expiresAt: event.target.checked && expired ? null : watch.expiresAt,
              })
            }
          />
          {watch.enabled && !expired ? "Watching" : expired ? "Expired" : "Paused"}
        </label>
      </div>

      <div style={{ ...styles.controls, opacity: watch.enabled && !expired ? 1 : 0.6 }}>
        <label style={styles.controlLabel}>
          Minimum severity
          <select
            value={watch.minimumSeverity}
            onChange={(event) =>
              update({
                minimumSeverity: event.target.value as WatchPreferences["minimumSeverity"],
              })
            }
            style={styles.select}
          >
            {SEVERITIES.map((severity) => (
              <option key={severity} value={severity}>{severity}</option>
            ))}
          </select>
        </label>
        <label style={styles.controlLabel}>
          Planned delivery
          <select
            value={watch.delivery}
            onChange={(event) => update({ delivery: event.target.value as WatchDelivery })}
            style={styles.select}
          >
            <option value="immediate">As conditions change</option>
            <option value="daily">Daily digest</option>
          </select>
        </label>
      </div>

      <div style={styles.subLabel}>Hazards</div>
      <div style={styles.hazardGrid}>
        {WATCH_HAZARDS.map((hazard) => (
          <label
            key={hazard.id}
            style={{
              ...styles.hazard,
              ...(watch.hazards.includes(hazard.id) ? styles.hazardSelected : {}),
            }}
          >
            <input
              type="checkbox"
              checked={watch.hazards.includes(hazard.id)}
              onChange={() => toggleHazard(hazard.id)}
            />
            {hazard.label}
          </label>
        ))}
      </div>

      <div style={styles.controls}>
        <label style={styles.controlLabel}>
          Watch duration
          <select
            value={watch.expiresAt ? "current" : "permanent"}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "current") return;
              update({ expiresAt: watchExpiration(value === "permanent" ? null : Number(value)) });
            }}
            style={styles.select}
          >
            {watch.expiresAt && (
              <option value="current">{expirationLabel(watch.expiresAt)}</option>
            )}
            <option value="permanent">Until I turn it off</option>
            <option value="7">For 7 days</option>
            <option value="30">For 30 days</option>
            <option value="90">For 90 days</option>
          </select>
        </label>
        <label style={styles.quietToggle}>
          <input
            type="checkbox"
            checked={watch.quietHoursEnabled}
            onChange={(event) => update({ quietHoursEnabled: event.target.checked })}
          />
          Quiet hours (browser time)
        </label>
      </div>
      {watch.quietHoursEnabled && (
        <div style={styles.timeRow}>
          <label style={styles.timeLabel}>
            From
            <input
              type="time"
              value={watch.quietHoursStart}
              onChange={(event) => update({ quietHoursStart: event.target.value })}
              style={styles.timeInput}
            />
          </label>
          <label style={styles.timeLabel}>
            Until
            <input
              type="time"
              value={watch.quietHoursEnd}
              onChange={(event) => update({ quietHoursEnd: event.target.value })}
              style={styles.timeInput}
            />
          </label>
        </div>
      )}

      <div style={styles.note}>
        These settings filter this place’s risk summary and stay in this browser.
        Background notifications are the next delivery step and are not sent yet.
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    borderBottom: "1px solid #eceff1",
    borderTop: "1px solid #eceff1",
    margin: "2px -16px 16px",
    padding: "14px 16px",
  },
  headerRow: {
    alignItems: "flex-start",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  label: {
    color: "#757575",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  heading: { color: "#263238", fontSize: 13, fontWeight: 800, marginTop: 2 },
  switchLabel: {
    alignItems: "center",
    color: "#1565c0",
    display: "flex",
    fontSize: 11,
    fontWeight: 800,
    gap: 5,
    whiteSpace: "nowrap",
  },
  controls: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginTop: 12,
  },
  controlLabel: {
    color: "#616161",
    display: "grid",
    fontSize: 10,
    fontWeight: 700,
    gap: 4,
    minWidth: 0,
  },
  select: {
    background: "#fff",
    border: "1px solid #cfd8dc",
    borderRadius: 4,
    color: "#37474f",
    fontSize: 11,
    minWidth: 0,
    padding: "5px 4px",
    width: "100%",
  },
  subLabel: {
    color: "#616161",
    fontSize: 10,
    fontWeight: 700,
    marginTop: 12,
  },
  hazardGrid: {
    display: "grid",
    gap: 5,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginTop: 5,
  },
  hazard: {
    alignItems: "center",
    background: "#fafafa",
    border: "1px solid #e0e0e0",
    borderRadius: 5,
    color: "#546e7a",
    display: "flex",
    fontSize: 10,
    fontWeight: 700,
    gap: 4,
    padding: "5px 6px",
  },
  hazardSelected: { background: "#e3f2fd", borderColor: "#90caf9", color: "#0d47a1" },
  quietToggle: {
    alignItems: "center",
    alignSelf: "end",
    color: "#546e7a",
    display: "flex",
    fontSize: 11,
    fontWeight: 700,
    gap: 5,
    minHeight: 28,
  },
  timeRow: { display: "flex", gap: 12, marginTop: 8 },
  timeLabel: {
    alignItems: "center",
    color: "#78909c",
    display: "flex",
    fontSize: 10,
    fontWeight: 700,
    gap: 5,
  },
  timeInput: {
    border: "1px solid #cfd8dc",
    borderRadius: 4,
    color: "#455a64",
    fontSize: 11,
    padding: "3px 4px",
  },
  note: {
    background: "#f5f7fa",
    borderRadius: 5,
    color: "#607d8b",
    fontSize: 10,
    lineHeight: 1.4,
    marginTop: 12,
    padding: "7px 8px",
  },
};
