PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS watches (
  id TEXT PRIMARY KEY,
  secret_hash TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  radius_miles INTEGER NOT NULL,
  preferences_json TEXT NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'expired')),
  next_check_at TEXT NOT NULL,
  last_checked_at TEXT,
  last_incident_fingerprint TEXT,
  last_match_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS watches_due_idx
  ON watches (status, next_check_at);

CREATE INDEX IF NOT EXISTS watches_expiration_idx
  ON watches (expires_at);

CREATE TABLE IF NOT EXISTS watch_audit_events (
  id TEXT PRIMARY KEY,
  watch_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('baseline', 'change', 'resolved', 'error')),
  would_notify INTEGER NOT NULL DEFAULT 0,
  suppressed_reason TEXT,
  incident_fingerprint TEXT,
  match_count INTEGER NOT NULL DEFAULT 0,
  top_headline TEXT,
  top_severity TEXT,
  sources_json TEXT NOT NULL DEFAULT '[]',
  detail TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (watch_id) REFERENCES watches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS watch_audit_watch_created_idx
  ON watch_audit_events (watch_id, created_at DESC);
