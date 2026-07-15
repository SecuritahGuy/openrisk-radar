import { useState } from "react";
import type { Location, Criticality } from "../types/location";
import { isWatchExpired, watchPreferencesFor } from "../lib/watchPreferences";

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

function criticalityRank(c: Criticality): number {
  switch (c) {
    case "High":
      return 3;
    case "Medium":
      return 2;
    case "Low":
      return 1;
  }
}

type SortMode = "recent" | "criticality" | "label";

export function SavedLocationList({
  savedLocations,
  activeLocationId,
  onSelect,
  onDelete,
  onUpdateLabel,
}: SavedLocationListProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [filterText, setFilterText] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("recent");

  if (savedLocations.length === 0) return null;

  const activeLocation =
    savedLocations.find((location) => location.id === activeLocationId) ?? null;
  const normalizedFilter = filterText.trim().toLowerCase();
  const visibleLocations = savedLocations
    .filter((loc) => {
      if (!normalizedFilter) return true;
      return [
        loc.label,
        loc.city,
        loc.state,
        loc.postalCode ?? "",
        loc.county ?? "",
        loc.criticality,
        loc.locationType,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedFilter);
    })
    .sort((a, b) => {
      if (sortMode === "criticality") {
        return (
          criticalityRank(b.criticality) - criticalityRank(a.criticality) ||
          a.label.localeCompare(b.label)
        );
      }
      if (sortMode === "label") {
        return a.label.localeCompare(b.label);
      }
      return (
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    });

  return (
    <div className="saved-locations" style={styles.container}>
      <button
        type="button"
        style={styles.header}
        onClick={() => setCollapsed((current) => !current)}
        aria-expanded={!collapsed}
        title={collapsed ? "Show saved locations" : "Hide saved locations"}
      >
        <span style={styles.headerTitle}>Saved Locations</span>
        {collapsed && activeLocation && (
          <span style={styles.activeHint}>{activeLocation.label}</span>
        )}
        <span style={styles.count}>{savedLocations.length}</span>
        <span style={styles.chevron}>{collapsed ? "Show" : "Hide"}</span>
      </button>
      {!collapsed && (
        <div>
          <div style={styles.toolbar}>
            <input
              value={filterText}
              onChange={(event) => setFilterText(event.target.value)}
              style={styles.filterInput}
              placeholder="Filter saved locations"
              aria-label="Filter saved locations"
            />
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              style={styles.sortSelect}
              aria-label="Sort saved locations"
            >
              <option value="recent">Recent</option>
              <option value="criticality">Criticality</option>
              <option value="label">Label</option>
            </select>
          </div>
          <div style={styles.list}>
            {visibleLocations.length === 0 && (
              <div style={styles.empty}>No saved locations match.</div>
            )}
            {visibleLocations.map((loc) => {
              const isActive = loc.id === activeLocationId;
              const watch = watchPreferencesFor(loc);
              const watchState = isWatchExpired(watch)
                ? "Watch expired"
                : watch.enabled
                  ? "Watching"
                  : "Watch paused";
              return (
                <div
                  key={loc.id}
                  style={{
                    ...styles.item,
                    ...(isActive ? styles.itemActive : {}),
                  }}
                >
                  <div style={styles.itemTop}>
                    <input
                      style={styles.labelInput}
                      value={loc.label}
                      onChange={(e) => onUpdateLabel(loc.id, e.target.value)}
                      aria-label={`Label for ${loc.city}, ${loc.state}`}
                    />
                    <button
                      type="button"
                      style={styles.deleteBtn}
                      onClick={() => onDelete(loc.id)}
                      title={`Delete ${loc.label}`}
                      aria-label={`Delete ${loc.label}`}
                    >
                      &times;
                    </button>
                  </div>
                  <button
                    type="button"
                    style={styles.itemMain}
                    onClick={() => onSelect(loc)}
                    aria-pressed={isActive}
                    title={`Load ${loc.label}`}
                  >
                    <span style={styles.itemMeta}>
                      {loc.city}, {loc.state}
                      {isActive ? " · Selected" : ""}
                    </span>
                    <span style={styles.itemBadges}>
                      <span
                        style={{
                          ...styles.badge,
                          background: criticalityColor(loc.criticality),
                        }}
                      >
                        {loc.criticality}
                      </span>
                      <span style={styles.badgeOutline}>
                        {loc.locationType}
                      </span>
                      <span
                        style={{
                          ...styles.watchBadge,
                          ...(!watch.enabled || isWatchExpired(watch)
                            ? styles.watchBadgeInactive
                            : {}),
                        }}
                      >
                        {watchState}
                      </span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
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
    width: "100%",
    padding: "6px 12px",
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#757575",
    border: "none",
    borderBottom: "1px solid #e0e0e0",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#f5f7fa",
    cursor: "pointer",
    textAlign: "left" as const,
  },
  headerTitle: { flex: 1 },
  activeHint: {
    color: "#1565c0",
    fontWeight: 800,
    overflow: "hidden",
    textOverflow: "ellipsis",
    textTransform: "none" as const,
    whiteSpace: "nowrap",
  },
  count: {
    fontSize: 11,
    background: "#e0e0e0",
    color: "#616161",
    padding: "0 6px",
    borderRadius: 8,
    lineHeight: "18px",
  },
  chevron: {
    color: "#1565c0",
    fontSize: 10,
    fontWeight: 800,
  },
  toolbar: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 6,
    padding: "7px 12px",
    borderBottom: "1px solid #eceff1",
    background: "#fff",
  },
  filterInput: {
    border: "1px solid #cfd8dc",
    borderRadius: 5,
    color: "#263238",
    fontSize: 12,
    minWidth: 0,
    padding: "5px 7px",
  },
  sortSelect: {
    border: "1px solid #cfd8dc",
    borderRadius: 5,
    background: "#fff",
    color: "#424242",
    fontSize: 12,
    fontWeight: 700,
    padding: "5px 6px",
  },
  list: {},
  empty: {
    color: "#78909c",
    fontSize: 12,
    fontWeight: 700,
    padding: "10px 12px",
  },
  item: {
    padding: "6px 12px",
    borderBottom: "1px solid #f0f0f0",
    transition: "background 0.1s",
  },
  itemActive: {
    background: "#e3f2fd",
    borderLeft: "3px solid #1565c0",
  },
  itemMain: {
    width: "100%",
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "grid",
    gap: 3,
    padding: 0,
    textAlign: "left" as const,
    font: "inherit",
  },
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
  watchBadge: {
    background: "#e3f2fd",
    border: "1px solid #bbdefb",
    borderRadius: 3,
    color: "#1565c0",
    fontSize: 10,
    fontWeight: 700,
    padding: "1px 6px",
  },
  watchBadgeInactive: {
    background: "#eceff1",
    borderColor: "#cfd8dc",
    color: "#607d8b",
  },
};
