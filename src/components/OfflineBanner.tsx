import type { ResolvedLocation } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import { useOfflineSnapshot } from "../hooks/useOfflineSnapshot";
import { formatTimestamp } from "../lib/format";

export function OfflineBanner({
  location,
  events,
  isFetching,
}: {
  location: ResolvedLocation | null;
  events: RiskEvent[];
  isFetching: boolean;
}) {
  const { online, snapshot } = useOfflineSnapshot(location, events, isFetching);
  if (online) return null;

  return (
    <div role="status" style={styles.banner}>
      <strong>Offline—live feeds are unavailable.</strong>{" "}
      {snapshot
        ? `Last successful snapshot: ${formatTimestamp(snapshot.savedAt)} · ${snapshot.level} · ${snapshot.activeCount} active signal${snapshot.activeCount !== 1 ? "s" : ""}${snapshot.headlines[0] ? ` · ${snapshot.headlines[0]}` : ""}.`
        : "No saved snapshot is available for this location."}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  banner: {
    padding: "9px 12px",
    background: "#fff3e0",
    borderBottom: "1px solid #ffcc80",
    color: "#7a3e00",
    fontSize: 12,
    lineHeight: 1.4,
  },
};
