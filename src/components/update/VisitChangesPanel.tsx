import type { ResolvedLocation } from "../../types/location";
import type { RiskEvent } from "../../types/riskEvent";
import { useVisitChanges } from "../../hooks/useVisitChanges";

export function VisitChangesPanel({
  location,
  events,
  isFetching,
}: {
  location: ResolvedLocation;
  events: RiskEvent[];
  isFetching: boolean;
}) {
  const changes = useVisitChanges(location, events, isFetching);
  if (!changes.ready) return null;

  const parts = [
    changes.newCount ? `${changes.newCount} new` : null,
    changes.escalatedCount ? `${changes.escalatedCount} escalated` : null,
    changes.updatedCount ? `${changes.updatedCount} updated` : null,
    changes.resolvedCount ? `${changes.resolvedCount} resolved` : null,
  ].filter(Boolean);

  return (
    <div style={styles.section}>
      <div style={styles.label}>Since your last visit</div>
      <div style={styles.value}>
        {changes.firstVisit
          ? "Tracking this location for your next visit."
          : parts.length > 0
            ? parts.join(" · ")
            : "No meaningful signal changes."}
      </div>
      <div style={styles.detail}>Stored only in this browser.</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginBottom: 16, padding: 10, borderRadius: 8, background: "#f7f9fb" },
  label: { fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#546e7a" },
  value: { marginTop: 4, fontSize: 13, fontWeight: 700, color: "#263238" },
  detail: { marginTop: 3, fontSize: 11, color: "#78909c" },
};
