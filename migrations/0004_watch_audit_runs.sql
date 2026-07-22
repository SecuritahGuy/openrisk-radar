CREATE TABLE IF NOT EXISTS watch_audit_runs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TEXT NOT NULL,
  completed_at TEXT,
  selected_count INTEGER NOT NULL DEFAULT 0,
  processed_count INTEGER NOT NULL DEFAULT 0,
  degraded_count INTEGER NOT NULL DEFAULT 0,
  failed_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  error TEXT
);

CREATE INDEX IF NOT EXISTS watch_audit_runs_started_idx
  ON watch_audit_runs (started_at DESC);
