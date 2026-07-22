import { canonicalIncidentEvents } from "../src/lib/incidents";
import { activeConcernEvents, severityRank } from "../src/lib/riskInsights";
import { eventMatchesWatch } from "../src/lib/watchPreferences";
import {
  createLocationFeedContext,
  fetchLocationEventFeeds,
  type LocationEventFeedResult,
} from "../src/services/locationEventFeeds";
import type { ResolvedLocation, WatchPreferences } from "../src/types/location";
import type { D1Database } from "./d1";
import {
  queueAutomatedPush,
  type AutomatedPushOptions,
  type AutomatedPushResult,
} from "./watchAutomation";
import {
  classifyAuditChange,
  incidentFingerprint,
  isWithinQuietHours,
  nextWatchCheck,
} from "./watchDomain";

const AUDIT_BATCH_SIZE = 24;
const AUDIT_CONCURRENCY = 3;
const AUDIT_RETENTION_DAYS = 30;
const AUDIT_LEASE_MINUTES = 20;

interface DueWatchRow {
  id: string;
  latitude: number;
  longitude: number;
  radius_miles: number;
  location_json: string;
  preferences_json: string;
  timezone: string;
  last_incident_fingerprint: string | null;
}

type WatchEvaluationStatus = "processed" | "degraded" | "failed";

export interface WatchAuditResult {
  runId: string;
  selected: number;
  processed: number;
  degraded: number;
  failed: number;
  durationMs: number;
}

export interface AuditSourceCoverage {
  usable: boolean;
  warning: string | null;
  error: string | null;
}

export function classifyAuditSourceCoverage(
  results: Array<Pick<LocationEventFeedResult, "label" | "error">>
): AuditSourceCoverage {
  if (results.length === 0) {
    return {
      usable: false,
      warning: null,
      error: "No audit-mode source currently covers the selected hazards",
    };
  }
  const failures = results.filter((result) => result.error);
  const detail = failures.map((result) => `${result.label}: ${result.error}`).join("; ");
  if (failures.length === results.length) {
    return { usable: false, warning: null, error: detail };
  }
  return { usable: true, warning: detail || null, error: null };
}

function resolvedLocation(row: DueWatchRow): ResolvedLocation {
  let saved: Partial<ResolvedLocation> = {};
  try {
    saved = JSON.parse(row.location_json || "{}") as Partial<ResolvedLocation>;
  } catch {
    saved = {};
  }
  return {
    city: saved.city ?? "",
    state: saved.state ?? "",
    postalCode: saved.postalCode ?? null,
    country: saved.country ?? "USA",
    latitude: row.latitude,
    longitude: row.longitude,
    county: saved.county ?? null,
    stateFips: saved.stateFips ?? null,
    countyFips: saved.countyFips ?? null,
  };
}

async function fetchAuditEvents(
  row: DueWatchRow,
  preferences: WatchPreferences
): Promise<LocationEventFeedResult[]> {
  return fetchLocationEventFeeds(
    createLocationFeedContext(resolvedLocation(row), row.radius_miles),
    "watch-audit",
    preferences.hazards
  );
}

function fallbackNextCheck(nowMs = Date.now()): string {
  return new Date(nowMs + 60 * 60 * 1000).toISOString();
}

function rowNextCheck(row: DueWatchRow, nowMs = Date.now()): string {
  try {
    return nextWatchCheck(JSON.parse(row.preferences_json) as WatchPreferences, nowMs);
  } catch {
    return fallbackNextCheck(nowMs);
  }
}

async function writeAuditError(db: D1Database, row: DueWatchRow, detail: string, now: string): Promise<void> {
  await db.prepare(`
    INSERT INTO watch_audit_events (
      id, watch_id, kind, would_notify, match_count, sources_json, detail, created_at
    ) VALUES (?1, ?2, 'error', 0, 0, '[]', ?3, ?4)
  `).bind(crypto.randomUUID(), row.id, detail.slice(0, 500), now).run();
  await db.prepare(`
    UPDATE watches SET last_checked_at = ?1, next_check_at = ?2,
      last_error = ?3, updated_at = ?1 WHERE id = ?4
  `).bind(now, rowNextCheck(row, new Date(now).getTime()), detail.slice(0, 500), row.id).run();
}

