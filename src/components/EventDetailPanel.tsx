import type { RiskEvent } from "../types/riskEvent";
import type { RadiusOption, ResolvedLocation } from "../types/location";
import { assessImpact, impactColor } from "../lib/impactInsights";

interface EventDetailPanelProps {
  event: RiskEvent;
  location: ResolvedLocation | null;
  radius: RadiusOption;
  onClose: () => void;
}

function sourceColor(source: string): string {
  switch (source) {
    case "NWS":
      return "#1565c0";
    case "USGS":
      return "#2e7d32";
    case "FEMA":
      return "#7b1fa2";
    case "NIFC":
      return "#d84315";
    case "SPC":
      return "#00897b";
    case "NHC":
      return "#c62828";
    case "GDACS":
      return "#1565c0";
    case "EONET":
      return "#6a1b9a";
    default:
      return "#757575";
  }
}

function severityStyle(severity: string): React.CSSProperties {
  const color =
    severity === "Extreme"
      ? "#d32f2f"
      : severity === "Severe"
        ? "#f57c00"
        : severity === "Moderate"
          ? "#fbc02d"
          : "#757575";
  return {
    fontSize: 11,
    fontWeight: 700,
    color,
    background: `${color}18`,
    padding: "2px 8px",
    borderRadius: 3,
    textTransform: "uppercase" as const,
  };
}

function formatTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
}

function DetailRow({ label, value }: { label: string; value: string }) {
  if (!value || value === "—") return null;
  return (
    <div style={styles.detailRow}>
      <span style={styles.detailLabel}>{label}</span>
      <span style={styles.detailValue}>{value}</span>
    </div>
  );
}

function NwsFields({ raw }: { raw: Record<string, unknown> }) {
  const p = ((raw.properties as Record<string, string | null> | undefined) ??
    raw) as Record<string, string | null>;
  return (
    <>
      <DetailRow label="Urgency" value={p.urgency ?? "—"} />
      <DetailRow label="Certainty" value={p.certainty ?? "—"} />
      <DetailRow label="Area" value={p.areaDesc ?? "—"} />
      <DetailRow label="Category" value={p.category ?? "—"} />
    </>
  );
}

function UsgsFields({ raw }: { raw: Record<string, unknown> }) {
  const p = ((raw.properties as
    | Record<string, string | number | null>
    | undefined) ?? raw) as Record<string, string | number | null>;
  const geometry = raw.geometry as
    | { coordinates?: [number, number, number] }
    | undefined;
  return (
    <>
      <DetailRow label="Magnitude" value={p.mag != null ? String(p.mag) : "—"} />
      <DetailRow label="Mag Type" value={String(p.magType ?? "—")} />
      <DetailRow label="Place" value={String(p.place ?? "—")} />
      <DetailRow label="Type" value={String(p.type ?? "—")} />
      {geometry?.coordinates?.[2] != null && (
        <DetailRow label="Depth" value={`${geometry.coordinates[2]} km`} />
      )}
    </>
  );
}

function NifcFields({ raw }: { raw: Record<string, unknown> }) {
  const p = raw as Record<string, string | number | null>;
  const acres = p.CalculatedAcres;
  const contained = p.PercentContained;
  return (
    <>
      {acres != null && <DetailRow label="Acres" value={`${Number(acres).toLocaleString()} acres`} />}
      {contained != null && <DetailRow label="Containment" value={`${contained}%`} />}
      <DetailRow label="County" value={String(p.POOCounty ?? "—")} />
      <DetailRow label="State" value={String(p.POOState ?? "—")} />
      <DetailRow label="Cause" value={String(p.FireCauseGeneral ?? p.FireCause ?? "—")} />
      {p.TotalIncidentPersonnel != null && (
        <DetailRow label="Personnel" value={`${p.TotalIncidentPersonnel}`} />
      )}
      {p.ResidencesDestroyed != null && Number(p.ResidencesDestroyed) > 0 && (
        <DetailRow label="Residences Lost" value={`${p.ResidencesDestroyed}`} />
      )}
      {p.Fatalities != null && Number(p.Fatalities) > 0 && (
        <DetailRow label="Fatalities" value={`${p.Fatalities}`} />
      )}
      {p.Injuries != null && Number(p.Injuries) > 0 && (
        <DetailRow label="Injuries" value={`${p.Injuries}`} />
      )}
    </>
  );
}

