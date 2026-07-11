import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { SearchBar } from "./components/SearchBar";
import { MapView } from "./components/MapView";
import { UpdatePanel } from "./components/UpdatePanel";
import { FeedExplorer } from "./components/FeedExplorer";
import { SavedLocationList } from "./components/SavedLocationList";
import { EventDetailPanel } from "./components/EventDetailPanel";
import { RiskCommandBar } from "./components/RiskCommandBar";
import { useResolvedLocation } from "./hooks/useResolvedLocation";
import { useNwsWeatherOverlay } from "./hooks/useNwsWeatherOverlay";
import { useRiskFeeds } from "./hooks/useRiskFeeds";
import { useSavedLocations } from "./hooks/useSavedLocations";
import {
  defaultSeverityFilters,
  defaultSourceFilters,
  filterEvents,
} from "./lib/riskInsights";
import { isCurrentImpact } from "./lib/impactInsights";
import type { RadiusOption, Criticality, LocationType } from "./types/location";
import type { EventSource, RiskEvent, Severity } from "./types/riskEvent";
import type { WeatherLayerMode } from "./types/weatherLayer";

const RADIUS_OPTIONS: RadiusOption[] = [10, 25, 50, 100];
const WEATHER_LAYER_MODES: WeatherLayerMode[] = [
  "temp",
  "precip",
  "thunder",
  "heat",
  "wind",
  "stations",
];
const EXAMPLE_SEARCHES = [
  "Chicago, IL",
  "Miami, FL",
  "San Francisco, CA",
  "Nashville, TN",
  "New Orleans, LA",
];

function readInitialQuery(): string {
  if (typeof window === "undefined") return "";
  return new URLSearchParams(window.location.search).get("q") ?? "";
}

function readInitialRadius(): RadiusOption {
  if (typeof window === "undefined") return 50;
  const value = Number(new URLSearchParams(window.location.search).get("radius"));
  return RADIUS_OPTIONS.includes(value as RadiusOption)
    ? (value as RadiusOption)
    : 50;
}

function readInitialWeatherOverlay(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("weather") === "1";
}

function readInitialWeatherLayerMode(): WeatherLayerMode {
  if (typeof window === "undefined") return "temp";
  const value = new URLSearchParams(window.location.search).get("layer");
  return WEATHER_LAYER_MODES.includes(value as WeatherLayerMode)
    ? (value as WeatherLayerMode)
    : "temp";
}

function coordsMatch(
  a: { latitude: number; longitude: number } | null,
  b: { latitude: number; longitude: number } | null
): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.latitude - b.latitude) < 0.001 &&
    Math.abs(a.longitude - b.longitude) < 0.001
  );
}