function locationLabel(row: DueWatchRow): string {
  const location = resolvedLocation(row);
  return [location.city, location.state || location.country].filter(Boolean).join(", ") || "watched location";
}

function pushDetail(result: AutomatedPushResult | null): string {
  if (!result) return "";
  if (result.queued > 0) {
    return ` ${result.queued} notification${result.queued === 1 ? " was" : "s were"} queued.`;
  }
  switch (result.suppressedReason) {
    case "outside_canary":
      return " Automatic delivery is held outside the current canary rollout.";
    case "rate_limited":
      return " Automatic delivery was rate-limited.";
    case "no_subscriptions":
      return " No active notification device is linked to this watch.";
    case "unconfigured":
      return " Automatic delivery is not fully configured.";
    case "disabled":
      return " Automatic delivery is disabled.";
    default:
      return "";
  }
}

async function evaluateWatch(
  db: D1Database,
  row: DueWatchRow,
  automatedPush: AutomatedPushOptions
): Promise<WatchEvaluationStatus> {
  const now = new Date().toISOString();
  const preferences = JSON.parse(row.preferences_json) as WatchPreferences;
  const sourceResults = await fetchAuditEvents(row, preferences);
  const coverage = classifyAuditSourceCoverage(sourceResults);
  if (!coverage.usable) {
    await writeAuditError(db, row, coverage.error ?? "Audit sources failed", now);
    return "failed";
  }

  const incidents = activeConcernEvents(canonicalIncidentEvents(
    sourceResults.filter((result) => !result.error).flatMap((result) => result.events)
  )).filter((event) => eventMatchesWatch(event, preferences));
  const fingerprint = incidentFingerprint(incidents);
  const top = [...incidents].sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0] ?? null;
  const quiet = isWithinQuietHours(preferences, row.timezone);
  const decision = classifyAuditChange(row.last_incident_fingerprint, fingerprint, quiet);
  let delivery: AutomatedPushResult | null = null;
  if (decision.kind === "change" && decision.wouldNotify && top) {
    delivery = await queueAutomatedPush(db, automatedPush, {
      watchId: row.id,
      fingerprint,
      delivery: preferences.delivery,
      locationLabel: locationLabel(row),
      matchCount: incidents.length,
      topEvent: top,
      now,
    });
  }

  if (decision.kind) {
    const deliverySuppression = delivery?.queued === 0 ? delivery.suppressedReason : null;
    const notificationQueued = (delivery?.queued ?? 0) > 0;
    await db.prepare(`
      INSERT INTO watch_audit_events (
        id, watch_id, kind, would_notify, suppressed_reason, incident_fingerprint,
        match_count, top_headline, top_severity, sources_json, detail, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
    `).bind(
      crypto.randomUUID(),
      row.id,
      decision.kind,
      notificationQueued ? 1 : 0,
      decision.suppressedReason ?? deliverySuppression,
      fingerprint,
      incidents.length,
      top?.headline ?? null,
      top?.severity ?? null,
      JSON.stringify(sourceResults.filter((result) => !result.error).map((result) => result.label)),
      `${decision.kind === "baseline"
        ? "Initial audit baseline established; no notification would be sent."
        : decision.kind === "resolved"
          ? "Previously matching conditions are no longer active."
          : decision.suppressedReason === "quiet_hours"
            ? "Matching conditions changed during quiet hours."
            : "Matching conditions changed."}${pushDetail(delivery)}${coverage.warning ? ` Partial source failure: ${coverage.warning}` : ""}`,
      now
    ).run();
  }

  await db.prepare(`
    UPDATE watches SET last_incident_fingerprint = ?1, last_match_count = ?2,
      last_checked_at = ?3, next_check_at = ?4, last_error = ?5, updated_at = ?3
    WHERE id = ?6
  `).bind(fingerprint, incidents.length, now, nextWatchCheck(preferences), coverage.warning, row.id).run();
  return coverage.warning ? "degraded" : "processed";
}

