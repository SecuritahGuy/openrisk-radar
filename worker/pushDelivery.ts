import webpush from "web-push";
import type { D1Database } from "./d1";
import { decryptPushSubscription } from "./pushCrypto";

export interface PushQueueMessage {
  deliveryId: string;
}

export interface PushDeliveryEnv {
  DB?: D1Database;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
  PUSH_DATA_KEY?: string;
}

interface DeliveryRow {
  id: string;
  subscription_id: string;
  payload_json: string;
  subscription_ciphertext: string;
  subscription_iv: string;
  subscription_status: "active" | "invalid";
}

export function pushFailureAction(statusCode?: number): "invalid" | "retry" | "failed" {
  if (statusCode === 404 || statusCode === 410) return "invalid";
  if (statusCode === 429 || (statusCode !== undefined && statusCode >= 500)) return "retry";
  return "failed";
}

export async function deliverPushMessage(env: PushDeliveryEnv, deliveryId: string): Promise<void> {
  if (!env.DB || !env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT || !env.PUSH_DATA_KEY) {
    throw new Error("Push delivery is not configured");
  }
  const row = await env.DB.prepare(`
    SELECT d.id, d.subscription_id, d.payload_json,
      s.subscription_ciphertext, s.subscription_iv, s.status AS subscription_status
    FROM push_deliveries d
    JOIN push_subscriptions s ON s.id = d.subscription_id
    WHERE d.id = ?1 AND d.status = 'queued'
  `).bind(deliveryId).first<DeliveryRow>();
  if (!row || row.subscription_status !== "active") return;

  const now = new Date().toISOString();
  await env.DB.prepare(`
    UPDATE push_deliveries SET attempt_count = attempt_count + 1, updated_at = ?1 WHERE id = ?2
  `).bind(now, deliveryId).run();
  const subscription = await decryptPushSubscription(
    row.subscription_ciphertext,
    row.subscription_iv,
    env.PUSH_DATA_KEY
  );
  webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  try {
    const result = await webpush.sendNotification(subscription, row.payload_json, { TTL: 300, urgency: "high" });
    await env.DB.prepare(`
      UPDATE push_deliveries SET status = 'sent', provider_status = ?1, sent_at = ?2,
        updated_at = ?2, last_error = NULL WHERE id = ?3
    `).bind(result.statusCode, now, deliveryId).run();
    await env.DB.prepare(`
      UPDATE push_subscriptions SET last_success_at = ?1, consecutive_failures = 0,
        last_error = NULL, updated_at = ?1 WHERE id = ?2
    `).bind(now, row.subscription_id).run();
  } catch (error) {
    const statusCode = typeof error === "object" && error && "statusCode" in error
      ? Number((error as { statusCode: unknown }).statusCode)
      : undefined;
    const action = pushFailureAction(statusCode);
    const message = action === "invalid"
      ? "The browser push subscription expired"
      : action === "retry"
        ? `The push provider is temporarily unavailable${statusCode ? ` (${statusCode})` : ""}`
        : `The push provider rejected the notification${statusCode ? ` (${statusCode})` : ""}`;
    const deliveryStatus = action === "invalid" ? "invalid" : action === "failed" ? "failed" : "queued";
    await env.DB.prepare(`
      UPDATE push_deliveries SET status = ?1, provider_status = ?2, last_error = ?3,
        updated_at = ?4 WHERE id = ?5
    `).bind(deliveryStatus, statusCode ?? null, message, now, deliveryId).run();
    await env.DB.prepare(`
      UPDATE push_subscriptions SET status = CASE WHEN ?1 = 'invalid' THEN 'invalid' ELSE status END,
        last_failure_at = ?2, consecutive_failures = consecutive_failures + 1,
        last_error = ?3, updated_at = ?2 WHERE id = ?4
    `).bind(action, now, message, row.subscription_id).run();
    if (action === "retry") throw new Error(message);
  }
}