function FemaFields({ raw }: { raw: Record<string, unknown> }) {
  const p = raw as Record<string, string | null>;
  const declType = p.declarationType;
  const declLabel =
    declType === "DR"
      ? "Major Disaster"
      : declType === "EM"
        ? "Emergency"
        : declType === "FM"
          ? "Fire Management"
          : declType ?? "—";
  return (
    <>
      <DetailRow label="Declaration" value={declLabel} />
      <DetailRow label="Program" value={p.programType ?? "—"} />
      <DetailRow label="Incident Type" value={p.incidentType ?? "—"} />
      <DetailRow label="County" value={p.county ?? "—"} />
      <DetailRow label="State" value={p.state ?? "—"} />
      <DetailRow label="Incident Start" value={p.incidentBeginDate ? formatTime(p.incidentBeginDate) : "—"} />
      <DetailRow label="Incident End" value={p.incidentEndDate ? formatTime(p.incidentEndDate) : "—"} />
      <DetailRow label="Close Out" value={p.disasterCloseOutDate ? formatTime(p.disasterCloseOutDate) : "—"} />
    </>
  );
}

function SpcFields({ raw }: { raw: Record<string, unknown> }) {
  return (
    <>
      <DetailRow label="Outlook Day" value={raw.day != null ? `Day ${raw.day}` : "—"} />
      <DetailRow label="Risk Label" value={String(raw.label ?? "—")} />
      <DetailRow label="Risk Detail" value={String(raw.label2 ?? "—")} />
      <DetailRow label="Valid" value={raw.valid ? String(raw.valid) : "—"} />
      <DetailRow label="Expires" value={raw.expire ? String(raw.expire) : "—"} />
    </>
  );
}

function NhcFields({ raw }: { raw: Record<string, unknown> }) {
  const publicAdvisory = raw.publicAdvisory as { advNum?: string } | null;
  return (
    <>
      <DetailRow label="Classification" value={String(raw.classification ?? "—")} />
      <DetailRow label="Advisory" value={publicAdvisory?.advNum ?? "—"} />
      <DetailRow label="Wind" value={raw.intensity ? `${raw.intensity} kt` : "—"} />
      <DetailRow label="Pressure" value={raw.pressure ? `${raw.pressure} mb` : "—"} />
      <DetailRow label="Movement" value={
        raw.movementDir != null && raw.movementSpeed != null
          ? `${raw.movementDir} deg at ${raw.movementSpeed} kt`
          : "—"
      } />
    </>
  );
}

function GdacsFields({ raw }: { raw: Record<string, unknown> }) {
  const p = ((raw.properties as Record<string, string | null> | undefined) ??
    raw) as Record<string, string | null>;
  return (
    <>
      <DetailRow label="Alert Level" value={p.alertlevel ?? "—"} />
      <DetailRow label="Alert Score" value={p.alertscore ?? "—"} />
      <DetailRow label="Country" value={p.country ?? p.countrylist ?? "—"} />
      <DetailRow label="Event ID" value={p.eventid ?? "—"} />
      <DetailRow label="Episode" value={p.episodeid ?? "—"} />
      <DetailRow label="Severity" value={p.severity ?? "—"} />
    </>
  );
}

function EonetFields({ raw }: { raw: Record<string, unknown> }) {
  const p = ((raw.properties as Record<string, unknown> | undefined) ??
    raw) as Record<string, unknown>;
  const categories = p.categories as Array<{ title?: string }> | undefined;
  const sources = p.sources as Array<{ id?: string }> | undefined;
  const magnitudeValue = p.magnitudeValue;
  const magnitudeUnit = p.magnitudeUnit;
  return (
    <>
      <DetailRow
        label="Categories"
        value={categories?.map((c) => c.title).filter(Boolean).join(", ") ?? "—"}
      />
      <DetailRow
        label="Magnitude"
        value={
          magnitudeValue != null
            ? `${magnitudeValue}${magnitudeUnit ? ` ${magnitudeUnit}` : ""}`
            : "—"
        }
      />
      <DetailRow
        label="Sources"
        value={sources?.map((s) => s.id).filter(Boolean).join(", ") ?? "—"}
      />
      <DetailRow label="Closed" value={p.closed ? formatTime(String(p.closed)) : "—"} />
    </>
  );
}

