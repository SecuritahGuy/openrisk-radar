import type { RiskEvent } from "../../types/riskEvent";
import type { ImpactAssessment } from "../../lib/impactInsights";
import { impactColor } from "../../lib/impactInsights";
import { concernContextLabel, severityColor, sourceLabel } from "../../lib/riskInsights";

interface EventPopupProps {
  event: RiskEvent;
  impact: ImpactAssessment;
  timeLabel: string;
  onEventClick?: (event: RiskEvent) => void;
}

interface ClusterPopupProps {
  events: RiskEvent[];
  onEventClick?: (event: RiskEvent) => void;
}

export function EventPopup({
  event,
  impact,
  timeLabel,
  onEventClick,
}: EventPopupProps) {
  const color = impactColor(impact.level);
  const contextLabel = concernContextLabel(event);

  return (
    <>
      <strong>{event.headline}</strong>
      <br />
      <span
        style={{
          ...impactBadgeStyle,
          color,
          background: `${color}16`,
        }}
      >
        {impact.label}
      </span>
      {contextLabel && (
        <>
          {" "}
          <span style={contextBadgeStyle}>{contextLabel}</span>
        </>
      )}
      {" "}
      <span style={impactDetailStyle}>{impact.detail}</span>
      <br />
      {event.description?.slice(0, 200)}
      <br />
      <em style={{ fontSize: 11 }}>
        {sourceLabel(event.source)} · {event.severity} · {timeLabel}
      </em>
      <br />
      <button
        type="button"
        style={detailButtonStyle}
        onClick={() => onEventClick?.(event)}
      >
        Details &rarr;
      </button>
    </>
  );
}

export function ClusterPopup({ events, onEventClick }: ClusterPopupProps) {
  return (
    <>
      <strong>{events.length} signals in this area</strong>
      <br />
      <em style={{ fontSize: 11 }}>
        Zoom in to separate nearby markers.
      </em>
      <div style={clusterListStyle}>
        {events.map((event) => (
          <button
            key={event.id}
            type="button"
            style={clusterItemStyle}
            onClick={() => onEventClick?.(event)}
          >
            <span
              style={{
                ...clusterSeverityDotStyle,
                background: severityColor(event.severity),
              }}
            />
            <span style={clusterItemTextStyle}>{event.headline}</span>
          </button>
        ))}
      </div>
    </>
  );
}

const detailButtonStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 6,
  border: "none",
  background: "transparent",
  padding: 0,
  fontSize: 11,
  color: "#1565c0",
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "underline",
};

const impactBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: 10,
  fontWeight: 800,
  padding: "2px 6px",
  borderRadius: 3,
  marginTop: 6,
};

const contextBadgeStyle: React.CSSProperties = {
  display: "inline-block",
  fontSize: 10,
  fontWeight: 800,
  padding: "2px 6px",
  borderRadius: 3,
  color: "#607d8b",
  background: "#eceff1",
  marginTop: 6,
  textTransform: "uppercase",
};

const impactDetailStyle: React.CSSProperties = {
  color: "#616161",
  fontSize: 11,
};

const clusterListStyle: React.CSSProperties = {
  display: "grid",
  gap: 5,
  marginTop: 8,
  minWidth: 220,
};

const clusterItemStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 6,
  border: "none",
  background: "#f7f9fb",
  borderRadius: 5,
  padding: "5px 6px",
  textAlign: "left",
  cursor: "pointer",
};

const clusterSeverityDotStyle: React.CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: "50%",
  flex: "0 0 auto",
  marginTop: 4,
};

const clusterItemTextStyle: React.CSSProperties = {
  fontSize: 11,
  color: "#263238",
  lineHeight: 1.25,
};
