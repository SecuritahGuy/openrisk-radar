import type { RadiusOption, ResolvedLocation } from "../../types/location";
import type { RiskEvent } from "../../types/riskEvent";
import { buildActionGuidance } from "../../lib/actionGuidance";

export function ActionGuidancePanel({
  events,
  location,
  radius,
  onEventClick,
}: {
  events: RiskEvent[];
  location: ResolvedLocation;
  radius: RadiusOption;
  onEventClick: (event: RiskEvent) => void;
}) {
  const guidance = buildActionGuidance(events, location, radius);
  const colors = {
    act: { background: "#ffebee", border: "#c62828", text: "#8e0000" },
    prepare: { background: "#fff3e0", border: "#ef6c00", text: "#9a3f00" },
    monitor: { background: "#fffde7", border: "#f9a825", text: "#6d5700" },
    clear: { background: "#e8f5e9", border: "#2e7d32", text: "#1b5e20" },
  }[guidance.level];

  return (
    <section
      aria-label="Recommended action"
      style={{
        ...styles.section,
        background: colors.background,
        borderLeftColor: colors.border,
      }}
    >
      <div style={styles.label}>What this means</div>
      <div style={{ ...styles.title, color: colors.text }}>{guidance.title}</div>
      <div style={styles.detail}>{guidance.detail}</div>
      {guidance.sourceEvent?.url ? (
        <div style={styles.actions}>
          <button
            type="button"
            style={styles.button}
            onClick={() => onEventClick(guidance.sourceEvent!)}
          >
            View signal
          </button>
          <a
            href={guidance.sourceEvent.url}
            target="_blank"
            rel="noreferrer"
            style={styles.link}
          >
            Official source ↗
          </a>
        </div>
      ) : null}
      <div style={styles.disclaimer}>Supplemental information—always follow official instructions.</div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { borderLeft: "4px solid", borderRadius: 6, padding: 12, marginBottom: 16 },
  label: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#616161" },
  title: { fontSize: 15, fontWeight: 800, marginTop: 3 },
  detail: { fontSize: 13, lineHeight: 1.45, color: "#424242", marginTop: 5 },
  actions: { display: "flex", alignItems: "center", gap: 10, marginTop: 9 },
  button: { border: "1px solid #bdbdbd", borderRadius: 4, background: "#fff", padding: "5px 8px", cursor: "pointer" },
  link: { fontSize: 12, fontWeight: 700, color: "#1565c0" },
  disclaimer: { fontSize: 10, color: "#616161", marginTop: 9 },
};
