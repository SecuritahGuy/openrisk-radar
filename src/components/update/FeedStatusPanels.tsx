import { formatTimestamp } from "../../lib/format";

interface LastCheckedPanelProps {
  lastUpdated: Date | null;
}

interface FeedErrorPanelProps {
  error: string | null;
}

export function LastCheckedPanel({ lastUpdated }: LastCheckedPanelProps) {
  if (!lastUpdated) return null;

  return (
    <div style={styles.section}>
      <div style={styles.label}>Last checked</div>
      <div style={styles.detail}>
        {formatTimestamp(lastUpdated.toISOString())}
      </div>
    </div>
  );
}

export function FeedErrorPanel({ error }: FeedErrorPanelProps) {
  if (!error) return null;

  return (
    <div style={styles.section}>
      <div style={{ ...styles.label, color: "#c62828" }}>
        Feed errors
      </div>
      <div style={styles.errorText}>{error}</div>
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
  errorText: { fontSize: 12, color: "#c62828" },
};
