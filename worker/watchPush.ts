import type { D1Database } from "./d1";
import { encryptPushSubscription, hashPushEndpoint, validatePushSubscription } from "./pushCrypto";
import type { WorkerQueueBinding } from "./queueMessages";
import { authorizeWatch, watchApiError, watchApiJson } from "./watchRegistry";

const MAX_BODY_BYTES = 12 * 1024;
const MAX_SUBSCRIPTIONS_PER_WATCH = 5;
const COLLECTION_PATH = /^\/api\/watches\/([0-9a-f-]+)\/push-subscriptions$/i;
const ITEM_PATH = /^\/api\/watches\/([0-9a-f-]+)\/push-subscriptions\/([0-9a-f-]+)$/i;
const TEST_PATH = /^\/api\/watches\/([0-9a-f-]+)\/push-subscriptions\/([0-9a-f-]+)\/test$/i;

export type PushQueueBinding = WorkerQueueBinding;

export interface WatchPushEnv {
  DB: D1Database;
  PUSH_QUEUE?: PushQueueBinding;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  PUSH_DATA_KEY?: string;
  AUTOMATED_PUSH_ENABLED?: string;
}

interface SubscriptionRow {
  id: string;
  status: "active" | "invalid";
  expiration_time: number | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
}

interface DeliveryStatusRow {
  id: string;
  subscription_id: string;
  kind: "test" | "incident" | "digest";
  status: "queued" | "sent" | "failed" | "invalid";
  provider_status: number | null;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

async function bodyJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("Content-Length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
  return JSON.parse(text);
}

function publicSubscription(row: SubscriptionRow) {
  return {
    id: row.id,
    status: row.status,
    expirationTime: row.expiration_time,
    lastSuccessAt: row.last_success_at,
    lastFailureAt: row.last_failure_at,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function listSubscriptions(env: WatchPushEnv, request: Request, watchId: string): Promise<Response> {
  if (!await authorizeWatch(env.DB, request, watchId)) {
    return watchApiError("WATCH_NOT_FOUND", "Watch not found or control token is invalid", 404);
  }
  const subscriptions = await env.DB.prepare(`
    SELECT s.id, s.status, s.expiration_time, s.last_success_at, s.last_failure_at,
      s.last_error, s.created_at, s.updated_at
    FROM push_subscriptions s
    JOIN watch_push_subscriptions wps ON wps.subscription_id = s.id
    WHERE wps.watch_id = ?1 ORDER BY wps.created_at DESC
  `).bind(watchId).all<SubscriptionRow>();
  const deliveries = await env.DB.prepare(`
    SELECT id, subscription_id, kind, status, provider_status, last_error, created_at, sent_at
    FROM push_deliveries WHERE watch_id = ?1 ORDER BY created_at DESC LIMIT 10
  `).bind(watchId).all<DeliveryStatusRow>();
  return watchApiJson({
    subscriptions: (subscriptions.results ?? []).map(publicSubscription),
    deliveries: (deliveries.results ?? []).map((row) => ({
      id: row.id,
      subscriptionId: row.subscription_id,
      kind: row.kind,
      status: row.status,
      providerStatus: row.provider_status,
      lastError: row.last_error,
      createdAt: row.created_at,
      sentAt: row.sent_at,
    })),
    automatedDelivery: env.AUTOMATED_PUSH_ENABLED === "true",
  });
}

async function addSubscription(env: WatchPushEnv, request: Request, watchId: string): Promise<Response> {
  if (!sameOrigin(request)) return watchApiError("ORIGIN_NOT_ALLOWED", "Cross-origin notification enrollment is not allowed", 403);
  if (!env.PUSH_DATA_KEY) return watchApiError("PUSH_UNAVAILABLE", "Notification enrollment is not configured", 503);
  if (!await authorizeWatch(env.DB, request, watchId)) {
    return watchApiError("WATCH_NOT_FOUND", "Watch not found or control token is invalid", 404);
  }
  let raw: unknown;
  try {
    raw = await bodyJson(request);
  } catch {
    return watchApiError("INVALID_SUBSCRIPTION", "The browser notification subscription is invalid", 400);
  }
  const subscription = validatePushSubscription(raw);
  if (!subscription) return watchApiError("INVALID_SUBSCRIPTION", "The browser notification subscription is invalid", 400);
  const endpointHash = await hashPushEndpoint(subscription.endpoint);
  const existing = await env.DB.prepare(
    "SELECT id FROM push_subscriptions WHERE endpoint_hash = ?1"
  ).bind(endpointHash).first<{ id: string }>();
  const count = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM watch_push_subscriptions WHERE watch_id = ?1"
  ).bind(watchId).first<{ count: number }>();
  const alreadyLinked = existing
    ? await env.DB.prepare(
      "SELECT 1 AS linked FROM watch_push_subscriptions WHERE watch_id = ?1 AND subscription_id = ?2"
    ).bind(watchId, existing.id).first<{ linked: number }>()
    : null;
  if (!alreadyLinked && (count?.count ?? 0) >= MAX_SUBSCRIPTIONS_PER_WATCH) {
    return watchApiError("DEVICE_LIMIT_REACHED", "This watch already has the maximum number of notification devices", 409);
  }
  const now = new Date().toISOString();
  const encrypted = await encryptPushSubscription(subscription, env.PUSH_DATA_KEY);
  const subscriptionId = existing?.id ?? crypto.randomUUID();
  await env.DB.prepare(`
    INSERT INTO push_subscriptions (
      id, endpoint_hash, subscription_ciphertext, subscription_iv, status,
      expiration_time, created_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, 'active', ?5, ?6, ?6)
    ON CONFLICT(endpoint_hash) DO UPDATE SET
      subscription_ciphertext = excluded.subscription_ciphertext,
      subscription_iv = excluded.subscription_iv, status = 'active',
      expiration_time = excluded.expiration_time, last_error = NULL,
      consecutive_failures = 0, updated_at = excluded.updated_at
  `).bind(
    subscriptionId,
    endpointHash,
    encrypted.ciphertext,
    encrypted.iv,
    subscription.expirationTime,
    now
  ).run();
  await env.DB.prepare(`
    INSERT OR IGNORE INTO watch_push_subscriptions (watch_id, subscription_id, created_at)
    VALUES (?1, ?2, ?3)
  `).bind(watchId, subscriptionId, now).run();
  const row = await env.DB.prepare(`
    SELECT id, status, expiration_time, last_success_at, last_failure_at,
      last_error, created_at, updated_at FROM push_subscriptions WHERE id = ?1
  `).bind(subscriptionId).first<SubscriptionRow>();
  return watchApiJson({ subscription: row ? publicSubscription(row) : null }, existing ? 200 : 201);
}

async function removeSubscription(
  env: WatchPushEnv,
  request: Request,
  watchId: string,
  subscriptionId: string
): Promise<Response> {
  if (!sameOrigin(request)) return watchApiError("ORIGIN_NOT_ALLOWED", "Cross-origin notification removal is not allowed", 403);
  if (!await authorizeWatch(env.DB, request, watchId)) {
    return watchApiError("WATCH_NOT_FOUND", "Watch not found or control token is invalid", 404);
  }
  const linked = await env.DB.prepare(`
    SELECT 1 AS linked FROM watch_push_subscriptions WHERE watch_id = ?1 AND subscription_id = ?2
  `).bind(watchId, subscriptionId).first<{ linked: number }>();
  if (!linked) return watchApiError("SUBSCRIPTION_NOT_FOUND", "Notification device not found for this watch", 404);
  await env.DB.prepare(
    "DELETE FROM push_deliveries WHERE watch_id = ?1 AND subscription_id = ?2"
  ).bind(watchId, subscriptionId).run();
  await env.DB.prepare(
    "DELETE FROM watch_push_subscriptions WHERE watch_id = ?1 AND subscription_id = ?2"
  ).bind(watchId, subscriptionId).run();
  const remaining = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM watch_push_subscriptions WHERE subscription_id = ?1"
  ).bind(subscriptionId).first<{ count: number }>();
  if ((remaining?.count ?? 0) === 0) {
    await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?1").bind(subscriptionId).run();
  }
  return watchApiJson({ removed: true, remainingWatchLinks: remaining?.count ?? 0 });
}

async function sendTest(
  env: WatchPushEnv,
  request: Request,
  watchId: string,
  subscriptionId: string
): Promise<Response> {
  if (!sameOrigin(request)) return watchApiError("ORIGIN_NOT_ALLOWED", "Cross-origin test delivery is not allowed", 403);
  if (!env.PUSH_QUEUE || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT || !env.PUSH_DATA_KEY) {
    return watchApiError("PUSH_UNAVAILABLE", "Notification delivery is not configured", 503);
  }
  if (!await authorizeWatch(env.DB, request, watchId)) {
    return watchApiError("WATCH_NOT_FOUND", "Watch not found or control token is invalid", 404);
  }
  const linked = await env.DB.prepare(`
    SELECT s.status FROM push_subscriptions s
    JOIN watch_push_subscriptions wps ON wps.subscription_id = s.id
    WHERE wps.watch_id = ?1 AND s.id = ?2
  `).bind(watchId, subscriptionId).first<{ status: string }>();
  if (!linked || linked.status !== "active") {
    return watchApiError("SUBSCRIPTION_NOT_FOUND", "An active notification device was not found", 404);
  }
  const now = new Date().toISOString();
  const deliveryId = crypto.randomUUID();
  const payload = {
    title: "OpenRisk Radar",
    body: "Test notification — this device is ready for watched-location risk updates.",
    tag: `openrisk-test-${watchId}`,
    data: { url: "/?notification=test", watchId, deliveryId },
  };
  await env.DB.prepare(`
    INSERT INTO push_deliveries (
      id, delivery_key, watch_id, subscription_id, kind, payload_json,
      status, created_at, updated_at
    ) VALUES (?1, ?2, ?3, ?4, 'test', ?5, 'queued', ?6, ?6)
  `).bind(deliveryId, `test:${deliveryId}`, watchId, subscriptionId, JSON.stringify(payload), now).run();
  try {
    await env.PUSH_QUEUE.send({ deliveryId });
  } catch (error) {
    await env.DB.prepare(`
      UPDATE push_deliveries SET status = 'failed', last_error = ?1, updated_at = ?2 WHERE id = ?3
    `).bind("The delivery queue was unavailable", new Date().toISOString(), deliveryId).run();
    throw error;
  }
  return watchApiJson({ delivery: { id: deliveryId, status: "queued", createdAt: now } }, 202);
}

export async function handleWatchPushRequest(request: Request, env: WatchPushEnv): Promise<Response | null> {
  const pathname = new URL(request.url).pathname;
  const testMatch = pathname.match(TEST_PATH);
  if (testMatch) {
    if (request.method !== "POST") return watchApiError("METHOD_NOT_ALLOWED", "Only POST is supported", 405);
    return sendTest(env, request, testMatch[1], testMatch[2]);
  }
  const itemMatch = pathname.match(ITEM_PATH);
  if (itemMatch) {
    if (request.method !== "DELETE") return watchApiError("METHOD_NOT_ALLOWED", "Only DELETE is supported", 405);
    return removeSubscription(env, request, itemMatch[1], itemMatch[2]);
  }
  const collectionMatch = pathname.match(COLLECTION_PATH);
  if (!collectionMatch) return null;
  if (request.method === "GET") return listSubscriptions(env, request, collectionMatch[1]);
  if (request.method === "POST") return addSubscription(env, request, collectionMatch[1]);
  return watchApiError("METHOD_NOT_ALLOWED", "Only GET and POST are supported", 405);
}