function FirstRunPanel({
  loading,
  geoLoading,
  geoError,
  onExampleSearch,
  onUseCurrentLocation,
}: {
  loading: boolean;
  geoLoading: boolean;
  geoError: string | null;
  onExampleSearch: (query: string) => void;
  onUseCurrentLocation: () => void;
}) {
  return (
    <div className="first-run-panel" style={styles.firstRunPanel}>
      <div style={styles.firstRunContent}>
        <div style={styles.firstRunTitle}>Start with a location</div>
        <div style={styles.firstRunText}>
          Search a city or ZIP code to load live alerts, environmental signals,
          river gauges, forecasts, and nearby hazards.
        </div>
        <div style={styles.exampleRow}>
          {EXAMPLE_SEARCHES.map((example) => (
            <button
              key={example}
              type="button"
              style={styles.exampleButton}
              disabled={loading || geoLoading}
              onClick={() => onExampleSearch(example)}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
      <div style={styles.firstRunAction}>
        <button
          type="button"
          style={styles.locationButton}
          disabled={loading || geoLoading}
          onClick={onUseCurrentLocation}
        >
          {geoLoading ? "Locating..." : "Use my location"}
        </button>
        {geoError && <div style={styles.geoError}>{geoError}</div>}
      </div>
    </div>
  );
}

export default function App() {
  const [initialQuery] = useState(readInitialQuery);
  const initialSearchStarted = useRef(false);
  const {
    query,
    setQuery,
    result,
    error: locError,
    loading,
    search,
    searchFor,
    searchCoordinates,
  } =
    useResolvedLocation(initialQuery);
  const [radius, setRadius] = useState<RadiusOption>(readInitialRadius);
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(
    readInitialWeatherOverlay
  );
  const [weatherLayerMode, setWeatherLayerMode] =
    useState<WeatherLayerMode>(readInitialWeatherLayerMode);
  const [feedExplorerCollapsed, setFeedExplorerCollapsed] = useState(false);
  const [currentImpactOnly, setCurrentImpactOnly] = useState(false);
  const [sourceFilters, setSourceFilters] = useState(defaultSourceFilters);
  const [severityFilters, setSeverityFilters] = useState(defaultSeverityFilters);
  const [selectedEvent, setSelectedEvent] = useState<RiskEvent | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const {
    weatherAlerts,
    earthquakes,
    femaDeclarations,
    wildfires,
    spcOutlooks,
    nhcStorms,
    gdacsEvents,
    eonetEvents,
    emscEvents,
    currentWeather,
    supplementalSignals,
    sourceHealth,
    allEvents,
    error: feedError,
    refetch,
    lastUpdated,
    isFetching,
  } = useRiskFeeds(result, radius);

  const {
    overlay: weatherOverlay,
    isLoading: weatherOverlayLoading,
    error: weatherOverlayError,
  } = useNwsWeatherOverlay(result, showWeatherOverlay);

  const {
    savedLocations,
    saveLocation,
    deleteLocation,
    updateLocation,
    isSaving,
  } = useSavedLocations();

  const activeSavedLocation =
    savedLocations.find((l) => coordsMatch(l, result)) ?? null;

  const filteredEvents = useMemo(() => {
    const visible = filterEvents(allEvents, sourceFilters, severityFilters);
    if (!currentImpactOnly) return visible;
    return visible.filter((event) => isCurrentImpact(event, result, radius));
  }, [allEvents, sourceFilters, severityFilters, currentImpactOnly, result, radius]);

  useEffect(() => {
    if (initialSearchStarted.current || !initialQuery.trim()) return;
    initialSearchStarted.current = true;
    searchFor(initialQuery);
  }, [initialQuery, searchFor]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!result && !initialQuery.trim()) return;

    const params = new URLSearchParams(window.location.search);
    if (result) {
      params.set("q", result.postalCode ?? `${result.city}, ${result.state}`);
    }
    params.set("radius", String(radius));
    if (showWeatherOverlay) {
      params.set("weather", "1");
    } else {
      params.delete("weather");
    }
    if (weatherLayerMode !== "temp") {
      params.set("layer", weatherLayerMode);
    } else {
      params.delete("layer");
    }

    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    if (nextUrl !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(null, "", nextUrl);
    }
  }, [initialQuery, radius, result, showWeatherOverlay, weatherLayerMode]);

  const handleToggleSource = useCallback((source: EventSource) => {
    setSourceFilters((current) => ({
      ...current,
      [source]: !current[source],
    }));
  }, []);

  const handleToggleSeverity = useCallback((severity: Severity) => {
    setSeverityFilters((current) => ({
      ...current,
      [severity]: !current[severity],
    }));
  }, []);

  const handleSelectEvent = useCallback((event: RiskEvent) => {
    setSelectedEvent(event);
  }, []);

  const handleSaveLocation = useCallback(() => {
    if (!result) return;
    saveLocation({
      label: `${result.city}, ${result.state}`,
      input: query,
      inputType: /^\d{5}$/.test(query) ? "zip" : "city_state",
      city: result.city,
      state: result.state,
      postalCode: result.postalCode,
      country: result.country,
      latitude: result.latitude,
      longitude: result.longitude,
      county: result.county,
      stateFips: result.stateFips,
      countyFips: result.countyFips,
    });
  }, [result, query, saveLocation]);

  const handleSelectSaved = useCallback(
    (loc: (typeof savedLocations)[number]) => {
      const input = loc.postalCode
        ? loc.postalCode
        : `${loc.city}, ${loc.state}`;
      searchFor(input);
    },
    [searchFor]
  );

  const handleExampleSearch = useCallback(
    (example: string) => {
      setGeoError(null);
      searchFor(example);
    },
    [searchFor]
  );

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Location access is not available in this browser.");
      return;
    }

    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGeoLoading(false);
        searchCoordinates(position.coords.latitude, position.coords.longitude);
      },
      (error) => {
        setGeoLoading(false);
        setGeoError(
          error.message || "Could not get your current location."
        );
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300_000 }
    );
  }, [searchCoordinates]);

  return (
    <div className="app-shell" style={styles.root}>
      <div className="app-main" style={styles.leftCol}>
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          onSearch={search}
          loading={loading}
          error={locError}
        />
        {!result && (
          <FirstRunPanel
            loading={loading}
            geoLoading={geoLoading}
            geoError={geoError}
            onExampleSearch={handleExampleSearch}
            onUseCurrentLocation={handleUseCurrentLocation}
          />
        )}
        <SavedLocationList
          savedLocations={savedLocations}
          activeLocationId={activeSavedLocation?.id ?? null}
          onSelect={handleSelectSaved}
          onDelete={deleteLocation}
          onUpdateLabel={(id, label) => updateLocation(id, { label })}
        />
        <RiskCommandBar
          location={result}
          radius={radius}
          events={allEvents}
          currentWeather={currentWeather}
          currentImpactOnly={currentImpactOnly}
          onToggleCurrentImpact={setCurrentImpactOnly}
          onEventClick={handleSelectEvent}
        />
        <MapView
          location={result}
          radius={radius}
          events={filteredEvents}
          weatherOverlay={weatherOverlay}
          showWeatherOverlay={showWeatherOverlay}
          weatherLayerMode={weatherLayerMode}
          weatherOverlayLoading={weatherOverlayLoading}
          weatherOverlayError={weatherOverlayError}
          sourceFilters={sourceFilters}
          severityFilters={severityFilters}
          currentImpactOnly={currentImpactOnly}
          onToggleSource={handleToggleSource}
          onToggleSeverity={handleToggleSeverity}
          onToggleWeatherOverlay={setShowWeatherOverlay}
          onWeatherLayerModeChange={setWeatherLayerMode}
          onRadiusChange={setRadius}
          onSearchMapArea={searchCoordinates}
          mapSearchLoading={loading}
          onEventClick={handleSelectEvent}
        />
        <FeedExplorer
          events={filteredEvents}
          totalEvents={allEvents.length}
          location={result}
          radius={radius}
          isFetching={isFetching}
          collapsed={feedExplorerCollapsed}
          onCollapsedChange={setFeedExplorerCollapsed}
          onEventClick={handleSelectEvent}
        />
      </div>
      <UpdatePanel
        location={result}
        radius={radius}
        onRadiusChange={setRadius}
        weatherAlerts={weatherAlerts}
        earthquakes={earthquakes}
        femaDeclarations={femaDeclarations}
        wildfires={wildfires}
        spcOutlooks={spcOutlooks}
        nhcStorms={nhcStorms}
        gdacsEvents={gdacsEvents}
        eonetEvents={eonetEvents}
        emscEvents={emscEvents}
        currentWeather={currentWeather}
        supplementalSignals={supplementalSignals}
        sourceHealth={sourceHealth}
        weatherOverlay={weatherOverlay}
        showWeatherOverlay={showWeatherOverlay}
        weatherLayerMode={weatherLayerMode}
        onToggleWeatherOverlay={setShowWeatherOverlay}
        onWeatherLayerModeChange={setWeatherLayerMode}
        weatherOverlayLoading={weatherOverlayLoading}
        weatherOverlayError={weatherOverlayError}
        isFetching={isFetching}
        lastUpdated={lastUpdated}
        error={feedError}
        onRefresh={refetch}
        activeSavedLocation={activeSavedLocation}
        onSaveLocation={handleSaveLocation}
        onUpdateLabel={(label) => {
          if (activeSavedLocation) {
            updateLocation(activeSavedLocation.id, { label });
          }
        }}
        onUpdateCriticality={(c) => {
          if (activeSavedLocation) {
            updateLocation(activeSavedLocation.id, {
              criticality: c as Criticality,
            });
          }
        }}
        onUpdateType={(t) => {
          if (activeSavedLocation) {
            updateLocation(activeSavedLocation.id, {
              locationType: t as LocationType,
            });
          }
        }}
        onDeleteLocation={() => {
          if (activeSavedLocation) {
            deleteLocation(activeSavedLocation.id);
          }
        }}
        isSaving={isSaving}
      />
      {selectedEvent && (
        <EventDetailPanel
          event={selectedEvent}
          location={result}
          radius={radius}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  leftCol: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  firstRunPanel: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    padding: "14px 16px",
    background: "#f7f9fb",
    borderBottom: "1px solid #dfe6ee",
  },
  firstRunContent: {
    minWidth: 0,
  },
  firstRunTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#212121",
    marginBottom: 4,
  },
  firstRunText: {
    fontSize: 13,
    color: "#616161",
    lineHeight: 1.4,
    maxWidth: 760,
  },
  exampleRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 10,
  },
  exampleButton: {
    border: "1px solid #cfd8dc",
    borderRadius: 6,
    background: "#fff",
    color: "#1565c0",
    fontSize: 12,
    fontWeight: 800,
    padding: "6px 9px",
    cursor: "pointer",
  },
  firstRunAction: {
    flex: "0 0 auto",
    width: "min(180px, 100%)",
  },
  locationButton: {
    width: "100%",
    border: "1px solid #1565c0",
    borderRadius: 6,
    background: "#1565c0",
    color: "#fff",
    fontSize: 13,
    fontWeight: 800,
    padding: "8px 10px",
    cursor: "pointer",
  },
  geoError: {
    marginTop: 6,
    color: "#c62828",
    fontSize: 12,
    lineHeight: 1.3,
  },
};
