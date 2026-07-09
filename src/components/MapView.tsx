import { useEffect, useRef, useState } from "react";
import type { Marker as LeafletMarker } from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { ResolvedLocation, RadiusOption } from "../types/location";
import type { EventSource, RiskEvent, Severity } from "../types/riskEvent";
import type { NwsWeatherOverlay } from "../services/nwsWeatherOverlay";
import { resolveCoordinates } from "../services/locationResolver";
import {
  EVENT_SEVERITIES,
  EVENT_SOURCES,
  type SeverityFilters,
  type SourceFilters,
  severityColor,
  sourceColor,
} from "../lib/riskInsights";
import { EventMapLayers } from "./EventMapLayers";
import { MapLegend } from "./MapLegend";
import {
  NwsWeatherMapLayers,
} from "./NwsWeatherMapLayers";
import {
  WEATHER_LAYER_OPTIONS,
  type WeatherLayerMode,
} from "../types/weatherLayer";

interface PendingMapPoint {
  latitude: number;
  longitude: number;
  status: "loading" | "ready" | "error";
  location: ResolvedLocation | null;
  error: string | null;
}

interface MapViewProps {
  location: ResolvedLocation | null;
  radius: RadiusOption;
  events: RiskEvent[];
  weatherOverlay: NwsWeatherOverlay | null;
  showWeatherOverlay: boolean;
  weatherLayerMode: WeatherLayerMode;
  sourceFilters: SourceFilters;
  severityFilters: SeverityFilters;
  onToggleSource: (source: EventSource) => void;
  onToggleSeverity: (severity: Severity) => void;
  onToggleWeatherOverlay: (show: boolean) => void;
  onWeatherLayerModeChange: (mode: WeatherLayerMode) => void;
  onRadiusChange: (radius: RadiusOption) => void;
  onSearchMapArea: (lat: number, lng: number) => void;
  mapSearchLoading: boolean;
  onEventClick?: (event: RiskEvent) => void;
}

function MapController({ location }: { location: ResolvedLocation }) {
  const map = useMap();

  useEffect(() => {
    map.setView([location.latitude, location.longitude], 9, {
      animate: true,
    });
  }, [location, map]);

  return null;
}

function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthMiles = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return earthMiles * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function MapMoveWatcher({
  location,
  onMoved,
}: {
  location: ResolvedLocation | null;
  onMoved: (center: { lat: number; lng: number } | null) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      if (!location) {
        onMoved({ lat: center.lat, lng: center.lng });
        return;
      }

      const active = { lat: location.latitude, lng: location.longitude };
      onMoved(
        milesBetween(active, { lat: center.lat, lng: center.lng }) > 2
          ? { lat: center.lat, lng: center.lng }
          : null
      );
    },
  });

  useEffect(() => {
    onMoved(null);
  }, [location, onMoved]);

  return null;
}

function ClickSearchMarker({
  point,
  onClickPoint,
  onSearch,
  onCancel,
}: {
  point: PendingMapPoint | null;
  onClickPoint: (lat: number, lng: number) => void;
  onSearch: (lat: number, lng: number) => void;
  onCancel: () => void;
}) {
  const markerRef = useRef<LeafletMarker | null>(null);

  useMapEvents({
    click: (event) => {
      const original = event.originalEvent.target as HTMLElement | null;
      if (original?.closest(".leaflet-marker-icon, .leaflet-popup")) return;
      onClickPoint(event.latlng.lat, event.latlng.lng);
    },
  });

  useEffect(() => {
    markerRef.current?.openPopup();
  }, [point]);

  if (!point) return null;

  const title =
    point.location
      ? `${point.location.city}, ${point.location.state}`
      : point.status === "loading"
        ? "Resolving location..."
        : "Location lookup failed";

  return (
    <Marker
      ref={markerRef}
      position={[point.latitude, point.longitude]}
      zIndexOffset={1200}
    >
      <Popup closeButton={false}>
        <div style={styles.clickPopup}>
          <strong>{title}</strong>
          {point.location?.county && (
            <div style={styles.clickPopupMeta}>{point.location.county}</div>
          )}
          <div style={styles.clickPopupMeta}>
            {point.latitude.toFixed(4)}, {point.longitude.toFixed(4)}
          </div>
          {point.error && (
            <div style={styles.clickPopupError}>{point.error}</div>
          )}
          <div style={styles.clickPopupActions}>
            <button
              style={styles.clickPopupPrimary}
              disabled={point.status === "loading"}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onSearch(point.latitude, point.longitude);
              }}
            >
              Search Here
            </button>
            <button
              style={styles.clickPopupSecondary}
              onMouseDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onCancel();
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

