import { useState } from "react";
import type {
  Criticality,
  Location,
  LocationType,
  RadiusOption,
  ResolvedLocation,
} from "../../types/location";

interface LocationDetailsPanelProps {
  location: ResolvedLocation;
  radius: RadiusOption;
  activeSavedLocation: Location | null;
  onRadiusChange: (radius: RadiusOption) => void;
  onUpdateLabel: (label: string) => void;
  onUpdateCriticality: (criticality: Criticality) => void;
  onUpdateType: (type: LocationType) => void;
}

const CRITICALITIES: Criticality[] = ["Low", "Medium", "High"];
const LOCATION_TYPES: LocationType[] = [
  "Office",
  "Supplier",
  "Data Center",
  "Travel",
  "Facility",
  "Custom",
];

export function LocationDetailsPanel({
  location,
  radius,
  activeSavedLocation,
  onRadiusChange,
  onUpdateLabel,
  onUpdateCriticality,
  onUpdateType,
}: LocationDetailsPanelProps) {
  const [editingLabel, setEditingLabel] = useState(false);
  const [draftLabel, setDraftLabel] = useState("");
  const label = activeSavedLocation?.label ?? `${location.city}, ${location.state}`;
  const criticality = activeSavedLocation?.criticality ?? "Medium";
  const locationType = activeSavedLocation?.locationType ?? "Custom";
  const isSaved = !!activeSavedLocation;

  function handleStartEditLabel() {
    setDraftLabel(label);
    setEditingLabel(true);
  }

  function handleSaveLabel() {
    if (draftLabel.trim()) {
      onUpdateLabel(draftLabel.trim());
    }
    setEditingLabel(false);
  }

  return (
    <>
      <div style={styles.section}>
        <div style={styles.label}>Location</div>
        {editingLabel ? (
          <div style={styles.editRow}>
            <input
              style={styles.editInput}
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && handleSaveLabel()}
              autoFocus
            />
            <button style={styles.editSaveBtn} onClick={handleSaveLabel}>
              Save
            </button>
          </div>
        ) : (
          <div
            style={styles.value}
            onClick={isSaved ? handleStartEditLabel : undefined}
            title={isSaved ? "Click to edit label" : undefined}
          >
            {label}
          </div>
        )}
        {location.county && (
          <div style={styles.detail}>{location.county}</div>
        )}
        {location.postalCode && (
          <div style={styles.detail}>ZIP {location.postalCode}</div>
        )}
      </div>

      {isSaved && (
        <div style={styles.section}>
          <div style={styles.label}>Properties</div>
          <div style={styles.propRow}>
            <span style={styles.propLabel}>Criticality</span>
            <select
              value={criticality}
              onChange={(event) => onUpdateCriticality(event.target.value as Criticality)}
              style={styles.select}
            >
              {CRITICALITIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div style={styles.propRow}>
            <span style={styles.propLabel}>Type</span>
            <select
              value={locationType}
              onChange={(event) => onUpdateType(event.target.value as LocationType)}
              style={styles.select}
            >
              {LOCATION_TYPES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div style={styles.propRow}>
            <span style={styles.propLabel}>Radius</span>
            <select
              value={radius}
              onChange={(event) => onRadiusChange(Number(event.target.value) as RadiusOption)}
              style={styles.select}
            >
              {([10, 25, 50, 100] as RadiusOption[]).map((item) => (
                <option key={item} value={item}>{item} mi</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: { marginBottom: 16 },
  label: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase",
    color: "#616161",
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: 600,
    color: "#212121",
    cursor: "pointer",
  },
  detail: { fontSize: 13, color: "#616161", marginTop: 2 },
  editRow: { display: "flex", gap: 4, marginTop: 4 },
  editInput: {
    flex: 1,
    padding: "4px 8px",
    fontSize: 14,
    border: "1px solid #1565c0",
    borderRadius: 4,
    outline: "none",
  },
  editSaveBtn: {
    padding: "4px 10px",
    fontSize: 12,
    background: "#1565c0",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
  },
  propRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
  },
  propLabel: { fontSize: 13, color: "#616161" },
  select: {
    fontSize: 12,
    padding: "2px 6px",
    border: "1px solid #bdbdbd",
    borderRadius: 4,
    background: "#fff",
  },
};