export async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  operation: (value: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Concurrency must be a positive integer");
  }
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < values.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await operation(values[index], index);
    }
  };
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  );
  return results;
}

async function recordRunFailure(
  db: D1Database,
  runId: string,
  detail: string,
  startedMs: number
): Promise<void> {
  try {
    await db.prepare(`
      UPDATE watch_audit_runs SET status = 'failed', completed_at = ?1,
        duration_ms = ?2, error = ?3 WHERE id = ?4
    `).bind(new Date().toISOString(), Date.now() - startedMs, detail.slice(0, 500), runId).run();
  } catch {
    // Preserve the original audit error if operational metrics cannot be updated.
  }
}

export async function runWatchAudit(
  db: D1Database,
  automatedPush: AutomatedPushOptions = {
    enabled: false,
    canaryPercent: 0,
    configured: false,
  }
): Promise<WatchAuditResult> {
  const startedMs = Date.now();
  const now = new Date(startedMs).toISOString();
  const runId = crypto.randomUUID();
  try {
    await db.prepare(`
      INSERT INTO watch_audit_runs (id, status, started_at)
      VALUES (?1, 'running', ?2)
    `).bind(runId, now).run();
    await db.prepare(`
      UPDATE watches SET status = 'expired', updated_at = ?1
      WHERE status != 'expired' AND expires_at IS NOT NULL AND expires_at <= ?1
    `).bind(now).run();

    const due = await db.prepare(`
      SELECT id, latitude, longitude, radius_miles, location_json, preferences_json, timezone,
        last_incident_fingerprint
      FROM watches
      WHERE status = 'active' AND next_check_at <= ?1
        AND (expires_at IS NULL OR expires_at > ?1)
      ORDER BY next_check_at ASC
      LIMIT ?2
    `).bind(now, AUDIT_BATCH_SIZE).all<DueWatchRow>();
    const rows = due.results ?? [];
    const leaseUntil = new Date(startedMs + AUDIT_LEASE_MINUTES * 60 * 1000).toISOString();
    for (const row of rows) {
      await db.prepare(`
        UPDATE watches SET next_check_at = ?1 WHERE id = ?2 AND next_check_at <= ?3
      `).bind(leaseUntil, row.id, now).run();
    }

    const statuses = await mapWithConcurrency(rows, AUDIT_CONCURRENCY, async (row) => {
      try {
        return await evaluateWatch(db, row, automatedPush);
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unexpected watch evaluation error";
        try {
          await writeAuditError(db, row, detail, new Date().toISOString());
        } catch {
          // The run-level failure count still exposes an isolated row failure.
        }
        return "failed" as const;
      }
    });

    await db.prepare("DELETE FROM watch_audit_events WHERE created_at < ?1").bind(
      new Date(startedMs - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    ).run();
    await db.prepare("DELETE FROM watches WHERE status = 'expired' AND updated_at < ?1").bind(
      new Date(startedMs - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    ).run();
    const result: WatchAuditResult = {
      runId,
      selected: rows.length,
      processed: statuses.filter((status) => status === "processed").length,
      degraded: statuses.filter((status) => status === "degraded").length,
      failed: statuses.filter((status) => status === "failed").length,
      durationMs: Date.now() - startedMs,
    };
    await db.prepare(`
      UPDATE watch_audit_runs SET status = 'completed', completed_at = ?1,
        selected_count = ?2, processed_count = ?3, degraded_count = ?4,
        failed_count = ?5, duration_ms = ?6 WHERE id = ?7
    `).bind(
      new Date().toISOString(), result.selected, result.processed, result.degraded,
      result.failed, result.durationMs, runId
    ).run();
    await db.prepare("DELETE FROM watch_audit_runs WHERE started_at < ?1").bind(
      new Date(startedMs - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
    ).run();
    return result;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown audit error";
    await recordRunFailure(db, runId, detail, startedMs);
    throw error;
  }
}
