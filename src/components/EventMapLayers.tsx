import { Polygon, CircleMarker, Popup, Tooltip } from "react-leaflet";
import type { RiskEvent } from "../types/riskEvent";
import type { RadiusOption, ResolvedLocation } from "../types/location";
import { sourceColor } from "../lib/riskInsights";
import { assessImpact, impactColor } from "../lib/impactInsights";

interface EventMapLayersProps {
  events: RiskEvent[];
  location: ResolvedLocation | null;
  radius: RadiusOption;
  currentImpactOnly: boolean;
  onEventClick?: (event: RiskEvent) => void;
}

function eventColor(event: RiskEvent): string {
  return sourceColor(event.source);
}

function eventRadius(event: RiskEvent): number {
  if (event.source === "USGS") {
    const mag = parseFloat(event.headline.match(/[\d.]+/)?.[0] ?? "1");
    return Math.max(6, mag * 6);
  }
  if (event.source === "NIFC") {
    const raw = event.raw as Record<string, unknown>;
    const acres = (raw.CalculatedAcres as number) ?? 0;
    return Math.max(8, Math.min(30, Math.sqrt(acres) * 0.4));
  }
  return 10;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const detailLinkStyle: React.CSSProperties = {
  display: "inline-block",
  marginTop: 6,
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

const impactDetailStyle: React.CSSProperties = {
  color: "#616161",
  fontSize: 11,
};

export function EventMapLayers({
  events,
  location,
  radius,
  currentImpactOnly,
  onEventClick,
}: EventMapLayersProps) {
  return (
    <>
      {events.map((evt) => {
        const impact = assessImpact(evt, location, radius);
        const dimmed =
          !currentImpactOnly &&
          (impact.level === "monitor" || impact.level === "historical");
        const color = eventColor(evt);

        if (evt.geometryType === "Polygon" && evt.polygon && evt.polygon.length >= 3) {
          const coords = evt.polygon.map(
            ([lng, lat]) => [lat, lng] as [number, number]
          );
          return (
            <Polygon
              key={evt.id}
              positions={coords}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: dimmed ? 0.035 : impact.level === "affects" ? 0.18 : 0.1,
                opacity: dimmed ? 0.45 : 1,
                weight: impact.level === "affects" ? 3 : 2,
              }}
            >
              <Popup>
                <strong>{evt.headline}</strong>
                <br />
                <span
                  style={{
                    ...impactBadgeStyle,
                    color: impactColor(impact.level),
                    background: `${impactColor(impact.level)}16`,
                  }}
                >
                  {impact.label}
                </span>
                {" "}
                <span style={impactDetailStyle}>{impact.detail}</span>
                <br />
                {evt.description?.slice(0, 200)}
                <br />
                <em style={{ fontSize: 11 }}>
                  {evt.source} · {evt.severity} · Updated {formatTime(evt.updatedAt)}
                </em>
                <br />
                <span style={detailLinkStyle} onClick={() => onEventClick?.(evt)}>
                  Details &rarr;
                </span>
              </Popup>
            </Polygon>
          );
        }
        if (evt.geometryType === "Point" && evt.latitude != null && evt.longitude != null) {
          return (
            <CircleMarker
              key={evt.id}
              center={[evt.latitude, evt.longitude]}
              radius={eventRadius(evt)}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: dimmed ? 0.2 : 0.58,
                opacity: dimmed ? 0.5 : 1,
                weight: impact.level === "nearby" ? 3 : 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                {evt.headline}
              </Tooltip>
              <Popup>
                <strong>{evt.headline}</strong>
                <br />
                <span
                  style={{
                    ...impactBadgeStyle,
                    color: impactColor(impact.level),
                    background: `${impactColor(impact.level)}16`,
                  }}
                >
                  {impact.label}
                </span>
                {" "}
                <span style={impactDetailStyle}>{impact.detail}</span>
                <br />
                {evt.description?.slice(0, 200)}
                <br />
                <em style={{ fontSize: 11 }}>
                  {evt.source} · {evt.severity} · {formatTime(evt.startedAt)}
                </em>
                <br />
                <span style={detailLinkStyle} onClick={() => onEventClick?.(evt)}>
                  Details &rarr;
                </span>
              </Popup>
            </CircleMarker>
          );
        }
        return null;
      })}
    </>
  );
}
