import type { RadiusOption, ResolvedLocation } from "../../types/location";
import type { RiskEvent } from "../../types/riskEvent";
import { buildImpactSeveritySummary } from "../../lib/impactInsights";

interface ImpactSummaryPanelProps {
  events: RiskEvent[];
  location: ResolvedLocation;
  radius: RadiusOption;
}

export function ImpactSummaryPanel({ events, location, radius }: ImpactSummaryPanelProps) {
  if (events.length === 0) return null;

  const { criticalCount, moderateCount } = buildImpactSeveritySummary(
    events,
    location,
    radius
  );

  return (
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
          No current critical or moderate events within {radius} miles
        </div>
      )}
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
  detail: { fontSize: 13, color: "#616161", marginTop: 2 },
  impactLine: { fontSize: 13, fontWeight: 600, marginTop: 4 },
};
