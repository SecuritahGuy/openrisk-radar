interface UpdatePanelHeaderProps {
  isFetching: boolean;
  hasLocation: boolean;
  onRefresh: () => void;
}

export function UpdatePanelHeader({
  isFetching,
  hasLocation,
  onRefresh,
}: UpdatePanelHeaderProps) {
  return (
    <div style={styles.titleRow}>
      <div>
        <h3 style={styles.title}>OpenRisk Radar</h3>
        <a
          href="https://github.com/SecuritahGuy/openrisk-radar"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.githubLink}
        >
          View source on GitHub ↗
        </a>
      </div>
      <button
        onClick={onRefresh}
        disabled={isFetching || !hasLocation}
        style={styles.refreshBtn}
        title="Refresh feeds"
      >
        {isFetching ? "..." : "\u21BB"}
      </button>
    </div>
  );
}

export function UpdatePanelPlaceholder() {
  return (
    <div className="placeholder" style={styles.placeholder}>
      Enter a ZIP code or city, state above to begin.
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 700,
    color: "#1565c0",
  },
  githubLink: {
    display: "inline-block",
    marginTop: 3,
    fontSize: 11,
    color: "#546e7a",
    textDecoration: "none",
    fontWeight: 600,
  },
  refreshBtn: {
    padding: "4px 10px",
    fontSize: 16,
    border: "1px solid #bdbdbd",
    borderRadius: 4,
    background: "#fafafa",
    cursor: "pointer",
    color: "#424242",
  },
  placeholder: {
    fontSize: 14,
    color: "#9e9e9e",
    textAlign: "center",
    marginTop: 40,
  },
};
