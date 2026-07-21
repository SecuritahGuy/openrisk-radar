import type { Location, WatchHazard, WatchPreferences } from "../types/location";
import type { EventCategory, RiskEvent, Severity } from "../types/riskEvent";

export const WATCH_HAZARDS: Array<{ id: WatchHazard; label: string }> = [
  { id: "weather", label: "Weather" },
  { id: "flood", label: "Flood & water" },
  { id: "wildfire", label: "Wildfire" },
  { id: "earthquake", label: "Earthquake" },
  { id: "tropical", label: "Tropical" },
  { id: "other", label: "Other hazards" },
];

export const DEFAULT_WATCH_PREFERENCES: WatchPreferences = {
  enabled: true,
  minimumSeverity: "Moderate",
  hazards: WATCH_HAZARDS.map((hazard) => hazard.id),
  delivery: "immediate",
  quietHoursEnabled: true,
  quietHoursStart: "22:00",
  quietHoursEnd: "07:00",
  expiresAt: null,
};

const SEVERITY_RANK: Record<Severity, number> = {
  Minor: 1,
  Moderate: 2,
  Severe: 3,
  Extreme: 4,
};

const CATEGORY_HAZARD: Record<EventCategory, WatchHazard> = {
  Weather: "weather",
  Ice: "weather",
  Dust: "weather",
  "UV Index": "weather",
  Pollen: "weather",
  "River Gauge": "flood",
  "Coastal Water": "flood",
  Drought: "flood",
  Wildfire: "wildfire",
  "Air Quality": "other",
  Seismic: "earthquake",
  Tropical: "tropical",
  Disaster: "other",
  Volcanic: "other",
  Landslide: "other",
  Transportation: "other",
  "Space Weather": "other",
};

export function watchPreferencesFor(location: Pick<Location, "watch">): WatchPreferences {
  return {
    ...DEFAULT_WATCH_PREFERENCES,
    ...location.watch,
    hazards: location.watch?.hazards?.length
      ? [...location.watch.hazards]
      : [...DEFAULT_WATCH_PREFERENCES.hazards],
  };
}

export function isWatchExpired(preferences: WatchPreferences, nowMs = Date.now()): boolean {
  if (!preferences.expiresAt) return false;
  const expires = new Date(preferences.expiresAt).getTime();
  return Number.isFinite(expires) && expires <= nowMs;
}

export function eventMatchesWatch(
  event: RiskEvent,
  preferences: WatchPreferences,
  nowMs = Date.now()
): boolean {
  if (!preferences.enabled || isWatchExpired(preferences, nowMs)) return false;
  if (SEVERITY_RANK[event.severity] < SEVERITY_RANK[preferences.minimumSeverity]) return false;
  return preferences.hazards.includes(CATEGORY_HAZARD[event.category]);
}

export function watchExpiration(days: number | null, nowMs = Date.now()): string | null {
  if (days == null) return null;
  return new Date(nowMs + days * 24 * 60 * 60 * 1000).toISOString();
}
