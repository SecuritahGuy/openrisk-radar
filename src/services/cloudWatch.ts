import type {
  CloudWatchAuditEvent,
  CloudWatchLink,
  Location,
  WatchPreferences,
} from "../types/location";

interface CloudWatchPayload {
  location: {
    latitude: number;
    longitude: number;
    radiusMiles: number;
  };
  preferences: WatchPreferences;
  timezone: string;
}

interface WatchResponse {
  watch: {
    id: string;
    status: "active" | "paused" | "expired";
    nextCheckAt: string | null;
    lastCheckedAt: string | null;
    lastMatchCount: number;
    lastError: string | null;
  };
  audit?: CloudWatchAuditEvent[];
  credentials?: { id: string; token: string };
}

function payloadFor(location: Location, preferences: WatchPreferences): CloudWatchPayload {
  return {
    location: {
      latitude: Number(location.latitude.toFixed(4)),
      longitude: Number(location.longitude.toFixed(4)),
      radiusMiles: location.radiusMiles,
    },
    preferences,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

async function responseJson(response: Response): Promise<WatchResponse> {
  const data = await response.json() as WatchResponse & {
    error?: { message?: string };
  };
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Cloud watch request failed (${response.status})`);
  }
  return data;
}

function toLink(data: WatchResponse, token: string, previous?: CloudWatchLink): CloudWatchLink {
  return {
    id: data.watch.id,
    token,
    status: data.watch.status,
    lastSyncedAt: new Date().toISOString(),
    nextCheckAt: data.watch.nextCheckAt,
    lastCheckedAt: data.watch.lastCheckedAt,
    lastMatchCount: data.watch.lastMatchCount,
    lastError: data.watch.lastError,
    latestAudit: data.audit?.[0] ?? null,
    pushNotification: previous?.pushNotification,
  };
}

export async function registerCloudWatch(
  location: Location,
  preferences: WatchPreferences
): Promise<CloudWatchLink> {
  const response = await fetch("/api/watches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payloadFor(location, preferences)),
  });
  const data = await responseJson(response);
  if (!data.credentials?.token) throw new Error("Cloud watch credentials were not returned");
  return toLink(data, data.credentials.token);
}

export async function syncCloudWatch(
  location: Location,
  preferences: WatchPreferences,
  link: CloudWatchLink
): Promise<CloudWatchLink> {
  const response = await fetch(`/api/watches/${encodeURIComponent(link.id)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${link.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payloadFor(location, preferences)),
  });
  return toLink(await responseJson(response), link.token, link);
}

export async function fetchCloudWatchStatus(link: CloudWatchLink): Promise<CloudWatchLink> {
  const response = await fetch(`/api/watches/${encodeURIComponent(link.id)}/status`, {
    headers: { Authorization: `Bearer ${link.token}` },
  });
  return toLink(await responseJson(response), link.token, link);
}

export async function removeCloudWatch(link: CloudWatchLink): Promise<void> {
  const response = await fetch(`/api/watches/${encodeURIComponent(link.id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${link.token}` },
  });
  if (!response.ok && response.status !== 404) {
    const data = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(data?.error?.message ?? `Cloud watch removal failed (${response.status})`);
  }
}
