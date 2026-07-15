import { canonicalIncidentEvents } from "../src/lib/incidents";
import { activeConcernEvents, severityRank } from "../src/lib/riskInsights";
import { eventMatchesWatch } from "../src/lib/watchPreferences";
import { fetchNwsAlertsForPoint } from "../src/services/nws";
import { fetchWildfires } from "../src/services/nifc";
import { fetchEarthquakes } from "../src/services/usgs";
import type { WatchPreferences } from "../src/types/location";
import type { RiskEvent } from "../src/types/riskEvent";
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
  preferences_json: string;
  timezone: string;
  last_incident_fingerprint: string | null;
}

interface SourceResult {
  source: string;
  events: RiskEvent[];
  error: string | null;
}

async function settle(source: string, promise: Promise<RiskEvent[]>): Promise<SourceResult> {
  try {
    return { source, events: await promise, error: null };
  } catch (error) {
    return {
      source,
      events: [],
      error: error instanceof Error ? error.message : `${source} failed`,
    };
  }
}

async function fetchAuditEvents(row: DueWatchRow, preferences: WatchPreferences): Promise<SourceResult[]> {
  const requests: Array<Promise<SourceResult>> = [];
  if (preferences.hazards.includes("weather")) {
    requests.push(settle("NWS", fetchNwsAlertsForPoint(row.latitude, row.longitude)));
  }
  if (preferences.hazards.includes("earthquake")) {
    requests.push(settle("USGS", fetchEarthquakes(
      row.latitude,
      row.longitude,
      row.radius_miles * 1.60934,
      1
    )));
  }
  if (preferences.hazards.includes("wildfire")) {
    requests.push(settle("NIFC", fetchWildfires(
      row.latitude,
      row.longitude,
      row.radius_miles * 1.60934
    )));
  }
  return Promise.all(requests);
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
  if (sourceResults.length === 0) {
    await writeAuditError(db, row, "No audit-mode source currently covers the selected hazards", now);
    return;
  }
  const sourceErrors = sourceResults.filter((result) => result.error);
  if (sourceErrors.length > 0) {
    await writeAuditError(
      db,
      row,
      sourceErrors.map((result) => `${result.source}: ${result.error}`).join("; "),
      now
    );
    return;
  }

  const incidents = activeConcernEvents(canonicalIncidentEvents(
    sourceResults.flatMap((result) => result.events)
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
      JSON.stringify(sourceResults.map((result) => result.source)),
      decision.kind === "baseline"
        ? "Initial audit baseline established; no notification would be sent."
        : decision.kind === "resolved"
          ? "Previously matching conditions are no longer active."
          : decision.suppressedReason === "quiet_hours"
            ? "Matching conditions changed during quiet hours."
            : "Matching conditions changed; a notification would have been sent.",
      now
    ).run();
  }

  await db.prepare(`
    UPDATE watches SET last_incident_fingerprint = ?1, last_match_count = ?2,
      last_checked_at = ?3, next_check_at = ?4, last_error = NULL, updated_at = ?3
    WHERE id = ?5
  `).bind(fingerprint, incidents.length, now, nextWatchCheck(preferences), row.id).run();
}

export async function runWatchAudit(db: D1Database): Promise<{ processed: number }> {
  const now = new Date().toISOString();
  await db.prepare(`
    UPDATE watches SET status = 'expired', updated_at = ?1
    WHERE status != 'expired' AND expires_at IS NOT NULL AND expires_at <= ?1
  `).bind(now).run();

  const due = await db.prepare(`
    SELECT id, latitude, longitude, radius_miles, preferences_json, timezone,
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
