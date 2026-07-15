import type { WatchPreferences } from "../src/types/location";
import type { RiskEvent } from "../src/types/riskEvent";

export const WATCH_AUDIT_SOURCES = ["NWS", "USGS", "NIFC"] as const;
export const WATCH_RADIUS_OPTIONS = [10, 25, 50, 100] as const;
export const WATCH_TIMEZONES_MAX_LENGTH = 64;

const HAZARDS = new Set(["weather", "flood", "wildfire", "earthquake", "tropical", "other"]);
const SEVERITIES = new Set(["Minor", "Moderate", "Severe", "Extreme"]);
const DELIVERIES = new Set(["immediate", "daily"]);
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface WatchRegistrationInput {
  location: {
    latitude: number;
    longitude: number;
    radiusMiles: number;
  };
  preferences: WatchPreferences;
  timezone: string;
}

export interface ValidationResult {
  valid: boolean;
  message: string | null;
  value: WatchRegistrationInput | null;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validExpiration(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string") return false;
  return Number.isFinite(new Date(value).getTime());
}

export function validateWatchRegistration(value: unknown): ValidationResult {
  if (!isObject(value) || !isObject(value.location) || !isObject(value.preferences)) {
    return { valid: false, message: "A location and watch preferences are required", value: null };
  }

  const latitude = value.location.latitude;
  const longitude = value.location.longitude;
  const radiusMiles = value.location.radiusMiles;
  const timezone = value.timezone;
  const preferences = value.preferences;

  if (
    typeof latitude !== "number" || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
    typeof longitude !== "number" || !Number.isFinite(longitude) || longitude < -180 || longitude > 180
  ) {
    return { valid: false, message: "Valid latitude and longitude are required", value: null };
  }
  if (!WATCH_RADIUS_OPTIONS.includes(radiusMiles as (typeof WATCH_RADIUS_OPTIONS)[number])) {
    return { valid: false, message: "Radius must be 10, 25, 50, or 100 miles", value: null };
  }
  if (typeof timezone !== "string" || timezone.length < 1 || timezone.length > WATCH_TIMEZONES_MAX_LENGTH) {
    return { valid: false, message: "A valid browser timezone is required", value: null };
  }
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
  } catch {
    return { valid: false, message: "The browser timezone is not recognized", value: null };
  }

  const hazards = preferences.hazards;
  if (
    typeof preferences.enabled !== "boolean" ||
    !SEVERITIES.has(preferences.minimumSeverity as string) ||
    !Array.isArray(hazards) || hazards.length < 1 ||
    hazards.some((hazard) => typeof hazard !== "string" || !HAZARDS.has(hazard)) ||
    !DELIVERIES.has(preferences.delivery as string) ||
    typeof preferences.quietHoursEnabled !== "boolean" ||
    !TIME_PATTERN.test(preferences.quietHoursStart as string) ||
    !TIME_PATTERN.test(preferences.quietHoursEnd as string) ||
    !validExpiration(preferences.expiresAt)
  ) {
    return { valid: false, message: "Watch preferences are invalid", value: null };
  }

  return {
    valid: true,
    message: null,
    value: {
      location: { latitude, longitude, radiusMiles },
      preferences: preferences as unknown as WatchPreferences,
      timezone,
    },
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function newWatchSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

export async function hashWatchSecret(secret: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function watchStatus(preferences: WatchPreferences, nowMs = Date.now()): "active" | "paused" | "expired" {
  if (preferences.expiresAt) {
    const expiresAt = new Date(preferences.expiresAt).getTime();
    if (Number.isFinite(expiresAt) && expiresAt <= nowMs) return "expired";
  }
  return preferences.enabled ? "active" : "paused";
}

export function nextWatchCheck(preferences: WatchPreferences, nowMs = Date.now()): string {
  const interval = preferences.delivery === "daily" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  return new Date(nowMs + interval).toISOString();
}

export function incidentFingerprint(events: RiskEvent[]): string {
  if (events.length === 0) return "none";
  return events
    .map((event) => `${event.source}:${event.sourceEventId}:${event.severity}:${event.updatedAt}`)
    .sort()
    .join("|");
}

export interface AuditDecision {
  kind: "baseline" | "change" | "resolved" | null;
  wouldNotify: boolean;
  suppressedReason: "quiet_hours" | null;
}

export function classifyAuditChange(
  previousFingerprint: string | null,
  nextFingerprint: string,
  quietHours: boolean
): AuditDecision {
  if (previousFingerprint === null) {
    return { kind: "baseline", wouldNotify: false, suppressedReason: null };
  }
  if (previousFingerprint === nextFingerprint) {
    return { kind: null, wouldNotify: false, suppressedReason: null };
  }
  if (nextFingerprint === "none") {
    return { kind: "resolved", wouldNotify: false, suppressedReason: null };
  }
  return {
    kind: "change",
    wouldNotify: !quietHours,
    suppressedReason: quietHours ? "quiet_hours" : null,
  };
}

export function isWithinQuietHours(
  preferences: WatchPreferences,
  timezone: string,
  nowMs = Date.now()
): boolean {
  if (!preferences.quietHoursEnabled) return false;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(nowMs));
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? 0);
  const current = hour * 60 + minute;
  const [startHour, startMinute] = preferences.quietHoursStart.split(":").map(Number);
  const [endHour, endMinute] = preferences.quietHoursEnd.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  if (start === end) return true;
  return start < end
    ? current >= start && current < end
    : current >= start || current < end;
}
