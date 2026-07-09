import { useState, useCallback, useMemo } from "react";
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

export default function App() {
  const {
    query,
    setQuery,
    result,
    error: locError,
    loading,
    search,
    searchCoordinates,
  } =
    useResolvedLocation();
  const [radius, setRadius] = useState<RadiusOption>(50);
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(false);
  const [weatherLayerMode, setWeatherLayerMode] =
    useState<WeatherLayerMode>("temp");
  const [feedExplorerCollapsed, setFeedExplorerCollapsed] = useState(false);
  const [currentImpactOnly, setCurrentImpactOnly] = useState(false);
  const [sourceFilters, setSourceFilters] = useState(defaultSourceFilters);
  const [severityFilters, setSeverityFilters] = useState(defaultSeverityFilters);
  const [selectedEvent, setSelectedEvent] = useState<RiskEvent | null>(null);

  const {
    weatherAlerts,
    earthquakes,
    femaDeclarations,
    wildfires,
    spcOutlooks,
    currentWeather,
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
      setQuery(input);
      setTimeout(() => search(), 0);
    },
    [setQuery, search]
  );

  return (
    <div style={styles.root}>
      <div style={styles.leftCol}>
        <SearchBar
          query={query}
          onQueryChange={setQuery}
          onSearch={search}
          loading={loading}
          error={locError}
        />
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
          onEventClick={setSelectedEvent}
        />
        <MapView
          location={result}
          radius={radius}
          events={filteredEvents}
          weatherOverlay={weatherOverlay}
          showWeatherOverlay={showWeatherOverlay}
          weatherLayerMode={weatherLayerMode}
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
          onEventClick={setSelectedEvent}
        />
        <FeedExplorer
          events={filteredEvents}
          totalEvents={allEvents.length}
          location={result}
          radius={radius}
          isFetching={isFetching}
          collapsed={feedExplorerCollapsed}
          onCollapsedChange={setFeedExplorerCollapsed}
          onEventClick={setSelectedEvent}
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
        currentWeather={currentWeather}
        weatherOverlay={weatherOverlay}
        showWeatherOverlay={showWeatherOverlay}
        onToggleWeatherOverlay={setShowWeatherOverlay}
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
};
