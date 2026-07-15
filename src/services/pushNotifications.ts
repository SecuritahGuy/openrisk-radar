import type { CloudWatchLink, PushNotificationLink } from "../types/location";

interface PushConfig {
  configured: boolean;
  publicKey: string | null;
  automatedDelivery: boolean;
}

interface SubscriptionResponse {
  subscription: {
    id: string;
    status: "active" | "invalid";
    lastError: string | null;
  };
  error?: { message?: string };
}

interface StatusResponse {
  subscriptions: Array<{
    id: string;
    status: "active" | "invalid";
    lastError: string | null;
  }>;
  deliveries: Array<{
    subscriptionId: string;
    kind: "test" | "incident" | "digest";
    status: "queued" | "sent" | "failed" | "invalid";
    lastError: string | null;
    createdAt: string;
    sentAt: string | null;
  }>;
  error?: { message?: string };
}

export interface PushCapability {
  supported: boolean;
  permission: NotificationPermission | "unsupported";
  requiresIosInstall: boolean;
  reason: string | null;
}

function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone(): boolean {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true);
}

export function pushCapability(): PushCapability {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (isIos() && !isStandalone()) {
    return {
      supported: false,
      permission: "Notification" in window ? Notification.permission : "unsupported",
      requiresIosInstall: true,
      reason: "On iPhone or iPad, add OpenRisk Radar to your Home Screen, then open it there to enable notifications.",
    };
  }
  if (!supported) {
    return {
      supported: false,
      permission: "unsupported",
      requiresIosInstall: false,
      reason: "This browser does not support web push notifications.",
    };
  }
  return {
    supported: true,
    permission: Notification.permission,
    requiresIosInstall: false,
    reason: Notification.permission === "denied"
      ? "Notifications are blocked in this browser’s site settings. Allow them there, then try again."
      : null,
  };
}

function applicationServerKey(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function checkedJson<T extends { error?: { message?: string } }>(response: Response): Promise<T> {
  const data = await response.json() as T;
  if (!response.ok) throw new Error(data.error?.message ?? `Notification request failed (${response.status})`);
  return data;
}

export async function enablePushNotifications(link: CloudWatchLink): Promise<PushNotificationLink> {
  const capability = pushCapability();
  if (!capability.supported) throw new Error(capability.reason ?? "Notifications are unavailable");
  const config = await checkedJson<PushConfig & { error?: { message?: string } }>(await fetch("/api/push/config"));
  if (!config.configured || !config.publicKey) throw new Error("Notification delivery is not configured yet");
  const permission = Notification.permission === "granted"
    ? "granted"
    : await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(permission === "denied" ? "Notifications were blocked by this browser" : "Notification permission was not granted");
  }
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: applicationServerKey(config.publicKey),
  });
  const response = await fetch(`/api/watches/${encodeURIComponent(link.id)}/push-subscriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${link.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(subscription.toJSON()),
  });
  const data = await checkedJson<SubscriptionResponse>(response);
  return {
    subscriptionId: data.subscription.id,
    status: data.subscription.status,
    enabledAt: new Date().toISOString(),
    lastTestStatus: null,
    lastTestAt: null,
    lastError: data.subscription.lastError,
  };
}

export async function refreshPushNotification(
  link: CloudWatchLink,
  notification: PushNotificationLink
): Promise<PushNotificationLink> {
  const data = await checkedJson<StatusResponse>(await fetch(
    `/api/watches/${encodeURIComponent(link.id)}/push-subscriptions`,
    { headers: { Authorization: `Bearer ${link.token}` } }
  ));
  const subscription = data.subscriptions.find((item) => item.id === notification.subscriptionId);
  const delivery = data.deliveries.find((item) =>
    item.subscriptionId === notification.subscriptionId && item.kind === "test"
  );
  return {
    ...notification,
    status: subscription?.status ?? "invalid",
    lastTestStatus: delivery?.status ?? notification.lastTestStatus,
    lastTestAt: delivery?.sentAt ?? delivery?.createdAt ?? notification.lastTestAt,
    lastError: delivery?.lastError ?? subscription?.lastError ?? null,
  };
}

export async function sendTestPush(link: CloudWatchLink, notification: PushNotificationLink): Promise<PushNotificationLink> {
  await checkedJson<{ error?: { message?: string } }>(await fetch(
    `/api/watches/${encodeURIComponent(link.id)}/push-subscriptions/${encodeURIComponent(notification.subscriptionId)}/test`,
    { method: "POST", headers: { Authorization: `Bearer ${link.token}` } }
  ));
  return { ...notification, lastTestStatus: "queued", lastTestAt: new Date().toISOString(), lastError: null };
}

export async function disablePushNotifications(link: CloudWatchLink, notification: PushNotificationLink): Promise<void> {
  const response = await fetch(
    `/api/watches/${encodeURIComponent(link.id)}/push-subscriptions/${encodeURIComponent(notification.subscriptionId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${link.token}` } }
  );
  const data = await checkedJson<{ remainingWatchLinks: number; error?: { message?: string } }>(response);
  if (data.remainingWatchLinks === 0 && "serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await (await registration.pushManager.getSubscription())?.unsubscribe();
  }
}
