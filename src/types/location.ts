export type InputType = "zip" | "city_state";

export type Criticality = "Low" | "Medium" | "High";

export type LocationType = "Office" | "Supplier" | "Data Center" | "Travel" | "Facility" | "Custom";

export type WatchHazard = "weather" | "flood" | "wildfire" | "earthquake" | "tropical" | "other";
export type WatchDelivery = "immediate" | "daily";

export interface WatchPreferences {
  enabled: boolean;
  minimumSeverity: "Minor" | "Moderate" | "Severe" | "Extreme";
  hazards: WatchHazard[];
  delivery: WatchDelivery;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  expiresAt: string | null;
}

export interface CloudWatchAuditEvent {
  id: string;
  kind: "baseline" | "change" | "resolved" | "error";
  wouldNotify: boolean;
  suppressedReason: string | null;
  matchCount: number;
  topHeadline: string | null;
  topSeverity: string | null;
  sources: string[];
  detail: string | null;
  createdAt: string;
}

export interface CloudWatchLink {
  id: string;
  token: string;
  status: "active" | "paused" | "expired" | "error";
  lastSyncedAt: string;
  nextCheckAt: string | null;
  lastCheckedAt: string | null;
  lastMatchCount: number;
  lastError: string | null;
  latestAudit: CloudWatchAuditEvent | null;
  pushNotification?: PushNotificationLink;
}

export interface PushNotificationLink {
  subscriptionId: string;
  status: "active" | "invalid" | "error";
  enabledAt: string;
  lastTestStatus: "queued" | "sent" | "failed" | "invalid" | null;
  lastTestAt: string | null;
  lastError: string | null;
}

export interface Location {
  id: string;
  label: string;
  input: string;
  inputType: InputType;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  latitude: number;
  longitude: number;
  county: string | null;
  stateFips: string | null;
  countyFips: string | null;
  radiusMiles: number;
  criticality: Criticality;
  locationType: LocationType;
  tags: string[];
  createdAt: string;
  lastCheckedAt: string;
  watch?: WatchPreferences;
  cloudWatch?: CloudWatchLink;
}

export interface LocationInput {
  raw: string;
  parsed: {
    type: InputType;
    city?: string;
    state?: string;
    zip?: string;
    display: string;
  };
}

export interface ResolvedLocation {
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  latitude: number;
  longitude: number;
  county: string | null;
  stateFips: string | null;
  countyFips: string | null;
}

export type RadiusOption = 10 | 25 | 50 | 100;
