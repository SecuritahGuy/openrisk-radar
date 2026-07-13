import { useState } from "react";

interface LocationActionPanelProps {
  isSaved: boolean;
  isSaving: boolean;
  onSaveLocation: () => void;
  onDeleteLocation: () => void;
  onShareView: () => Promise<"shared" | "copied" | "unavailable">;
}

export function LocationActionPanel({
  isSaved,
  isSaving,
  onSaveLocation,
  onDeleteLocation,
  onShareView,
}: LocationActionPanelProps) {
  const [shareStatus, setShareStatus] = useState<
    "idle" | "shared" | "copied" | "unavailable"
  >("idle");

  async function handleShare() {
    const result = await onShareView();
    setShareStatus(result);
    window.setTimeout(() => setShareStatus("idle"), 2200);
  }

  const shareLabel =
    shareStatus === "shared"
      ? "Shared"
      : shareStatus === "copied"
        ? "Link copied"
        : shareStatus === "unavailable"
          ? "Copy unavailable"
          : "Share view";

  return (
    <div className="update-action-row" style={styles.actionRow}>
      <button onClick={handleShare} style={styles.shareBtn}>
        {shareLabel}
      </button>
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
  actionRow: {
    display: "grid",
    gap: 8,
    marginTop: 16,
    borderTop: "1px solid #e0e0e0",
    paddingTop: 12,
  },
  shareBtn: {
    width: "100%",
    padding: "8px 16px",
    fontSize: 14,
    fontWeight: 700,
    background: "#fff",
    color: "#1565c0",
    border: "1px solid #bbdefb",
    borderRadius: 6,
    cursor: "pointer",
  },
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
