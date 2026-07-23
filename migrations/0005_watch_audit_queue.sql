CREATE TABLE IF NOT EXISTS watch_audit_jobs (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  watch_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'completed')),
  result_status TEXT CHECK (result_status IN ('processed', 'degraded', 'failed')),
  created_at TEXT NOT NULL,
  completed_at TEXT,
  error TEXT,
  FOREIGN KEY (run_id) REFERENCES watch_audit_runs(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS watch_audit_jobs_run_watch_idx
  ON watch_audit_jobs (run_id, watch_id);

CREATE INDEX IF NOT EXISTS watch_audit_jobs_status_idx
  ON watch_audit_jobs (status, created_at);
