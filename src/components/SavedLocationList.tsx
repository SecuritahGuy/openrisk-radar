import type { Location, Criticality } from "../types/location";

interface SavedLocationListProps {
  savedLocations: Location[];
  activeLocationId: string | null;
  onSelect: (loc: Location) => void;
  onDelete: (id: string) => void;
  onUpdateLabel: (id: string, label: string) => void;
}

function criticalityColor(c: Criticality): string {
  switch (c) {
    case "High":
      return "#d32f2f";
    case "Medium":
      return "#f57c00";
    case "Low":
      return "#388e3c";
  }
}

export function SavedLocationList({
  savedLocations,
  activeLocationId,
  onSelect,
  onDelete,
  onUpdateLabel,
}: SavedLocationListProps) {
  if (savedLocations.length === 0) return null;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.headerTitle}>Saved Locations</span>
        <span style={styles.count}>{savedLocations.length}</span>
      </div>
      <div style={styles.list}>
        {savedLocations.map((loc) => {
          const isActive = loc.id === activeLocationId;
          return (
            <div
              key={loc.id}
              style={{
                ...styles.item,
                ...(isActive ? styles.itemActive : {}),
              }}
            >
              <div style={styles.itemMain} onClick={() => onSelect(loc)}>
                <div style={styles.itemTop}>
                  <input
                    style={styles.labelInput}
                    value={loc.label}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdateLabel(loc.id, e.target.value)}
                  />
                  <button
                    style={styles.deleteBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(loc.id);
                    }}
                    title="Delete"
                  >
                    &times;
                  </button>
                </div>
                <div style={styles.itemMeta}>
                  {loc.city}, {loc.state}
                </div>
                <div style={styles.itemBadges}>
                  <span
                    style={{
                      ...styles.badge,
                      background: criticalityColor(loc.criticality),
                    }}
                  >
                    {loc.criticality}
                  </span>
                  <span style={styles.badgeOutline}>{loc.locationType}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderBottom: "1px solid #e0e0e0",
    background: "#fafafa",
    maxHeight: 180,
    overflowY: "auto",
  },
  header: {
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#757575",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: { flex: 1 },
  count: {
    fontSize: 11,
    background: "#e0e0e0",
    color: "#616161",
    padding: "0 6px",
    borderRadius: 8,
    lineHeight: "18px",
  },
  list: {},
  item: {
    padding: "6px 12px",
    cursor: "pointer",
    borderBottom: "1px solid #f0f0f0",
    transition: "background 0.1s",
  },
  itemActive: {
    background: "#e3f2fd",
    borderLeft: "3px solid #1565c0",
  },
  itemMain: {},
  itemTop: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  labelInput: {
    flex: 1,
    border: "none",
    background: "transparent",
    fontSize: 13,
    fontWeight: 600,
    color: "#212121",
    outline: "none",
    padding: 0,
    fontFamily: "inherit",
  },
  deleteBtn: {
    border: "none",
    background: "none",
    fontSize: 16,
    color: "#bdbdbd",
    cursor: "pointer",
    padding: "0 2px",
    lineHeight: 1,
  },
  itemMeta: {
    fontSize: 11,
    color: "#9e9e9e",
    marginTop: 1,
  },
  itemBadges: {
    display: "flex",
    gap: 4,
    marginTop: 3,
  },
  badge: {
    fontSize: 10,
    fontWeight: 700,
    color: "#fff",
    padding: "1px 6px",
    borderRadius: 3,
  },
  badgeOutline: {
    fontSize: 10,
    color: "#757575",
    border: "1px solid #bdbdbd",
    padding: "1px 6px",
    borderRadius: 3,
  },
};
