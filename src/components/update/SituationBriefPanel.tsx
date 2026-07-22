import { useState } from "react";
import type { SourceHealthItem } from "../../hooks/useRiskFeeds";
import type { CurrentWeather } from "../../services/weather";
import type { RadiusOption, ResolvedLocation } from "../../types/location";
import type { RiskEvent } from "../../types/riskEvent";
import {
  attentionEvents,
  buildRiskSummary,
  distanceMiles,
  expiresLabel,
  formatDistance,
  severityColor,
  sourceColor,
} from "../../lib/riskInsights";
import {
  assessImpact,
  currentImpactConcernEvents,
} from "../../lib/impactInsights";
import { summarizeSourceAgreement } from "../../lib/signalCorrelation";

interface SituationBriefPanelProps {
  location: ResolvedLocation;
  radius: RadiusOption;
  events: RiskEvent[];
  currentWeather: CurrentWeather | null;
  sourceHealth: SourceHealthItem[];
  onEventClick: (event: RiskEvent) => void;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function latestEvent(events: RiskEvent[]): RiskEvent | null {
  return events.reduce<RiskEvent | null>((latest, event) => {
    if (!latest) return event;
    return new Date(event.updatedAt).getTime() >
      new Date(latest.updatedAt).getTime()
      ? event
      : latest;
  }, null);
}

function sourceCoverage(sourceHealth: SourceHealthItem[]): string {
  const liveCount = sourceHealth.filter((item) => item.status === "live").length;
  const issueCount = sourceHealth.filter(
    (item) => item.status === "error" || item.status === "unavailable" || item.status === "degraded"
  ).length;

  if (issueCount > 0) {
    return `${liveCount} feeds live; ${issueCount} feed${issueCount !== 1 ? "s" : ""} need attention.`;
  }
  return `${liveCount} feeds live; no source outages reported.`;
}

function watchNext(events: RiskEvent[], currentWeather: CurrentWeather | null): string {
  const expiringSoon = events.filter((event) => {
    if (!event.expiresAt) return false;
    const expires = new Date(event.expiresAt).getTime();
    return expires > Date.now() && expires - Date.now() <= 12 * 60 * 60 * 1000;
  }).length;

  if (expiringSoon > 0) {
    return `${expiringSoon} alert${expiringSoon !== 1 ? "s" : ""} expire or update within 12 hours.`;
  }
  if (currentWeather && currentWeather.windSpeed >= 20) {
    return `Winds near ${Math.round(currentWeather.windSpeed)} mph may affect fire, air, or coastal conditions.`;
  }
  if (currentWeather && currentWeather.temperature >= 95) {
    return `Heat is elevated at ${Math.round(currentWeather.temperature)}F.`;
  }
  return "Watch for new weather, river, wildfire, and seismic updates as feeds refresh.";
}

function eventSummary(
  event: RiskEvent | null,
  location: ResolvedLocation,
  radius: RadiusOption
): string {
  if (!event) return `No active events detected within ${radius} miles.`;
  const impact = assessImpact(event, location, radius);
  return `${event.headline} · ${event.severity} · ${impact.label} · ${formatDistance(
    distanceMiles(location, event)
  )} · ${expiresLabel(event)}`;
}

export function SituationBriefPanel({
  location,
  radius,
  events,
  currentWeather,
  sourceHealth,
  onEventClick,
}: SituationBriefPanelProps) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle"
  );
  const concernEvents = currentImpactConcernEvents(events, location, radius);
  const risk = buildRiskSummary(concernEvents);
  const latest = latestEvent(concernEvents);
  const topEvents = attentionEvents(concernEvents, location, 3);
  const topEvent = topEvents[0] ?? null;
  const nowDetail =
    concernEvents.length > 0
      ? `${concernEvents.length} active signal${concernEvents.length !== 1 ? "s" : ""}; ${risk.topDriver}.`
      : "No active signals found in the selected radius.";
  const changedDetail = latest
    ? `${latest.source} updated ${timeAgo(latest.updatedAt)}: ${latest.headline}`
    : "No recent event updates available.";
  const concernDetail = eventSummary(topEvent, location, radius);
  const confidenceDetail = `${summarizeSourceAgreement(concernEvents)} ${sourceCoverage(sourceHealth)}`;
  const watchDetail = watchNext(events, currentWeather);

  async function handleCopyBrief() {
    if (!navigator.clipboard?.writeText) {
      setCopyStatus("failed");
      window.setTimeout(() => setCopyStatus("idle"), 2200);
      return;
    }

    const lines = [
      `OpenRisk Radar Situation Brief`,
      `${location.city}, ${location.state} · ${radius} mi · ${risk.level}`,
      `Now: ${nowDetail}`,
      `Changed: ${changedDetail}`,
      `Concern: ${concernDetail}`,
      `Confidence: ${confidenceDetail}`,
      `Watch next: ${watchDetail}`,
      topEvent?.url ? `Top source: ${topEvent.url}` : null,
    ].filter(Boolean);

    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
    window.setTimeout(() => setCopyStatus("idle"), 2200);
  }

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <div>
          <div style={styles.label}>Situation brief</div>
          <div style={styles.title}>
            {location.city}, {location.state} · {radius} mi
          </div>
        </div>
        <div style={styles.headerActions}>
          <button
            type="button"
            style={styles.copyButton}
            onClick={handleCopyBrief}
            title="Copy situation brief"
          >
            {copyStatus === "copied"
              ? "Copied"
              : copyStatus === "failed"
                ? "Copy failed"
                : "Copy brief"}
          </button>
          <span style={styles.posture}>{risk.level}</span>
        </div>
      </div>

      <div style={styles.briefGrid}>
        <BriefItem title="Now" detail={nowDetail} />
        <BriefItem title="Changed" detail={changedDetail} />
        <BriefItem title="Concern" detail={concernDetail} />
        <BriefItem title="Confidence" detail={confidenceDetail} />
        <BriefItem title="Watch next" detail={watchDetail} />
      </div>

      {topEvents.length > 0 && (
        <div style={styles.priorityList}>
          <div style={styles.priorityTitle}>Priority signals</div>
          {topEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              style={styles.priorityButton}
              onClick={() => onEventClick(event)}
              title="Open event details"
            >
              <span
                style={{
                  ...styles.sourcePill,
                  background: sourceColor(event.source),
                }}
              >
                {event.source}
              </span>
              <span style={styles.priorityText}>{event.headline}</span>
              <span
                style={{
                  ...styles.severityPill,
                  color: severityColor(event.severity),
                  background: `${severityColor(event.severity)}14`,
                }}
              >
                {event.severity}
              </span>
            </button>
          ))}
        </div>
      )}

      {topEvent?.url && (
        <a
          href={topEvent.url}
          target="_blank"
          rel="noreferrer"
          style={{ ...styles.sourceLink, color: sourceColor(topEvent.source) }}
        >
          Open top source: {topEvent.source}
        </a>
      )}
    </section>
  );
}

function BriefItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div style={styles.item}>
      <div style={styles.itemTitle}>{title}</div>
      <div style={styles.itemDetail}>{detail}</div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    marginBottom: 16,
    border: "1px solid #dfe7ef",
    borderRadius: 8,
    background: "#f8fbfd",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    padding: "10px 11px",
    borderBottom: "1px solid #e3ebf2",
    background: "#fff",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    justifyContent: "flex-end",
  },
  copyButton: {
    border: "1px solid #bbdefb",
    borderRadius: 5,
    background: "#fff",
    color: "#1565c0",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 900,
    lineHeight: 1,
    padding: "5px 7px",
    whiteSpace: "nowrap",
  },
  label: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    color: "#546e7a",
  },
  title: {
    color: "#263238",
    fontSize: 13,
    fontWeight: 800,
    marginTop: 2,
  },
  posture: {
    border: "1px solid #d8e0e7",
    borderRadius: 999,
    color: "#1565c0",
    background: "#e8f0fe",
    fontSize: 10,
    fontWeight: 900,
    lineHeight: 1,
    padding: "5px 7px",
    textTransform: "uppercase",
  },
  briefGrid: {
    display: "grid",
    gap: 1,
    background: "#e8eef5",
  },
  item: {
    background: "#f8fbfd",
    padding: "8px 10px",
  },
  itemTitle: {
    color: "#1565c0",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  itemDetail: {
    color: "#37474f",
    fontSize: 12,
    lineHeight: 1.35,
    marginTop: 3,
  },
  priorityList: {
    background: "#fff",
    borderTop: "1px solid #e3ebf2",
    padding: "9px 10px",
  },
  priorityTitle: {
    color: "#546e7a",
    fontSize: 10,
    fontWeight: 900,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  priorityButton: {
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e3ebf2",
    borderRadius: 6,
    color: "#263238",
    cursor: "pointer",
    display: "grid",
    gap: 7,
    gridTemplateColumns: "auto minmax(0, 1fr) auto",
    marginTop: 6,
    padding: "7px",
    textAlign: "left",
    width: "100%",
  },
  sourcePill: {
    borderRadius: 4,
    color: "#fff",
    fontSize: 9,
    fontWeight: 900,
    lineHeight: 1,
    padding: "4px 5px",
  },
  priorityText: {
    fontSize: 12,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  severityPill: {
    borderRadius: 4,
    fontSize: 10,
    fontWeight: 900,
    lineHeight: 1,
    padding: "4px 5px",
  },
  sourceLink: {
    display: "block",
    background: "#fff",
    borderTop: "1px solid #e3ebf2",
    fontSize: 12,
    fontWeight: 800,
    padding: "9px 10px",
    textDecoration: "none",
  },
};
