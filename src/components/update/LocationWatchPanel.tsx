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
import { pushCapability } from "../../services/pushNotifications";

interface LocationWatchPanelProps {
  location: Location;
  onUpdate: (preferences: WatchPreferences) => void;
  cloudWatchBusy: boolean;
  cloudWatchError: string | null;
  onEnableCloudWatch: () => void;
  onRefreshCloudWatch: () => void;
  onDisableCloudWatch: () => void;
  onEnablePush: () => void;
  onTestPush: () => void;
  onDisablePush: () => void;
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

function formatCloudTime(value: string | null): string {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LocationWatchPanel({
  location,
  onUpdate,
  cloudWatchBusy,
  cloudWatchError,
  onEnableCloudWatch,
  onRefreshCloudWatch,
  onDisableCloudWatch,
  onEnablePush,
  onTestPush,
  onDisablePush,
}: LocationWatchPanelProps) {
  const watch = watchPreferencesFor(location);
  const expired = isWatchExpired(watch);
  const cloudWatch = location.cloudWatch;
  const capability = pushCapability();

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
        These settings filter this place’s risk summary. Cloud checks and browser
        notification testing below are optional and require separate opt in.
      </div>

      <div style={styles.cloudCard}>
        <div style={styles.cloudHeader}>
          <div>
            <div style={styles.cloudTitle}>Cloud audit preview</div>
            <div style={styles.cloudSubtitle}>
              {cloudWatch
                ? "Cloudflare checks this watch even when the site is closed."
                : "Optionally test background matching before notifications launch."}
            </div>
          </div>
          {cloudWatch && (
            <span style={{
              ...styles.cloudStatus,
              ...(cloudWatch.status === "error" ? styles.cloudStatusError : {}),
            }}>
              {cloudWatch.status === "error" ? "Needs attention" : cloudWatch.status}
            </span>
          )}
        </div>

        {cloudWatch ? (
          <>
            <div style={styles.cloudMetrics}>
              <div>
                <span style={styles.cloudMetricLabel}>Last checked</span>
                <span style={styles.cloudMetricValue}>{formatCloudTime(cloudWatch.lastCheckedAt)}</span>
              </div>
              <div>
                <span style={styles.cloudMetricLabel}>Next check</span>
                <span style={styles.cloudMetricValue}>{formatCloudTime(cloudWatch.nextCheckAt)}</span>
              </div>
              <div>
                <span style={styles.cloudMetricLabel}>Matches</span>
                <span style={styles.cloudMetricValue}>{cloudWatch.lastMatchCount}</span>
              </div>
            </div>
            {cloudWatch.latestAudit && (
              <div style={styles.auditResult}>
                <strong>
                  {cloudWatch.latestAudit.wouldNotify
                    ? "Would notify"
                    : cloudWatch.latestAudit.kind === "baseline"
                      ? "Baseline established"
                      : cloudWatch.latestAudit.kind === "error"
                        ? "Audit check failed"
                        : "No notification"}
                </strong>
                {cloudWatch.latestAudit.topHeadline
                  ? ` · ${cloudWatch.latestAudit.topHeadline}`
                  : cloudWatch.latestAudit.detail
                    ? ` · ${cloudWatch.latestAudit.detail}`
                    : ""}
              </div>
            )}
            {(cloudWatch.lastError || cloudWatchError) && (
              <div role="alert" style={styles.cloudError}>
                {cloudWatchError ?? cloudWatch.lastError}
              </div>
            )}
            <div style={styles.cloudActions}>
              <button
                type="button"
                style={styles.cloudButton}
                disabled={cloudWatchBusy}
                onClick={onRefreshCloudWatch}
              >
                {cloudWatchBusy ? "Working..." : "Refresh status"}
              </button>
              <button
                type="button"
                style={styles.cloudRemoveButton}
                disabled={cloudWatchBusy}
                onClick={onDisableCloudWatch}
              >
                Remove cloud copy
              </button>
            </div>
            <div style={styles.pushCard}>
              <div style={styles.pushHeader}>
                <div>
                  <div style={styles.pushTitle}>Browser notifications</div>
                  <div style={styles.pushSubtitle}>
                    Opt in on this device, then send a test. Automatic risk updates are in a controlled rollout.
                  </div>
                </div>
                <span style={styles.testBadge}>Canary</span>
              </div>
              {cloudWatch.pushNotification ? (
                <>
                  <div style={styles.pushReady}>
                    {cloudWatch.pushNotification.status === "active" ? "Device ready" : "Device needs to be enabled again"}
                    {cloudWatch.pushNotification.lastTestStatus
                      ? ` · Last test ${cloudWatch.pushNotification.lastTestStatus}`
                      : ""}
                  </div>
                  {cloudWatch.pushNotification.lastError && (
                    <div role="alert" style={styles.cloudError}>{cloudWatch.pushNotification.lastError}</div>
                  )}
                  <div style={styles.cloudActions}>
                    <button type="button" style={styles.pushButton} disabled={cloudWatchBusy} onClick={onTestPush}>
                      {cloudWatchBusy ? "Sending..." : "Send test"}
                    </button>
                    <button type="button" style={styles.cloudRemoveButton} disabled={cloudWatchBusy} onClick={onDisablePush}>
                      Disable on this watch
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={styles.pushNote}>
                    {capability.reason ?? "Your browser will ask for permission only after you choose Enable notifications."}
                  </div>
                  <button
                    type="button"
                    style={styles.pushButton}
                    disabled={cloudWatchBusy || !capability.supported || capability.permission === "denied"}
                    onClick={onEnablePush}
                  >
                    Enable notifications
                  </button>
                </>
              )}
              <div style={styles.pushSafety}>
                Automated hazard alerts remain off while delivery is validated.
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={styles.cloudPrivacy}>
              Sends rounded coordinates, radius, timezone, and watch preferences.
              No label, email, or account identity is stored. NWS, USGS, and NIFC
              are included in this audit phase.
            </div>
            {cloudWatchError && <div role="alert" style={styles.cloudError}>{cloudWatchError}</div>}
            <button
              type="button"
              style={styles.enableCloudButton}
              disabled={cloudWatchBusy}
              onClick={onEnableCloudWatch}
            >
              {cloudWatchBusy ? "Enabling..." : "Enable cloud audit"}
            </button>
          </>
        )}
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
    color: "#616161",
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
    color: "#546e7a",
    fontSize: 10,
    lineHeight: 1.4,
    marginTop: 12,
    padding: "7px 8px",
  },
  cloudCard: {
    border: "1px solid #c5e1a5",
    borderRadius: 7,
    marginTop: 12,
    padding: 10,
  },
  cloudHeader: { alignItems: "flex-start", display: "flex", gap: 8, justifyContent: "space-between" },
  cloudTitle: { color: "#33691e", fontSize: 12, fontWeight: 900 },
  cloudSubtitle: { color: "#546e7a", fontSize: 10, lineHeight: 1.35, marginTop: 2 },
  cloudStatus: {
    background: "#e8f5e9",
    borderRadius: 999,
    color: "#2e7d32",
    fontSize: 9,
    fontWeight: 900,
    padding: "3px 6px",
    textTransform: "capitalize",
    whiteSpace: "nowrap",
  },
  cloudStatusError: { background: "#ffebee", color: "#c62828" },
  cloudMetrics: {
    display: "grid",
    gap: 6,
    gridTemplateColumns: "1fr 1fr auto",
    marginTop: 10,
  },
  cloudMetricLabel: { color: "#78909c", display: "block", fontSize: 9, fontWeight: 700 },
  cloudMetricValue: { color: "#37474f", display: "block", fontSize: 10, fontWeight: 800, marginTop: 2 },
  auditResult: {
    background: "#f1f8e9",
    borderRadius: 5,
    color: "#455a64",
    fontSize: 10,
    lineHeight: 1.4,
    marginTop: 9,
    padding: "6px 7px",
  },
  cloudPrivacy: { color: "#546e7a", fontSize: 10, lineHeight: 1.45, marginTop: 9 },
  cloudError: { color: "#c62828", fontSize: 10, fontWeight: 700, lineHeight: 1.35, marginTop: 8 },
  cloudActions: { display: "flex", gap: 6, marginTop: 9 },
  cloudButton: {
    background: "#fff",
    border: "1px solid #9ccc65",
    borderRadius: 5,
    color: "#33691e",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 800,
    padding: "6px 8px",
  },
  cloudRemoveButton: {
    background: "transparent",
    border: "none",
    color: "#78909c",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 700,
    padding: "6px 4px",
  },
  enableCloudButton: {
    background: "#558b2f",
    border: "none",
    borderRadius: 5,
    color: "#fff",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 900,
    marginTop: 9,
    padding: "7px 9px",
  },
  pushCard: {
    background: "#f7fbff",
    border: "1px solid #bbdefb",
    borderRadius: 6,
    marginTop: 10,
    padding: 9,
  },
  pushHeader: { alignItems: "flex-start", display: "flex", gap: 8, justifyContent: "space-between" },
  pushTitle: { color: "#0d47a1", fontSize: 11, fontWeight: 900 },
  pushSubtitle: { color: "#546e7a", fontSize: 9, lineHeight: 1.35, marginTop: 2 },
  testBadge: {
    background: "#fff3e0",
    borderRadius: 999,
    color: "#e65100",
    fontSize: 8,
    fontWeight: 900,
    padding: "3px 6px",
    whiteSpace: "nowrap",
  },
  pushReady: { color: "#2e7d32", fontSize: 10, fontWeight: 800, marginTop: 8 },
  pushNote: { color: "#546e7a", fontSize: 10, lineHeight: 1.4, marginTop: 7 },
  pushSafety: { color: "#78909c", fontSize: 9, lineHeight: 1.35, marginTop: 7 },
  pushButton: {
    background: "#1565c0",
    border: "none",
    borderRadius: 5,
    color: "#fff",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 900,
    marginTop: 8,
    padding: "6px 8px",
  },
};