function IpGeoController() {
  const map = useMap();
  const done = useRef(false);

  useEffect(() => {
    if (done.current || !navigator.geolocation) {
      done.current = true;
      return;
    }
    done.current = true;

    const timeout = setTimeout(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 5, {
            animate: true,
          });
        },
        () => {},
        { timeout: 4000, enableHighAccuracy: false }
      );
    }, 200);

    return () => clearTimeout(timeout);
  }, [map]);

  return null;
}

function MapControlPanel({
  radius,
  sourceFilters,
  severityFilters,
  showWeatherOverlay,
  weatherLayerMode,
  onToggleSource,
  onToggleSeverity,
  onToggleWeatherOverlay,
  onWeatherLayerModeChange,
  onRadiusChange,
}: {
  radius: RadiusOption;
  sourceFilters: SourceFilters;
  severityFilters: SeverityFilters;
  showWeatherOverlay: boolean;
  weatherLayerMode: WeatherLayerMode;
  onToggleSource: (source: EventSource) => void;
  onToggleSeverity: (severity: Severity) => void;
  onToggleWeatherOverlay: (show: boolean) => void;
  onWeatherLayerModeChange: (mode: WeatherLayerMode) => void;
  onRadiusChange: (radius: RadiusOption) => void;
}) {
  return (
    <div style={styles.controlPanel}>
      <div style={styles.controlGroup}>
        <div style={styles.controlLabel}>Sources</div>
        <div style={styles.chipRow}>
          {EVENT_SOURCES.map((source) => {
            const active = sourceFilters[source];
            return (
              <button
                key={source}
                onClick={() => onToggleSource(source)}
                style={{
                  ...styles.chip,
                  ...(active
                    ? {
                        color: "#fff",
                        background: sourceColor(source),
                        border: `1px solid ${sourceColor(source)}`,
                      }
                    : {}),
                }}
              >
                {source}
              </button>
            );
          })}
        </div>
      </div>
      <div style={styles.controlGroup}>
        <div style={styles.controlLabel}>Severity</div>
        <div style={styles.chipRow}>
          {EVENT_SEVERITIES.map((severity) => {
            const active = severityFilters[severity];
            return (
              <button
                key={severity}
                onClick={() => onToggleSeverity(severity)}
                style={{
                  ...styles.chip,
                  ...(active
                    ? {
                        color: severityColor(severity),
                        background: `${severityColor(severity)}18`,
                        border: `1px solid ${severityColor(severity)}66`,
                      }
                    : {}),
                }}
              >
                {severity}
              </button>
            );
          })}
        </div>
      </div>
      <div style={styles.controlGroup}>
        <div style={styles.controlLabel}>Radius</div>
        <div style={styles.chipRow}>
          {([10, 25, 50, 100] as RadiusOption[]).map((option) => (
            <button
              key={option}
              onClick={() => onRadiusChange(option)}
              style={{
                ...styles.chip,
                ...(option === radius ? styles.radiusActive : {}),
              }}
            >
              {option} mi
            </button>
          ))}
        </div>
      </div>
      <div style={styles.weatherModeGroup}>
        <label style={styles.weatherToggle}>
          <input
            type="checkbox"
            checked={showWeatherOverlay}
            onChange={(event) => onToggleWeatherOverlay(event.target.checked)}
            style={styles.checkbox}
          />
          NWS layer
        </label>
        <div style={styles.weatherModeRow}>
          {WEATHER_LAYER_OPTIONS.map((option) => {
            const active = option.mode === weatherLayerMode;
            return (
              <button
                key={option.mode}
                type="button"
                onClick={() => {
                  onWeatherLayerModeChange(option.mode);
                  if (!showWeatherOverlay) onToggleWeatherOverlay(true);
                }}
                style={{
                  ...styles.weatherModeChip,
                  ...(active ? styles.weatherModeActive : {}),
                }}
                title={`Show NWS ${option.label.toLowerCase()} layer`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function MapView({
  location,
  radius,
  events,
  weatherOverlay,
  showWeatherOverlay,
  weatherLayerMode,
  sourceFilters,
  severityFilters,
  onToggleSource,
  onToggleSeverity,
  onToggleWeatherOverlay,
  onWeatherLayerModeChange,
  onRadiusChange,
  onSearchMapArea,
  mapSearchLoading,
  onEventClick,
}: MapViewProps) {
  const [movedCenter, setMovedCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [pendingPoint, setPendingPoint] = useState<PendingMapPoint | null>(null);

  function handleClickPoint(lat: number, lng: number) {
    const nextPoint: PendingMapPoint = {
      latitude: lat,
      longitude: lng,
      status: "loading",
      location: null,
      error: null,
    };
    setPendingPoint(nextPoint);

    resolveCoordinates(lat, lng)
      .then((resolved) => {
        setPendingPoint((current) => {
          if (
            !current ||
            Math.abs(current.latitude - lat) > 0.0001 ||
            Math.abs(current.longitude - lng) > 0.0001
          ) {
            return current;
          }

          return {
            ...current,
            status: resolved ? "ready" : "error",
            location: resolved,
            error: resolved ? null : "Could not identify this point.",
          };
        });
      })
      .catch((error) => {
        setPendingPoint((current) => {
          if (
            !current ||
            Math.abs(current.latitude - lat) > 0.0001 ||
            Math.abs(current.longitude - lng) > 0.0001
          ) {
            return current;
          }

          return {
            ...current,
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "Location lookup failed.",
          };
        });
      });
  }

  const center: [number, number] = location
    ? [location.latitude, location.longitude]
    : [39.8283, -98.5795];

  return (
    <div style={{ flex: 1, position: "relative" }}>
      <MapContainer
        center={center}
        zoom={4}
        style={{ width: "100%", height: "100%" }}
        zoomControl={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <IpGeoController />
        <MapMoveWatcher location={location} onMoved={setMovedCenter} />
        {location && (
          <>
            <MapController location={location} />
            <Circle
              center={[location.latitude, location.longitude]}
              radius={radius * 1609.34}
              pathOptions={{
                color: "#1565c0",
                fillColor: "#1565c0",
                fillOpacity: 0.08,
                weight: 2,
                dashArray: "6 4",
              }}
            />
            <Marker position={[location.latitude, location.longitude]}>
              <Popup>
                {location.city}, {location.state}
                <br />
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Popup>
            </Marker>
          </>
        )}
        <EventMapLayers events={events} onEventClick={onEventClick} />
        <ClickSearchMarker
          point={pendingPoint}
          onClickPoint={handleClickPoint}
          onSearch={(lat, lng) => {
            onSearchMapArea(lat, lng);
            setPendingPoint(null);
            setMovedCenter(null);
          }}
          onCancel={() => setPendingPoint(null)}
        />
        <NwsWeatherMapLayers
          overlay={weatherOverlay}
          visible={showWeatherOverlay}
          mode={weatherLayerMode}
        />
        <MapLegend showWeatherOverlay={showWeatherOverlay} />
      </MapContainer>
      <MapControlPanel
        radius={radius}
        sourceFilters={sourceFilters}
        severityFilters={severityFilters}
        showWeatherOverlay={showWeatherOverlay}
        weatherLayerMode={weatherLayerMode}
        onToggleSource={onToggleSource}
        onToggleSeverity={onToggleSeverity}
        onToggleWeatherOverlay={onToggleWeatherOverlay}
        onWeatherLayerModeChange={onWeatherLayerModeChange}
        onRadiusChange={onRadiusChange}
      />
      {movedCenter && (
        <button
          style={styles.searchAreaButton}
          onClick={() => {
            onSearchMapArea(movedCenter.lat, movedCenter.lng);
            setMovedCenter(null);
          }}
          disabled={mapSearchLoading}
        >
          {mapSearchLoading ? "Searching area..." : "Search this area"}
        </button>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  controlPanel: {
    position: "absolute",
    top: 12,
    left: 54,
    right: 12,
    zIndex: 1000,
    display: "grid",
    gridTemplateColumns: "1.1fr 1.35fr auto minmax(270px, 1fr)",
    gap: 10,
    alignItems: "end",
    padding: "8px 10px",
    background: "rgba(255,255,255,0.94)",
    border: "1px solid #dfe6ee",
    borderRadius: 8,
    boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
    fontFamily: "system-ui, sans-serif",
  },
  controlGroup: {
    minWidth: 0,
  },
  controlLabel: {
    fontSize: 10,
    color: "#757575",
    fontWeight: 800,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  chipRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 5,
  },
  chip: {
    border: "1px solid #cfd8dc",
    borderRadius: 5,
    background: "#fff",
    color: "#424242",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 7px",
    cursor: "pointer",
    lineHeight: 1,
  },
  radiusActive: {
    color: "#fff",
    background: "#1565c0",
    border: "1px solid #1565c0",
  },
  weatherToggle: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    fontSize: 12,
    fontWeight: 700,
    color: "#424242",
    whiteSpace: "nowrap",
    paddingBottom: 2,
    cursor: "pointer",
  },
  weatherModeGroup: {
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  weatherModeRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 5,
  },
  weatherModeChip: {
    border: "1px solid #cfd8dc",
    borderRadius: 5,
    background: "#fff",
    color: "#424242",
    fontSize: 11,
    fontWeight: 700,
    padding: "4px 7px",
    cursor: "pointer",
    lineHeight: 1,
  },
  weatherModeActive: {
    color: "#fff",
    background: "#00897b",
    border: "1px solid #00897b",
  },
  checkbox: {
    width: 15,
    height: 15,
    accentColor: "#1565c0",
  },
  searchAreaButton: {
    position: "absolute",
    top: 82,
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 1000,
    border: "1px solid #1565c0",
    borderRadius: 7,
    background: "#1565c0",
    color: "#fff",
    fontSize: 13,
    fontWeight: 800,
    padding: "8px 14px",
    boxShadow: "0 3px 12px rgba(0,0,0,0.18)",
    cursor: "pointer",
  },
  clickPopup: {
    minWidth: 180,
    fontFamily: "system-ui, sans-serif",
    color: "#212121",
  },
  clickPopupMeta: {
    fontSize: 12,
    color: "#616161",
    marginTop: 3,
  },
  clickPopupError: {
    fontSize: 12,
    color: "#c62828",
    marginTop: 6,
  },
  clickPopupActions: {
    display: "flex",
    gap: 6,
    marginTop: 10,
  },
  clickPopupPrimary: {
    border: "1px solid #1565c0",
    borderRadius: 5,
    background: "#1565c0",
    color: "#fff",
    fontSize: 12,
    fontWeight: 800,
    padding: "5px 8px",
    cursor: "pointer",
  },
  clickPopupSecondary: {
    border: "1px solid #cfd8dc",
    borderRadius: 5,
    background: "#fff",
    color: "#424242",
    fontSize: 12,
    fontWeight: 700,
    padding: "5px 8px",
    cursor: "pointer",
  },
};
