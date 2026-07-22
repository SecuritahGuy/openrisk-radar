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

interface AuditSummaryRow {
  run_count: number;
  failed_runs: number;
  degraded_watches: number;
  failed_watches: number;
  max_duration_ms: number | null;
  last_success_at: string | null;
}

interface PushSummaryRow {
  active_subscriptions: number;
  queued_deliveries: number;
  failed_deliveries: number;
  invalid_deliveries: number;
  oldest_queued_at: string | null;
}

export type OperationsHealth = "operational" | "degraded" | "critical";

export interface WatchAuditOperations {
  available: boolean;
  health: OperationsHealth;
  alerts: string[];
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
  recentRuns: {
    windowHours: 24;
    total: number;
    failed: number;
    degradedWatches: number;
    failedWatches: number;
    maxDurationMs: number | null;
    lastSuccessAt: string | null;
  };
  push: {
    activeSubscriptions: number;
    queuedDeliveries: number;
    failedDeliveries: number;
    invalidDeliveries: number;
    oldestQueuedAt: string | null;
  };
  error: string | null;
}

const emptyRecentRuns: WatchAuditOperations["recentRuns"] = {
  windowHours: 24,
  total: 0,
  failed: 0,
  degradedWatches: 0,
  failedWatches: 0,
  maxDurationMs: null,
  lastSuccessAt: null,
};

const emptyPush: WatchAuditOperations["push"] = {
  activeSubscriptions: 0,
  queuedDeliveries: 0,
  failedDeliveries: 0,
  invalidDeliveries: 0,
  oldestQueuedAt: null,
};

export function evaluateOperationsHealth(
  operations: Pick<WatchAuditOperations, "available" | "dueWatches" | "lastRun" | "recentRuns" | "push">,
  nowMs = Date.now()
): { health: OperationsHealth; alerts: string[] } {
  if (!operations.available) {
    return { health: "critical", alerts: ["Watch operations data is unavailable."] };
  }
  const critical: string[] = [];
  const degraded: string[] = [];
  const lastStartedMs = operations.lastRun ? new Date(operations.lastRun.startedAt).getTime() : NaN;
  if (!operations.lastRun || !Number.isFinite(lastStartedMs) || nowMs - lastStartedMs > 45 * 60_000) {
    critical.push("No watch audit has started in the last 45 minutes.");
  } else if (operations.lastRun.status === "failed") {
    critical.push("The latest watch audit failed.");
  } else if (operations.lastRun.status === "running" && nowMs - lastStartedMs > 20 * 60_000) {
    critical.push("The latest watch audit has been running for more than 20 minutes.");
  }
  if (operations.dueWatches > 24) {
    critical.push(`${operations.dueWatches} watches are overdue, exceeding one audit batch.`);
  } else if (operations.dueWatches > 0) {
    degraded.push(`${operations.dueWatches} watch${operations.dueWatches === 1 ? " is" : "es are"} waiting for audit.`);
  }
  if (operations.recentRuns.failed > 0 || operations.recentRuns.failedWatches > 0) {
    degraded.push(`${operations.recentRuns.failed} failed run${operations.recentRuns.failed === 1 ? "" : "s"} and ${operations.recentRuns.failedWatches} failed watch evaluation${operations.recentRuns.failedWatches === 1 ? "" : "s"} in 24 hours.`);
  }
  if (operations.recentRuns.degradedWatches > 0) {
    degraded.push(`${operations.recentRuns.degradedWatches} watch evaluation${operations.recentRuns.degradedWatches === 1 ? " used" : "s used"} partial source data in 24 hours.`);
  }
  const oldestQueuedMs = operations.push.oldestQueuedAt
    ? new Date(operations.push.oldestQueuedAt).getTime()
    : NaN;
  if (operations.push.queuedDeliveries > 0 && Number.isFinite(oldestQueuedMs) && nowMs - oldestQueuedMs > 30 * 60_000) {
    critical.push(`${operations.push.queuedDeliveries} push deliver${operations.push.queuedDeliveries === 1 ? "y is" : "ies are"} queued for more than 30 minutes.`);
  } else if (operations.push.queuedDeliveries > 0) {
    degraded.push(`${operations.push.queuedDeliveries} push deliver${operations.push.queuedDeliveries === 1 ? "y is" : "ies are"} queued.`);
  }
  if (operations.push.failedDeliveries > 0) {
    degraded.push(`${operations.push.failedDeliveries} push deliver${operations.push.failedDeliveries === 1 ? "y failed" : "ies failed"} in 24 hours.`);
  }
  if (critical.length > 0) return { health: "critical", alerts: [...critical, ...degraded] };
  if (degraded.length > 0) return { health: "degraded", alerts: degraded };
  return { health: "operational", alerts: [] };
}

