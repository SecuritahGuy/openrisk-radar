import type { WatchPreferences } from "../src/types/location";
import type { D1Database } from "./d1";
import {
  hashWatchSecret,
  newWatchSecret,
  nextWatchCheck,
  validateWatchRegistration,
  watchStatus,
} from "./watchDomain";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_ACTIVE_WATCHES = 5_000;
const WATCH_PATH = /^\/api\/watches\/([0-9a-f-]+)\/status$/i;
const WATCH_ITEM_PATH = /^\/api\/watches\/([0-9a-f-]+)$/i;

export interface WatchRow {
  id: string;
  secret_hash: string;
  latitude: number;
  longitude: number;
  radius_miles: number;
  preferences_json: string;
  timezone: string;
  status: "active" | "paused" | "expired";
  next_check_at: string;
  last_checked_at: string | null;
  last_match_count: number;
  last_error: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface AuditRow {
  id: string;
  kind: "baseline" | "change" | "resolved" | "error";
  would_notify: number;
  suppressed_reason: string | null;
  match_count: number;
  top_headline: string | null;
  top_severity: string | null;
  sources_json: string;
  detail: string | null;
  created_at: string;
}

export function watchApiJson(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function watchApiError(code: string, message: string, status: number): Response {
  return watchApiJson({ error: { code, message } }, status);
}

function sameOriginMutation(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

async function readBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("Content-Length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("INVALID_JSON");
  }
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get("Authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7) : null;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

export async function authorizeWatch(db: D1Database, request: Request, id: string): Promise<WatchRow | null> {
  const token = bearerToken(request);
  if (!token || token.length > 256) return null;
  const row = await db.prepare("SELECT * FROM watches WHERE id = ?1").bind(id).first<WatchRow>();
  if (!row) return null;
  const suppliedHash = await hashWatchSecret(token);
  return safeEqual(row.secret_hash, suppliedHash) ? row : null;
}

function publicWatch(row: WatchRow) {
  return {
    id: row.id,
    status: row.status,
    radiusMiles: row.radius_miles,
    timezone: row.timezone,
    preferences: JSON.parse(row.preferences_json) as WatchPreferences,
    nextCheckAt: row.next_check_at,
    lastCheckedAt: row.last_checked_at,
    lastMatchCount: row.last_match_count,
    lastError: row.last_error,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    auditMode: true,
    evaluatedSources: ["NWS", "USGS", "NIFC"],
  };
}

async function createWatch(db: D1Database, request: Request): Promise<Response> {
  if (!sameOriginMutation(request)) return watchApiError("ORIGIN_NOT_ALLOWED", "Cross-origin watch registration is not allowed", 403);
  let body: unknown;
  try {
    body = await readBody(request);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_BODY";
    return watchApiError(code, code === "BODY_TOO_LARGE" ? "Request body is too large" : "Request body must be valid JSON", 400);
  }
  const validation = validateWatchRegistration(body);
  if (!validation.valid || !validation.value) {
    return watchApiError("INVALID_WATCH", validation.message ?? "Watch registration is invalid", 400);
  }
  const count = await db.prepare("SELECT COUNT(*) AS count FROM watches WHERE status != 'expired'").first<{ count: number }>();
  if ((count?.count ?? 0) >= MAX_ACTIVE_WATCHES) {
    return watchApiError("WATCH_CAPACITY_REACHED", "The free audit registry is currently at capacity", 503);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const token = newWatchSecret();
  const secretHash = await hashWatchSecret(token);
  const { location, preferences, timezone } = validation.value;
  const status = watchStatus(preferences);
  const nextCheckAt = status === "active" ? now : nextWatchCheck(preferences);

  await db.prepare(`
    INSERT INTO watches (
      id, secret_hash, latitude, longitude, radius_miles, preferences_json,
      timezone, status, next_check_at, expires_at, created_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
  `).bind(
    id,
    secretHash,
    location.latitude,
    location.longitude,
    location.radiusMiles,
    JSON.stringify(preferences),
    timezone,
    status,
    nextCheckAt,
    preferences.expiresAt,
    now,
    now
  ).run();

  const row = await db.prepare("SELECT * FROM watches WHERE id = ?1").bind(id).first<WatchRow>();
  return watchApiJson({ watch: row ? publicWatch(row) : null, credentials: { id, token } }, 201);
}

async function updateWatch(db: D1Database, request: Request, id: string): Promise<Response> {
  if (!sameOriginMutation(request)) return watchApiError("ORIGIN_NOT_ALLOWED", "Cross-origin watch updates are not allowed", 403);
  const existing = await authorizeWatch(db, request, id);
  if (!existing) return watchApiError("WATCH_NOT_FOUND", "Watch not found or control token is invalid", 404);
  let body: unknown;
  try {
    body = await readBody(request);
  } catch (error) {
    const code = error instanceof Error ? error.message : "INVALID_BODY";
    return watchApiError(code, code === "BODY_TOO_LARGE" ? "Request body is too large" : "Request body must be valid JSON", 400);
  }
  const validation = validateWatchRegistration(body);
  if (!validation.valid || !validation.value) {
    return watchApiError("INVALID_WATCH", validation.message ?? "Watch update is invalid", 400);
  }
  const now = new Date().toISOString();
  const { location, preferences, timezone } = validation.value;
  const status = watchStatus(preferences);
  const nextCheckAt = status === "active" ? now : nextWatchCheck(preferences);
  await db.prepare(`
    UPDATE watches SET latitude = ?1, longitude = ?2, radius_miles = ?3,
      preferences_json = ?4, timezone = ?5, status = ?6, next_check_at = ?7,
      expires_at = ?8, updated_at = ?9, last_error = NULL,
      last_incident_fingerprint = NULL, last_match_count = 0
    WHERE id = ?10
  `).bind(
    location.latitude,
    location.longitude,
    location.radiusMiles,
    JSON.stringify(preferences),
    timezone,
    status,
    nextCheckAt,
    preferences.expiresAt,
    now,
    id
  ).run();
  const row = await db.prepare("SELECT * FROM watches WHERE id = ?1").bind(id).first<WatchRow>();
  return watchApiJson({ watch: row ? publicWatch(row) : null });
}

async function watchStatusResponse(db: D1Database, request: Request, id: string): Promise<Response> {
  const row = await authorizeWatch(db, request, id);
  if (!row) return watchApiError("WATCH_NOT_FOUND", "Watch not found or control token is invalid", 404);
  const audit = await db.prepare(`
    SELECT id, kind, would_notify, suppressed_reason, match_count, top_headline,
      top_severity, sources_json, detail, created_at
    FROM watch_audit_events WHERE watch_id = ?1 ORDER BY created_at DESC LIMIT 10
  `).bind(id).all<AuditRow>();
  return watchApiJson({
    watch: publicWatch(row),
    audit: (audit.results ?? []).map((event) => ({
      id: event.id,
      kind: event.kind,
      wouldNotify: event.would_notify === 1,
      suppressedReason: event.suppressed_reason,
      matchCount: event.match_count,
      topHeadline: event.top_headline,
      topSeverity: event.top_severity,
      sources: JSON.parse(event.sources_json) as string[],
      detail: event.detail,
      createdAt: event.created_at,
    })),
  });
}

async function deleteWatch(db: D1Database, request: Request, id: string): Promise<Response> {
  if (!sameOriginMutation(request)) return watchApiError("ORIGIN_NOT_ALLOWED", "Cross-origin watch deletion is not allowed", 403);
  const existing = await authorizeWatch(db, request, id);
  if (!existing) return watchApiError("WATCH_NOT_FOUND", "Watch not found or control token is invalid", 404);
  const subscriptions = await db.prepare(
    "SELECT subscription_id FROM watch_push_subscriptions WHERE watch_id = ?1"
  ).bind(id).all<{ subscription_id: string }>();
  await db.prepare("DELETE FROM watch_audit_events WHERE watch_id = ?1").bind(id).run();
  await db.prepare("DELETE FROM push_deliveries WHERE watch_id = ?1").bind(id).run();
  await db.prepare("DELETE FROM watch_push_subscriptions WHERE watch_id = ?1").bind(id).run();
  await db.prepare("DELETE FROM watches WHERE id = ?1").bind(id).run();
  for (const subscription of subscriptions.results ?? []) {
    await db.prepare(`
      DELETE FROM push_subscriptions WHERE id = ?1
        AND NOT EXISTS (
          SELECT 1 FROM watch_push_subscriptions WHERE subscription_id = ?1
        )
    `).bind(subscription.subscription_id).run();
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}

export async function handleWatchRequest(request: Request, db: D1Database): Promise<Response | null> {
  const url = new URL(request.url);
  if (url.pathname === "/api/watches") {
    if (request.method !== "POST") {
      const response = watchApiError("METHOD_NOT_ALLOWED", "Only POST is supported", 405);
      response.headers.set("Allow", "POST");
      return response;
    }
    return createWatch(db, request);
  }

  const statusMatch = url.pathname.match(WATCH_PATH);
  if (statusMatch) {
    if (request.method !== "GET") {
      const response = watchApiError("METHOD_NOT_ALLOWED", "Only GET is supported", 405);
      response.headers.set("Allow", "GET");
      return response;
    }
    return watchStatusResponse(db, request, statusMatch[1]);
  }

  const itemMatch = url.pathname.match(WATCH_ITEM_PATH);
  if (!itemMatch) return null;
  if (request.method === "PATCH") return updateWatch(db, request, itemMatch[1]);
  if (request.method === "DELETE") return deleteWatch(db, request, itemMatch[1]);
  const response = watchApiError("METHOD_NOT_ALLOWED", "Only PATCH and DELETE are supported", 405);
  response.headers.set("Allow", "PATCH, DELETE");
  return response;
}
