import type { SourceHealthItem, SourceHealthStatus } from "../../hooks/useRiskFeeds";

interface DataCoveragePanelProps {
  items: SourceHealthItem[];
}

function statusLabel(status: SourceHealthStatus): string {
  switch (status) {
    case "disabled":
      return "Waiting";
    case "loading":
      return "Checking";
    case "live":
      return "Live";
    case "empty":
      return "No signal";
    case "error":
      return "Error";
    case "unavailable":
      return "Unavailable";
  }
}

function statusColor(status: SourceHealthStatus): string {
  switch (status) {
    case "live":
      return "#2e7d32";
    case "loading":
      return "#1565c0";
    case "empty":
      return "#607d8b";
    case "error":
      return "#c62828";
    case "unavailable":
      return "#8d6e63";
    case "disabled":
      return "#9e9e9e";
  }
}

export function DataCoveragePanel({ items }: DataCoveragePanelProps) {
  const liveCount = items.filter((item) => item.status === "live").length;
  const issueCount = items.filter(
    (item) => item.status === "error" || item.status === "unavailable"
  ).length;

  return (
    <div style={styles.section}>
      <div style={styles.header}>
        <div>
          <div style={styles.label}>Data coverage</div>
          <div style={styles.detail}>
            {liveCount} live source{liveCount !== 1 ? "s" : ""}
            {issueCount > 0 ? ` · ${issueCount} unavailable or errored` : ""}
          </div>
        </div>
      </div>
      <div style={styles.list}>
        {items.map((item) => {
          const color = statusColor(item.status);
          return (
            <div key={item.id} style={styles.row}>
              <div style={styles.topLine}>
                <span style={styles.name}>{item.label}</span>
                <span
                  style={{
                    ...styles.badge,
                    color,
                    background: `${color}14`,
                    borderColor: `${color}55`,
                  }}
                >
                  {statusLabel(item.status)}
                </span>
              </div>
              <div style={styles.rowDetail}>
                {item.count != null && (
                  <span style={styles.count}>{item.count}</span>
                )}
                {item.detail}
              </div>
            </div>
          );
        })}
      </div>
    </div>
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
  header: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    alignItems: "flex-start",
  },
  list: {
    marginTop: 8,
    border: "1px solid #eceff1",
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    padding: "8px 9px",
    borderBottom: "1px solid #eceff1",
    background: "#fff",
  },
  topLine: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  name: {
    fontSize: 12,
    color: "#263238",
    fontWeight: 700,
    minWidth: 0,
  },
  badge: {
    flex: "0 0 auto",
    fontSize: 10,
    fontWeight: 800,
    border: "1px solid",
    borderRadius: 999,
    padding: "2px 6px",
  },
  rowDetail: {
    fontSize: 11,
    color: "#607d8b",
    marginTop: 3,
    lineHeight: 1.35,
  },
  count: {
    display: "inline-block",
    minWidth: 16,
    marginRight: 5,
    color: "#263238",
    fontWeight: 800,
  },
};
