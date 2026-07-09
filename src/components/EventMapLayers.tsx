import { Polygon, CircleMarker, Popup, Tooltip } from "react-leaflet";
import type { RiskEvent } from "../types/riskEvent";
import { sourceColor } from "../lib/riskInsights";

interface EventMapLayersProps {
  events: RiskEvent[];
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

export function EventMapLayers({ events, onEventClick }: EventMapLayersProps) {
  return (
    <>
      {events.map((evt) => {
        if (evt.geometryType === "Polygon" && evt.polygon && evt.polygon.length >= 3) {
          const coords = evt.polygon.map(
            ([lng, lat]) => [lat, lng] as [number, number]
          );
          return (
            <Polygon
              key={evt.id}
              positions={coords}
              pathOptions={{
                color: eventColor(evt),
                fillColor: eventColor(evt),
                fillOpacity: 0.12,
                weight: 2,
              }}
            >
              <Popup>
                <strong>{evt.headline}</strong>
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
                color: eventColor(evt),
                fillColor: eventColor(evt),
                fillOpacity: 0.5,
                weight: 2,
              }}
            >
              <Tooltip direction="top" offset={[0, -10]}>
                {evt.headline}
              </Tooltip>
              <Popup>
                <strong>{evt.headline}</strong>
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
