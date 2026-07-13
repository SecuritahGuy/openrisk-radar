import { useState } from "react";
import type { RiskEvent } from "../../types/riskEvent";

interface HistoricalContextPanelProps {
  femaDeclarations: RiskEvent[];
  onEventClick: (event: RiskEvent) => void;
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Open";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Open";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function eventDate(event: RiskEvent): number {
  const rawDate =
    typeof event.raw.declarationDate === "string"
      ? event.raw.declarationDate
      : event.updatedAt;
  const value = new Date(rawDate).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function field(event: RiskEvent, key: string): string | null {
  const value = event.raw[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function HistoricalContextPanel({
  femaDeclarations,
  onEventClick,
}: HistoricalContextPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const sortedDeclarations = [...femaDeclarations].sort(
    (a, b) => eventDate(b) - eventDate(a)
  );
  const visibleDeclarations = showAll
    ? sortedDeclarations
    : sortedDeclarations.slice(0, 4);
  const latest = sortedDeclarations[0] ?? null;

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <div>
          <div style={styles.label}>Historical context</div>
          <div style={styles.title}>
            {femaDeclarations.length > 0
              ? `${femaDeclarations.length} FEMA record${femaDeclarations.length !== 1 ? "s" : ""}`
              : "No FEMA disaster history"}
          </div>
        </div>
        <span style={styles.badge}>Not active</span>
      </div>

      {latest ? (
        <div style={styles.summary}>
          Latest record: {latest.type} declared {formatDate(latest.updatedAt)}.
        </div>
      ) : (
        <div style={styles.empty}>
          No county-level FEMA disaster declarations matched this location.
        </div>
      )}

      {visibleDeclarations.length > 0 && (
        <div style={styles.list}>
          {visibleDeclarations.map((event) => {
            const declarationType = field(event, "declarationType");
            const county = field(event, "county");
            const state = field(event, "state");
            const incidentEndDate = field(event, "incidentEndDate");
            const closeOutDate = field(event, "disasterCloseOutDate");

            return (
              <button
                key={event.id}
                type="button"
                style={styles.item}
                onClick={() => onEventClick(event)}
                title="Open historical record details"
              >
                <span style={styles.itemTop}>
                  <span style={styles.itemTitle}>{event.headline}</span>
                  <span style={styles.typePill}>
                    {declarationType ?? event.severity}
                  </span>
                </span>
                <span style={styles.itemMeta}>
                  {event.type} · {formatDate(event.startedAt)}
                  {county || state ? ` · ${[county, state].filter(Boolean).join(", ")}` : ""}
                </span>
                <span style={styles.itemFooter}>
                  {closeOutDate
                    ? `Closed ${formatDate(closeOutDate)}`
                    : incidentEndDate
                      ? `Incident ended ${formatDate(incidentEndDate)}`
                      : "No closeout date reported"}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {sortedDeclarations.length > 4 && (
        <button
          type="button"
          style={styles.showButton}
          onClick={() => setShowAll((value) => !value)}
        >
          {showAll ? "Show fewer records" : `Show all ${sortedDeclarations.length}`}
        </button>
      )}
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    border: "1px solid #e3e9ef",
    borderRadius: 8,
    background: "#fbfcfe",
    marginBottom: 16,
    overflow: "hidden",
  },
  header: {
    alignItems: "flex-start",
    background: "#fff",
    borderBottom: "1px solid #edf1f5",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
    padding: "10px 11px",
  },
  label: {
    color: "#757575",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  title: {
    color: "#263238",
    fontSize: 14,
    fontWeight: 800,
    marginTop: 2,
  },
  badge: {
    background: "#eceff1",
    borderRadius: 3,
    color: "#607d8b",
    fontSize: 10,
    fontWeight: 800,
    padding: "3px 6px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  },
  summary: {
    color: "#607d8b",
    fontSize: 12,
    lineHeight: 1.35,
    padding: "9px 11px 0",
  },
  empty: {
    color: "#757575",
    fontSize: 12,
    lineHeight: 1.35,
    padding: "10px 11px",
  },
  list: {
    display: "grid",
    gap: 7,
    padding: "9px 11px 11px",
  },
  item: {
    background: "#fff",
    border: "1px solid #e3e9ef",
    borderRadius: 7,
    color: "#263238",
    cursor: "pointer",
    display: "grid",
    font: "inherit",
    gap: 4,
    padding: "8px 9px",
    textAlign: "left",
    width: "100%",
  },
  itemTop: {
    alignItems: "flex-start",
    display: "flex",
    gap: 8,
    justifyContent: "space-between",
  },
  itemTitle: {
    fontSize: 12,
    fontWeight: 800,
    lineHeight: 1.25,
  },
  typePill: {
    background: "#f3e5f5",
    borderRadius: 3,
    color: "#7b1fa2",
    flex: "0 0 auto",
    fontSize: 10,
    fontWeight: 800,
    padding: "2px 5px",
  },
  itemMeta: {
    color: "#607d8b",
    fontSize: 11,
    lineHeight: 1.35,
  },
  itemFooter: {
    color: "#757575",
    fontSize: 11,
    lineHeight: 1.35,
  },
  showButton: {
    background: "#fff",
    border: "none",
    borderTop: "1px solid #edf1f5",
    color: "#1565c0",
    cursor: "pointer",
    font: "inherit",
    fontSize: 12,
    fontWeight: 800,
    padding: "8px 10px",
    width: "100%",
  },
};
