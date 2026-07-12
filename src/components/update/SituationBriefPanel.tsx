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
  sourceColor,
} from "../../lib/riskInsights";
import { assessImpact } from "../../lib/impactInsights";

interface SituationBriefPanelProps {
  location: ResolvedLocation;
  radius: RadiusOption;
  events: RiskEvent[];
  currentWeather: CurrentWeather | null;
  sourceHealth: SourceHealthItem[];
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

function sourceAgreement(events: RiskEvent[]): string {
  const activeSources = new Set(events.map((event) => event.source));
  if (activeSources.size === 0) return "No active hazard feeds are reporting in this radius.";
  if (activeSources.size === 1) {
    return `${Array.from(activeSources)[0]} is the only active source in scope.`;
  }
  return `${activeSources.size} sources are reporting signals in scope.`;
}

function sourceCoverage(sourceHealth: SourceHealthItem[]): string {
  const liveCount = sourceHealth.filter((item) => item.status === "live").length;
  const issueCount = sourceHealth.filter(
    (item) => item.status === "error" || item.status === "unavailable"
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
}: SituationBriefPanelProps) {
  const risk = buildRiskSummary(events);
  const latest = latestEvent(events);
  const topEvent = attentionEvents(events, location, 1)[0] ?? null;

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <div>
          <div style={styles.label}>Situation brief</div>
          <div style={styles.title}>
            {location.city}, {location.state} · {radius} mi
          </div>
        </div>
        <span style={styles.posture}>{risk.level}</span>
      </div>

      <div style={styles.briefGrid}>
        <BriefItem
          title="Now"
          detail={
            events.length > 0
              ? `${events.length} active signal${events.length !== 1 ? "s" : ""}; ${risk.topDriver}.`
              : "No active signals found in the selected radius."
          }
        />
        <BriefItem
          title="Changed"
          detail={
            latest
              ? `${latest.source} updated ${timeAgo(latest.updatedAt)}: ${latest.headline}`
              : "No recent event updates available."
          }
        />
        <BriefItem
          title="Concern"
          detail={eventSummary(topEvent, location, radius)}
        />
        <BriefItem
          title="Confidence"
          detail={`${sourceAgreement(events)} ${sourceCoverage(sourceHealth)}`}
        />
        <BriefItem
          title="Watch next"
          detail={watchNext(events, currentWeather)}
        />
      </div>

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
  label: {
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    color: "#607d8b",
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
