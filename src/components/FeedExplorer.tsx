import { useMemo, useState } from "react";
import type { ResolvedLocation } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import {
  distanceMiles,
  expiresLabel,
  formatDistance,
  severityColor,
  severityRank,
  sourceColor,
} from "../lib/riskInsights";

interface FeedExplorerProps {
  events: RiskEvent[];
  totalEvents: number;
  location: ResolvedLocation | null;
  isFetching: boolean;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onEventClick?: (event: RiskEvent) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type SortMode = "priority" | "updated" | "distance" | "expires";

function expiryMinutes(event: RiskEvent): number {
  if (!event.expiresAt) return Number.POSITIVE_INFINITY;
  const value = new Date(event.expiresAt).getTime();
  if (Number.isNaN(value)) return Number.POSITIVE_INFINITY;
  return Math.max(0, Math.round((value - Date.now()) / 60_000));
}

export function FeedExplorer({
  events,
  totalEvents,
  location,
  isFetching,
  collapsed = false,
  onCollapsedChange,
  onEventClick,
}: FeedExplorerProps) {
  const [sortMode, setSortMode] = useState<SortMode>("priority");
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (sortMode === "updated") {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortMode === "distance") {
        const aDistance = distanceMiles(location, a) ?? Number.POSITIVE_INFINITY;
        const bDistance = distanceMiles(location, b) ?? Number.POSITIVE_INFINITY;
        return aDistance - bDistance;
      }
      if (sortMode === "expires") {
        return expiryMinutes(a) - expiryMinutes(b);
      }

      const severityDelta = severityRank(b.severity) - severityRank(a.severity);
      if (severityDelta !== 0) return severityDelta;
      const aDistance = distanceMiles(location, a) ?? Number.POSITIVE_INFINITY;
      const bDistance = distanceMiles(location, b) ?? Number.POSITIVE_INFINITY;
      if (aDistance !== bDistance) return aDistance - bDistance;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [events, location, sortMode]);

  const hasNoEvents = events.length === 0 && !isFetching;
  const title = `Feed Explorer (${events.length}${
    totalEvents !== events.length ? ` of ${totalEvents}` : ""
  })`;

  return (
    <div style={collapsed ? styles.collapsedContainer : styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>{title}</span>
        {collapsed && (
          <span style={styles.collapsedHint}>
            {hasNoEvents
              ? totalEvents > 0
                ? "No matching events"
                : "No events found"
              : `${sortedEvents.length} visible rows hidden`}
          </span>
        )}
        <select
          value={sortMode}
          onChange={(event) => setSortMode(event.target.value as SortMode)}
          style={styles.sortSelect}
          title="Sort events"
        >
          <option value="priority">Priority</option>
          <option value="updated">Updated</option>
          <option value="distance">Distance</option>
          <option value="expires">Expires</option>
        </select>
        {isFetching && <span style={styles.spinner}>&#8987;</span>}
        {onCollapsedChange && (
          <button
            type="button"
            style={styles.collapseButton}
            onClick={() => onCollapsedChange(!collapsed)}
            aria-expanded={!collapsed}
            title={collapsed ? "Show feed table" : "Hide feed table"}
          >
            {collapsed ? "Show table" : "Map space"}
          </button>
        )}
      </div>
      {collapsed ? null : hasNoEvents ? (
        <div style={styles.empty}>
          {totalEvents > 0
            ? "No events match the active filters."
            : "No events found for this location."}
        </div>
      ) : (
      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <span style={styles.colSource}>Source</span>
          <span style={styles.colType}>Type</span>
          <span style={styles.colCategory}>Category</span>
          <span style={styles.colSeverity}>Severity</span>
          <span style={styles.colHeadline}>Headline</span>
          <span style={styles.colDistance}>Distance</span>
          <span style={styles.colExpires}>Expires</span>
          <span style={styles.colTime}>Updated</span>
        </div>
        {sortedEvents.map((evt) => (
          <div
            key={evt.id}
            style={styles.row}
            onClick={() => onEventClick?.(evt)}
            title="Click for details"
          >
            <span style={styles.colSource}>
              <span
                style={{
                  ...styles.badge,
                  background: sourceColor(evt.source),
                }}
              >
                {evt.source}
              </span>
            </span>
            <span style={styles.colType}>{evt.type}</span>
            <span style={styles.colCategory}>{evt.category}</span>
            <span style={styles.colSeverity}>
              <SeverityBadge severity={evt.severity} />
            </span>
            <span style={styles.colHeadline}>{evt.headline}</span>
            <span style={styles.colDistance}>
              {formatDistance(distanceMiles(location, evt))}
            </span>
            <span style={styles.colExpires}>{expiresLabel(evt)}</span>
            <span style={styles.colTime}>{timeAgo(evt.updatedAt)}</span>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const color = severityColor(severity as RiskEvent["severity"]);
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 600,
        color,
        background: `${color}18`,
        padding: "1px 6px",
        borderRadius: 3,
      }}
    >
      {severity}
    </span>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderTop: "1px solid #e0e0e0",
    background: "#fafafa",
    maxHeight: 260,
    overflowY: "auto",
    fontFamily: "system-ui, sans-serif",
  },
  collapsedContainer: {
    borderTop: "1px solid #d7e0ea",
    background: "#fff",
    flex: "0 0 auto",
    overflow: "hidden",
    fontFamily: "system-ui, sans-serif",
    boxShadow: "0 -1px 8px rgba(21,101,192,0.08)",
  },
  header: {
    padding: "8px 12px",
    fontSize: 13,
    fontWeight: 600,
    color: "#424242",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#fff",
    position: "sticky",
    top: 0,
  },
  headerTitle: { flex: 1 },
  collapsedHint: {
    color: "#616161",
    fontSize: 12,
    fontWeight: 500,
    marginRight: 4,
    whiteSpace: "nowrap",
  },
  sortSelect: {
    border: "1px solid #cfd8dc",
    borderRadius: 5,
    background: "#fff",
    color: "#424242",
    fontSize: 11,
    fontWeight: 700,
    padding: "3px 6px",
  },
  collapseButton: {
    border: "1px solid #1565c0",
    borderRadius: 5,
    background: "#1565c0",
    color: "#fff",
    fontSize: 11,
    fontWeight: 800,
    padding: "4px 8px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
  spinner: { fontSize: 16 },
  table: { fontSize: 12 },
  tableHeader: {
    display: "flex",
    padding: "6px 12px",
    fontWeight: 600,
    color: "#757575",
    borderBottom: "1px solid #e0e0e0",
  },
  row: {
    display: "flex",
    padding: "6px 12px",
    borderBottom: "1px solid #f0f0f0",
    alignItems: "center",
    cursor: "pointer",
    transition: "background 0.1s",
  },
  colSource: { width: 60 },
  colType: { width: 120 },
  colCategory: { width: 80, color: "#616161" },
  colSeverity: { width: 80 },
  colHeadline: {
    flex: 1,
    minWidth: 220,
    color: "#424242",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    paddingRight: 12,
  },
  colDistance: { width: 70, color: "#616161" },
  colExpires: { width: 70, color: "#616161" },
  colTime: { flex: 1, textAlign: "right" as const, color: "#9e9e9e" },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    color: "#fff",
    padding: "2px 6px",
    borderRadius: 3,
    textTransform: "uppercase" as const,
  },
  empty: {
    padding: 24,
    textAlign: "center",
    color: "#9e9e9e",
    fontSize: 13,
    borderTop: "1px solid #e0e0e0",
  },
};