export async function readWatchAuditOperations(
  db: D1Database | undefined,
  now = new Date().toISOString()
): Promise<WatchAuditOperations> {
  if (!db) {
    return {
      available: false,
      health: "critical",
      alerts: ["Watch operations data is unavailable."],
      activeWatches: 0,
      dueWatches: 0,
      lastRun: null,
      recentRuns: emptyRecentRuns,
      push: emptyPush,
      error: "D1 binding unavailable",
    };
  }
  try {
    const since = new Date(new Date(now).getTime() - 24 * 60 * 60_000).toISOString();
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
    const summary = await db.prepare(`
      SELECT COUNT(*) AS run_count,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed_runs,
        SUM(degraded_count) AS degraded_watches,
        SUM(failed_count) AS failed_watches,
        MAX(duration_ms) AS max_duration_ms,
        MAX(CASE WHEN status = 'completed' THEN completed_at ELSE NULL END) AS last_success_at
      FROM watch_audit_runs WHERE started_at >= ?1
    `).bind(since).first<AuditSummaryRow>();
    const push = await db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM push_subscriptions WHERE status = 'active') AS active_subscriptions,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) AS queued_deliveries,
        SUM(CASE WHEN status = 'failed' AND updated_at >= ?1 THEN 1 ELSE 0 END) AS failed_deliveries,
        SUM(CASE WHEN status = 'invalid' AND updated_at >= ?1 THEN 1 ELSE 0 END) AS invalid_deliveries,
        MIN(CASE WHEN status = 'queued' THEN created_at ELSE NULL END) AS oldest_queued_at
      FROM push_deliveries
    `).bind(since).first<PushSummaryRow>();
    const partial: Pick<WatchAuditOperations, "available" | "dueWatches" | "lastRun" | "recentRuns" | "push"> = {
      available: true,
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
      recentRuns: summary ? {
        windowHours: 24,
        total: summary.run_count ?? 0,
        failed: summary.failed_runs ?? 0,
        degradedWatches: summary.degraded_watches ?? 0,
        failedWatches: summary.failed_watches ?? 0,
        maxDurationMs: summary.max_duration_ms,
        lastSuccessAt: summary.last_success_at,
      } : emptyRecentRuns,
      push: push ? {
        activeSubscriptions: push.active_subscriptions ?? 0,
        queuedDeliveries: push.queued_deliveries ?? 0,
        failedDeliveries: push.failed_deliveries ?? 0,
        invalidDeliveries: push.invalid_deliveries ?? 0,
        oldestQueuedAt: push.oldest_queued_at,
      } : emptyPush,
    };
    const health = evaluateOperationsHealth(partial, new Date(now).getTime());
    return {
      ...partial,
      ...health,
      activeWatches: counts?.active_count ?? 0,
      error: null,
    };
  } catch (error) {
    return {
      available: false,
      health: "critical",
      alerts: ["Watch operations data is unavailable."],
      activeWatches: 0,
      dueWatches: 0,
      lastRun: null,
      recentRuns: emptyRecentRuns,
      push: emptyPush,
      error: error instanceof Error ? error.message : "Watch audit status unavailable",
    };
  }
}
