import { useMemo, useState } from "react";
import L from "leaflet";
import {
  CircleMarker,
  Marker,
  Polygon,
  Popup,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { RiskEvent } from "../types/riskEvent";
import type { RadiusOption, ResolvedLocation } from "../types/location";
import {
  clusterPointEvents,
  isEventCluster,
  topClusterSeverity,
  type EventCluster,
} from "../lib/eventClustering";
import { severityColor, severityRank, sourceColor } from "../lib/riskInsights";
import { assessImpact } from "../lib/impactInsights";
import { ClusterPopup, EventPopup } from "./map/EventPopup";

interface EventMapLayersProps {
  events: RiskEvent[];
  location: ResolvedLocation | null;
  radius: RadiusOption;
  currentImpactOnly: boolean;
  onEventClick?: (event: RiskEvent) => void;
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
  if (event.source === "NHC") {
    const raw = event.raw as Record<string, unknown>;
    const intensity = Number(raw.intensity ?? 0);
    return Math.max(9, Math.min(28, 8 + intensity / 8));
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

function clusterIcon(cluster: EventCluster): L.DivIcon {
  const severity = topClusterSeverity(cluster.events);
  const color = severityColor(severity);
  const size = Math.max(34, Math.min(58, 28 + cluster.events.length * 2));

  return L.divIcon({
    className: "event-cluster-marker",
    html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      border:2px solid ${color};
      background:${color};
      color:#fff;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 2px 10px rgba(0,0,0,0.24);
      font:800 12px system-ui,sans-serif;
    ">${cluster.events.length}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function EventMapLayers({
  events,
  location,
  radius,
  currentImpactOnly,
  onEventClick,
}: EventMapLayersProps) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
  });

  const polygonEvents = useMemo(
    () =>
      events.filter(
        (event) =>
          event.geometryType === "Polygon" && event.polygon && event.polygon.length >= 3
      ),
    [events]
  );
  const pointLayers = useMemo(
    () =>
      clusterPointEvents(
        events.filter(
          (event) =>
            event.geometryType === "Point" &&
            event.latitude != null &&
            event.longitude != null
        ),
        zoom
      ),
    [events, zoom]
  );

  return (
    <>
      {polygonEvents.map((event) => {
        const impact = assessImpact(event, location, radius);
        const dimmed =
          !currentImpactOnly &&
          (impact.level === "monitor" || impact.level === "historical");
        const color = sourceColor(event.source);
        const coords = event.polygon!.map(
          ([lng, lat]) => [lat, lng] as [number, number]
        );

        return (
          <Polygon
            key={event.id}
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
              <EventPopup
                event={event}
                impact={impact}
                timeLabel={`Updated ${formatTime(event.updatedAt)}`}
                onEventClick={onEventClick}
              />
            </Popup>
          </Polygon>
        );
      })}

      {pointLayers.map((item) => {
        if (isEventCluster(item)) {
          const topEvents = [...item.events]
            .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
            .slice(0, 6);

          return (
            <Marker
              key={`cluster-${item.id}`}
              position={[item.latitude, item.longitude]}
              icon={clusterIcon(item)}
            >
              <Popup>
                <ClusterPopup events={topEvents} onEventClick={onEventClick} />
              </Popup>
            </Marker>
          );
        }

        const event = item;
        const impact = assessImpact(event, location, radius);
        const dimmed =
          !currentImpactOnly &&
          (impact.level === "monitor" || impact.level === "historical");
        const color = sourceColor(event.source);

        return (
          <CircleMarker
            key={event.id}
            center={[event.latitude!, event.longitude!]}
            radius={eventRadius(event)}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: dimmed ? 0.2 : 0.58,
              opacity: dimmed ? 0.5 : 1,
              weight: impact.level === "nearby" ? 3 : 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -10]}>
              {event.headline}
            </Tooltip>
            <Popup>
              <EventPopup
                event={event}
                impact={impact}
                timeLabel={formatTime(event.startedAt)}
                onEventClick={onEventClick}
              />
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
}
