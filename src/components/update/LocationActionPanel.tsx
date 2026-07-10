interface LocationActionPanelProps {
  isSaved: boolean;
  isSaving: boolean;
  onSaveLocation: () => void;
  onDeleteLocation: () => void;
}

export function LocationActionPanel({
  isSaved,
  isSaving,
  onSaveLocation,
  onDeleteLocation,
}: LocationActionPanelProps) {
  return (
    <div className="update-action-row" style={styles.actionRow}>
      {isSaved ? (
        <button onClick={onDeleteLocation} style={styles.deleteBtn}>
          Remove saved location
        </button>
      ) : (
        <button
          onClick={onSaveLocation}
          disabled={isSaving}
          style={styles.saveBtn}
        >
          {isSaving ? "Saving..." : "+ Save Location"}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  actionRow: { marginTop: 16, borderTop: "1px solid #e0e0e0", paddingTop: 12 },
  saveBtn: {
    width: "100%",
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    background: "#1565c0",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  },
  deleteBtn: {
    width: "100%",
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 600,
    background: "#fff",
    color: "#c62828",
    border: "1px solid #e0e0e0",
    borderRadius: 6,
    cursor: "pointer",
  },
};
