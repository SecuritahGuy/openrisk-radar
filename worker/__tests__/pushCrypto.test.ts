import { describe, expect, it } from "vitest";
import {
  decryptPushSubscription,
  encryptPushSubscription,
  hashPushEndpoint,
  validatePushSubscription,
  type WebPushSubscriptionData,
} from "../pushCrypto";

const subscription: WebPushSubscriptionData = {
  endpoint: "https://push.example.test/send/opaque-device-token",
  expirationTime: null,
  keys: {
    p256dh: "B".repeat(87),
    auth: "c".repeat(22),
  },
};

const key = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";

describe("push subscription protection", () => {
  it("validates a standards-shaped HTTPS subscription", () => {
    expect(validatePushSubscription(subscription)).toEqual(subscription);
    expect(validatePushSubscription({ ...subscription, endpoint: "http://push.example.test" })).toBeNull();
    expect(validatePushSubscription({ ...subscription, keys: { p256dh: "short", auth: "short" } })).toBeNull();
  });

  it("encrypts and decrypts without storing the endpoint in plaintext", async () => {
    const encrypted = await encryptPushSubscription(subscription, key);
    expect(encrypted.ciphertext).not.toContain("push.example.test");
    expect(await decryptPushSubscription(encrypted.ciphertext, encrypted.iv, key)).toEqual(subscription);
  });

  it("creates a stable, opaque endpoint hash", async () => {
    const first = await hashPushEndpoint(subscription.endpoint);
    expect(await hashPushEndpoint(subscription.endpoint)).toBe(first);
    expect(first).not.toContain(subscription.endpoint);
  });
});
