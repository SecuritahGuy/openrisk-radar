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
  classifyAuditChange,
  incidentFingerprint,
  isWithinQuietHours,
  nextWatchCheck,
} from "./watchDomain";

const AUDIT_BATCH_SIZE = 3;
const AUDIT_RETENTION_DAYS = 30;

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

async function writeAuditError(db: D1Database, row: DueWatchRow, detail: string, now: string): Promise<void> {
  await db.prepare(`
    INSERT INTO watch_audit_events (
      id, watch_id, kind, would_notify, match_count, sources_json, detail, created_at
    ) VALUES (?1, ?2, 'error', 0, 0, '[]', ?3, ?4)
  `).bind(crypto.randomUUID(), row.id, detail.slice(0, 500), now).run();
  const preferences = JSON.parse(row.preferences_json) as WatchPreferences;
  await db.prepare(`
    UPDATE watches SET last_checked_at = ?1, next_check_at = ?2,
      last_error = ?3, updated_at = ?1 WHERE id = ?4
  `).bind(now, nextWatchCheck(preferences), detail.slice(0, 500), row.id).run();
}

async function evaluateWatch(db: D1Database, row: DueWatchRow): Promise<void> {
  const now = new Date().toISOString();
  const preferences = JSON.parse(row.preferences_json) as WatchPreferences;
  const sourceResults = await fetchAuditEvents(row, preferences);
  const coverage = classifyAuditSourceCoverage(sourceResults);
  if (!coverage.usable) {
    await writeAuditError(db, row, coverage.error ?? "Audit sources failed", now);
    return;
  }

  const incidents = activeConcernEvents(canonicalIncidentEvents(
    sourceResults.filter((result) => !result.error).flatMap((result) => result.events)
  )).filter((event) => eventMatchesWatch(event, preferences));
  const fingerprint = incidentFingerprint(incidents);
  const top = [...incidents].sort((a, b) => severityRank(b.severity) - severityRank(a.severity))[0] ?? null;
  const quiet = isWithinQuietHours(preferences, row.timezone);
  const decision = classifyAuditChange(row.last_incident_fingerprint, fingerprint, quiet);

  if (decision.kind) {
    await db.prepare(`
      INSERT INTO watch_audit_events (
        id, watch_id, kind, would_notify, suppressed_reason, incident_fingerprint,
        match_count, top_headline, top_severity, sources_json, detail, created_at
      ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
    `).bind(
      crypto.randomUUID(),
      row.id,
      decision.kind,
      decision.wouldNotify ? 1 : 0,
      decision.suppressedReason,
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
            : "Matching conditions changed; a notification would have been sent."}${coverage.warning ? ` Partial source failure: ${coverage.warning}` : ""}`,
      now
    ).run();
  }

  await db.prepare(`
    UPDATE watches SET last_incident_fingerprint = ?1, last_match_count = ?2,
      last_checked_at = ?3, next_check_at = ?4, last_error = ?5, updated_at = ?3
    WHERE id = ?6
  `).bind(fingerprint, incidents.length, now, nextWatchCheck(preferences), coverage.warning, row.id).run();
}

export async function runWatchAudit(db: D1Database): Promise<{ processed: number }> {
  const now = new Date().toISOString();
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

  for (const row of due.results ?? []) {
    await evaluateWatch(db, row);
  }

  const retentionCutoff = new Date(Date.now() - AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare("DELETE FROM watch_audit_events WHERE created_at < ?1").bind(retentionCutoff).run();
  await db.prepare("DELETE FROM watches WHERE status = 'expired' AND updated_at < ?1").bind(retentionCutoff).run();
  return { processed: due.results?.length ?? 0 };
}
