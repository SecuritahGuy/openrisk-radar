import type { RiskEvent } from "../src/types/riskEvent";
import type { D1Database } from "./d1";
import type { PushQueueBinding } from "./watchPush";

const MAX_AUTOMATED_BATCHES_PER_HOUR = 3;

interface SubscriptionIdRow {
  id: string;
}

interface DeliveryRateRow {
  batch_count: number;
}

export interface AutomatedPushOptions {
  enabled: boolean;
  canaryPercent: number;
  configured: boolean;
  queue?: PushQueueBinding;
}

export interface AutomatedPushInput {
  watchId: string;
  fingerprint: string;
  delivery: "immediate" | "daily";
  locationLabel: string;
  matchCount: number;
  topEvent: RiskEvent;
  now: string;
}

export interface AutomatedPushResult {
  queued: number;
  suppressedReason: "disabled" | "outside_canary" | "unconfigured" | "rate_limited" | "no_subscriptions" | null;
}

function stableBucket(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100;
}

function shortHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function normalizeCanaryPercent(value: string | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.min(100, Math.round(parsed)));
}

export function watchInAutomatedPushCanary(watchId: string, canaryPercent: number): boolean {
  return canaryPercent >= 100 || (canaryPercent > 0 && stableBucket(watchId) < canaryPercent);
}

function payload(input: AutomatedPushInput, deliveryId: string) {
  const extra = input.matchCount > 1 ? ` and ${input.matchCount - 1} other matching signal${input.matchCount === 2 ? "" : "s"}` : "";
  return {
    title: input.delivery === "daily" ? `OpenRisk Radar digest · ${input.locationLabel}` : `Risk update · ${input.locationLabel}`,
    body: `${input.topEvent.headline}${extra}`,
    tag: `openrisk-${input.watchId}`,
    data: { url: "/app?notification=watch", watchId: input.watchId, deliveryId },
  };
}

export async function queueAutomatedPush(
  db: D1Database,
  options: AutomatedPushOptions,
  input: AutomatedPushInput
): Promise<AutomatedPushResult> {
  if (!options.enabled) return { queued: 0, suppressedReason: "disabled" };
  if (!options.configured || !options.queue) return { queued: 0, suppressedReason: "unconfigured" };
  if (!watchInAutomatedPushCanary(input.watchId, options.canaryPercent)) {
    return { queued: 0, suppressedReason: "outside_canary" };
  }
  const since = new Date(new Date(input.now).getTime() - 60 * 60_000).toISOString();
  const recent = await db.prepare(`
    SELECT COUNT(DISTINCT created_at) AS batch_count FROM push_deliveries
    WHERE watch_id = ?1 AND kind IN ('incident', 'digest') AND created_at >= ?2
  `).bind(input.watchId, since).first<DeliveryRateRow>();
  if ((recent?.batch_count ?? 0) >= MAX_AUTOMATED_BATCHES_PER_HOUR) {
    return { queued: 0, suppressedReason: "rate_limited" };
  }
  const subscriptions = await db.prepare(`
    SELECT s.id FROM push_subscriptions s
    JOIN watch_push_subscriptions wps ON wps.subscription_id = s.id
    WHERE wps.watch_id = ?1 AND s.status = 'active'
    ORDER BY s.created_at ASC
  `).bind(input.watchId).all<SubscriptionIdRow>();
  const rows = subscriptions.results ?? [];
  if (rows.length === 0) return { queued: 0, suppressedReason: "no_subscriptions" };

  const kind = input.delivery === "daily" ? "digest" : "incident";
  const batchKey = `${kind}:${input.watchId}:${shortHash(input.fingerprint)}`;
  let queued = 0;
  for (const subscription of rows) {
    const deliveryKey = `${batchKey}:${subscription.id}`;
    const existing = await db.prepare(
      "SELECT id FROM push_deliveries WHERE delivery_key = ?1"
    ).bind(deliveryKey).first<{ id: string }>();
    if (existing) continue;
    const deliveryId = crypto.randomUUID();
    await db.prepare(`
      INSERT INTO push_deliveries (
        id, delivery_key, watch_id, subscription_id, kind, payload_json,
        status, created_at, updated_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'queued', ?7, ?7)
    `).bind(
      deliveryId,
      deliveryKey,
      input.watchId,
      subscription.id,
      kind,
      JSON.stringify(payload(input, deliveryId)),
      input.now
    ).run();
    try {
      await options.queue.send({ deliveryId });
      queued += 1;
    } catch (error) {
      await db.prepare(`
        UPDATE push_deliveries SET status = 'failed', last_error = ?1, updated_at = ?2
        WHERE id = ?3
      `).bind(
        error instanceof Error ? error.message.slice(0, 500) : "The delivery queue was unavailable",
        new Date().toISOString(),
        deliveryId
      ).run();
    }
  }
  return { queued, suppressedReason: queued > 0 ? null : "no_subscriptions" };
}
