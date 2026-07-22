import type { D1Database } from "./d1";

interface AuditRunRow {
  id: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  completed_at: string | null;
  selected_count: number;
  processed_count: number;
  degraded_count: number;
  failed_count: number;
  duration_ms: number | null;
  error: string | null;
}

interface WatchCountsRow {
  active_count: number;
  due_count: number;
}

export interface WatchAuditOperations {
  available: boolean;
  activeWatches: number;
  dueWatches: number;
  lastRun: {
    id: string;
    status: "running" | "completed" | "failed";
    startedAt: string;
    completedAt: string | null;
    selected: number;
    processed: number;
    degraded: number;
    failed: number;
    durationMs: number | null;
    error: string | null;
  } | null;
  error: string | null;
}

export async function readWatchAuditOperations(
  db: D1Database | undefined,
  now = new Date().toISOString()
): Promise<WatchAuditOperations> {
  if (!db) {
    return {
      available: false,
      activeWatches: 0,
      dueWatches: 0,
      lastRun: null,
      error: "D1 binding unavailable",
    };
  }
  try {
    const counts = await db.prepare(`
      SELECT
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count,
        SUM(CASE WHEN status = 'active' AND next_check_at <= ?1 THEN 1 ELSE 0 END) AS due_count
      FROM watches
    `).bind(now).first<WatchCountsRow>();
    const run = await db.prepare(`
      SELECT id, status, started_at, completed_at, selected_count, processed_count,
        degraded_count, failed_count, duration_ms, error
      FROM watch_audit_runs ORDER BY started_at DESC LIMIT 1
    `).first<AuditRunRow>();
    return {
      available: true,
      activeWatches: counts?.active_count ?? 0,
      dueWatches: counts?.due_count ?? 0,
      lastRun: run ? {
        id: run.id,
        status: run.status,
        startedAt: run.started_at,
        completedAt: run.completed_at,
        selected: run.selected_count,
        processed: run.processed_count,
        degraded: run.degraded_count,
        failed: run.failed_count,
        durationMs: run.duration_ms,
        error: run.error,
      } : null,
      error: null,
    };
  } catch (error) {
    return {
      available: false,
      activeWatches: 0,
      dueWatches: 0,
      lastRun: null,
      error: error instanceof Error ? error.message : "Watch audit status unavailable",
    };
  }
}
