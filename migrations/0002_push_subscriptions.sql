PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  endpoint_hash TEXT NOT NULL UNIQUE,
  subscription_ciphertext TEXT NOT NULL,
  subscription_iv TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invalid')),
  expiration_time INTEGER,
  last_success_at TEXT,
  last_failure_at TEXT,
  consecutive_failures INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS push_subscriptions_status_idx
  ON push_subscriptions (status, updated_at);

CREATE TABLE IF NOT EXISTS watch_push_subscriptions (
  watch_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (watch_id, subscription_id),
  FOREIGN KEY (watch_id) REFERENCES watches(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS watch_push_subscription_idx
  ON watch_push_subscriptions (subscription_id);

CREATE TABLE IF NOT EXISTS push_deliveries (
  id TEXT PRIMARY KEY,
  delivery_key TEXT NOT NULL UNIQUE,
  watch_id TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('test', 'incident', 'digest')),
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'failed', 'invalid')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  provider_status INTEGER,
  last_error TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (watch_id) REFERENCES watches(id) ON DELETE CASCADE,
  FOREIGN KEY (subscription_id) REFERENCES push_subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS push_deliveries_watch_created_idx
  ON push_deliveries (watch_id, created_at DESC);

CREATE INDEX IF NOT EXISTS push_deliveries_status_idx
  ON push_deliveries (status, updated_at);
