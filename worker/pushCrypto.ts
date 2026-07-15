export interface WebPushSubscriptionData {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

const MAX_ENDPOINT_LENGTH = 4_096;
const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function validatePushSubscription(value: unknown): WebPushSubscriptionData | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  const keys = candidate.keys as Record<string, unknown> | undefined;
  if (typeof candidate.endpoint !== "string" || candidate.endpoint.length > MAX_ENDPOINT_LENGTH) return null;
  try {
    if (new URL(candidate.endpoint).protocol !== "https:") return null;
  } catch {
    return null;
  }
  if (!keys || typeof keys.p256dh !== "string" || typeof keys.auth !== "string") return null;
  if (!BASE64URL.test(keys.p256dh) || !BASE64URL.test(keys.auth)) return null;
  if (keys.p256dh.length < 40 || keys.p256dh.length > 256 || keys.auth.length < 8 || keys.auth.length > 128) return null;
  if (candidate.expirationTime !== null && candidate.expirationTime !== undefined &&
      (typeof candidate.expirationTime !== "number" || !Number.isFinite(candidate.expirationTime))) return null;
  return {
    endpoint: candidate.endpoint,
    expirationTime: typeof candidate.expirationTime === "number" ? candidate.expirationTime : null,
    keys: { p256dh: keys.p256dh, auth: keys.auth },
  };
}

export async function hashPushEndpoint(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function encryptionKey(secret: string): Promise<CryptoKey> {
  const bytes = base64UrlToBytes(secret);
  if (bytes.byteLength !== 32) throw new Error("PUSH_DATA_KEY must contain exactly 32 bytes");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptPushSubscription(
  subscription: WebPushSubscriptionData,
  secret: string
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(secret),
    new TextEncoder().encode(JSON.stringify(subscription))
  );
  return { ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)), iv: bytesToBase64Url(iv) };
}

export async function decryptPushSubscription(
  ciphertext: string,
  iv: string,
  secret: string
): Promise<WebPushSubscriptionData> {
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64UrlToBytes(iv) },
    await encryptionKey(secret),
    base64UrlToBytes(ciphertext)
  );
  const parsed = validatePushSubscription(JSON.parse(new TextDecoder().decode(plaintext)));
  if (!parsed) throw new Error("Stored push subscription is invalid");
  return parsed;
}