export function EventDetailPanel({
  event,
  location,
  radius,
  onClose,
}: EventDetailPanelProps) {
  const coords =
    event.latitude != null && event.longitude != null
      ? `${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`
      : "—";
  const impact = assessImpact(event, location, radius);
  const impactBadgeColor = impactColor(impact.level);

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span
              style={{
                ...styles.sourceBadge,
                background: sourceColor(event.source),
              }}
            >
              {event.source}
            </span>
            <span style={styles.headerType}>{event.type}</span>
            <span style={severityStyle(event.severity)}>{event.severity}</span>
            <span
              style={{
                ...styles.impactBadge,
                color: impactBadgeColor,
                background: `${impactBadgeColor}16`,
              }}
            >
              {impact.label}
            </span>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            &times;
          </button>
        </div>

        <div style={styles.headline}>{event.headline}</div>

        {event.description && (
          <div style={styles.description}>{event.description}</div>
        )}

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Impact, Timing & Location</div>
          <DetailRow label="Impact" value={impact.detail} />
          <DetailRow label="Started" value={formatTime(event.startedAt)} />
          <DetailRow label="Updated" value={formatTime(event.updatedAt)} />
          {event.expiresAt && (
            <DetailRow label="Expires" value={formatTime(event.expiresAt)} />
          )}
          <DetailRow label="Coordinates" value={coords} />
          <DetailRow label="Confidence" value={event.confidence} />
        </div>

        {event.source === "NWS" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Weather Alert Details</div>
            <NwsFields raw={event.raw} />
          </div>
        )}
        {event.source === "USGS" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Earthquake Details</div>
            <UsgsFields raw={event.raw} />
          </div>
        )}
        {event.source === "NIFC" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Wildfire Details</div>
            <NifcFields raw={event.raw} />
          </div>
        )}
        {event.source === "FEMA" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Disaster Declaration Details</div>
            <FemaFields raw={event.raw} />
          </div>
        )}
        {event.source === "SPC" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Convective Outlook Details</div>
            <SpcFields raw={event.raw} />
          </div>
        )}
        {event.source === "NHC" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Tropical Cyclone Details</div>
            <NhcFields raw={event.raw} />
          </div>
        )}
        {event.source === "GDACS" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Global Disaster Details</div>
            <GdacsFields raw={event.raw} />
          </div>
        )}
        {event.source === "EONET" && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Earth Observation Details</div>
            <EonetFields raw={event.raw} />
          </div>
        )}

        {event.url && (
          <div style={styles.actionRow}>
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.extLink}
            >
              View source &rarr;
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    zIndex: 10000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "system-ui, sans-serif",
  },
  panel: {
    background: "#fff",
    borderRadius: 12,
    width: "90%",
    maxWidth: 560,
    maxHeight: "85vh",
    overflowY: "auto",
    padding: 24,
    boxShadow: "0 8px 40px rgba(0,0,0,0.2)",
    position: "relative",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  sourceBadge: {
    fontSize: 10,
    fontWeight: 700,
    color: "#fff",
    padding: "2px 8px",
    borderRadius: 3,
    textTransform: "uppercase" as const,
  },
  headerType: {
    fontSize: 13,
    color: "#616161",
    fontWeight: 500,
  },
  impactBadge: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 3,
  },
  closeBtn: {
    border: "none",
    background: "none",
    fontSize: 24,
    color: "#9e9e9e",
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
  },
  headline: {
    fontSize: 18,
    fontWeight: 700,
    color: "#212121",
    marginBottom: 12,
    lineHeight: 1.3,
  },
  description: {
    fontSize: 14,
    color: "#424242",
    lineHeight: 1.5,
    marginBottom: 16,
    whiteSpace: "pre-wrap" as const,
  },
  section: {
    marginBottom: 16,
    paddingTop: 12,
    borderTop: "1px solid #eee",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    color: "#9e9e9e",
    marginBottom: 8,
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "4px 0",
    fontSize: 13,
    borderBottom: "1px solid #f5f5f5",
  },
  detailLabel: {
    color: "#757575",
    fontWeight: 500,
    minWidth: 120,
  },
  detailValue: {
    color: "#212121",
    fontWeight: 500,
    textAlign: "right" as const,
    flex: 1,
  },
  actionRow: {
    borderTop: "1px solid #eee",
    paddingTop: 12,
    textAlign: "center" as const,
  },
  extLink: {
    fontSize: 13,
    color: "#1565c0",
    fontWeight: 600,
    textDecoration: "none",
  },
};
