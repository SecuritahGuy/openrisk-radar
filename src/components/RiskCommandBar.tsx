import type { CurrentWeather } from "../services/weather";
import type { RadiusOption, ResolvedLocation } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import {
  attentionEvents,
  buildRiskSummary,
  distanceMiles,
  expiresLabel,
  formatDistance,
  severityColor,
  sourceColor,
} from "../lib/riskInsights";

interface RiskCommandBarProps {
  location: ResolvedLocation | null;
  radius: RadiusOption;
  events: RiskEvent[];
  currentWeather: CurrentWeather | null;
  onEventClick: (event: RiskEvent) => void;
}

function levelColor(level: ReturnType<typeof buildRiskSummary>["level"]): string {
  switch (level) {
    case "Critical":
      return "#b71c1c";
    case "High":
      return "#d84315";
    case "Elevated":
      return "#f57c00";
    case "Guarded":
      return "#2e7d32";
    case "Clear":
      return "#1565c0";
  }
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

function AttentionCard({
  event,
  location,
  onClick,
}: {
  event: RiskEvent;
  location: ResolvedLocation | null;
  onClick: () => void;
}) {
  return (
    <button style={styles.attentionCard} onClick={onClick}>
      <div style={styles.attentionTop}>
        <span
          style={{
            ...styles.sourcePill,
            background: sourceColor(event.source),
          }}
        >
          {event.source}
        </span>
        <span
          style={{
            ...styles.severityText,
            color: severityColor(event.severity),
          }}
        >
          {event.severity}
        </span>
      </div>
      <div style={styles.attentionTitle}>{event.headline}</div>
      <div style={styles.attentionMeta}>
        {formatDistance(distanceMiles(location, event))} · {timeAgo(event.updatedAt)}
        {" · "}
        {expiresLabel(event)}
      </div>
    </button>
  );
}

export function RiskCommandBar({
  location,
  radius,
  events,
  currentWeather,
  onEventClick,
}: RiskCommandBarProps) {
  if (!location) {
    return (
      <div style={styles.empty}>
        <div>
          <strong>Search a ZIP code or city</strong>
          <span style={styles.emptyDetail}> to build a live risk snapshot.</span>
        </div>
      </div>
    );
  }

  const summary = buildRiskSummary(events);
  const topEvents = attentionEvents(events, location, 2);
  const color = levelColor(summary.level);

  return (
    <div style={styles.container}>
      <div style={styles.scoreBlock}>
        <div style={styles.scoreLabel}>Risk posture</div>
        <div style={{ ...styles.scoreValue, color }}>{summary.level}</div>
        <div style={styles.scoreDetail}>{summary.topDriver}</div>
      </div>

      <div style={styles.metricGrid}>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{summary.activeCount}</span>
          <span style={styles.metricLabel}>Signals</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricValue}>
            {summary.criticalCount + summary.severeCount}
          </span>
          <span style={styles.metricLabel}>High priority</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{summary.expiringCount}</span>
          <span style={styles.metricLabel}>Expiring soon</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{radius}</span>
          <span style={styles.metricLabel}>Miles</span>
        </div>
      </div>

      <div style={styles.weatherBlock}>
        <div style={styles.scoreLabel}>Conditions</div>
        {currentWeather ? (
          <>
            <div style={styles.weatherTemp}>
              {Math.round(currentWeather.temperature)}&deg;F
            </div>
            <div style={styles.scoreDetail}>
              {currentWeather.humidity}% humidity ·{" "}
              {Math.round(currentWeather.windSpeed)} mph wind
            </div>
          </>
        ) : (
          <div style={styles.scoreDetail}>Waiting for NWS conditions</div>
        )}
      </div>

      <div style={styles.attentionList}>
        <div style={styles.attentionHeader}>Needs attention</div>
        {topEvents.length > 0 ? (
          topEvents.map((event) => (
            <AttentionCard
              key={event.id}
              event={event}
              location={location}
              onClick={() => onEventClick(event)}
            />
          ))
        ) : (
          <div style={styles.noAttention}>No active signals in scope.</div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "grid",
    gridTemplateColumns: "170px minmax(240px, 300px) 150px minmax(220px, 1fr)",
    gap: 12,
    alignItems: "stretch",
    padding: "10px 12px",
    background: "#f7f9fb",
    borderBottom: "1px solid #dfe6ee",
    minHeight: 106,
  },
  empty: {
    padding: "10px 12px",
    background: "#f7f9fb",
    borderBottom: "1px solid #dfe6ee",
    color: "#424242",
    fontSize: 13,
  },
  emptyDetail: {
    color: "#757575",
    fontWeight: 400,
  },
  scoreBlock: {
    background: "#fff",
    border: "1px solid #dfe6ee",
    borderRadius: 8,
    padding: "10px 12px",
  },
  scoreLabel: {
    fontSize: 10,
    color: "#757575",
    fontWeight: 700,
    textTransform: "uppercase",
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 1.1,
    marginTop: 4,
  },
  scoreDetail: {
    fontSize: 12,
    color: "#616161",
    marginTop: 4,
    lineHeight: 1.35,
  },
  metricGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: 8,
  },
  metric: {
    background: "#fff",
    border: "1px solid #dfe6ee",
    borderRadius: 8,
    padding: "10px 8px",
  },
  metricValue: {
    display: "block",
    fontSize: 22,
    fontWeight: 800,
    color: "#212121",
    lineHeight: 1.1,
  },
  metricLabel: {
    display: "block",
    fontSize: 11,
    color: "#757575",
    marginTop: 4,
  },
  weatherBlock: {
    background: "#fff",
    border: "1px solid #dfe6ee",
    borderRadius: 8,
    padding: "10px 12px",
  },
  weatherTemp: {
    fontSize: 24,
    fontWeight: 800,
    lineHeight: 1.1,
    marginTop: 4,
    color: "#212121",
  },
  attentionList: {
    display: "grid",
    gridTemplateColumns: "auto repeat(2, minmax(110px, 1fr))",
    gap: 8,
    alignItems: "stretch",
    minWidth: 0,
  },
  attentionHeader: {
    alignSelf: "center",
    fontSize: 10,
    color: "#757575",
    fontWeight: 700,
    textTransform: "uppercase",
    padding: "0 4px",
  },
  attentionCard: {
    border: "1px solid #dfe6ee",
    borderRadius: 8,
    background: "#fff",
    padding: "8px 10px",
    textAlign: "left",
    cursor: "pointer",
    minWidth: 0,
  },
  attentionTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginBottom: 5,
  },
  sourcePill: {
    fontSize: 9,
    fontWeight: 800,
    color: "#fff",
    padding: "2px 5px",
    borderRadius: 3,
  },
  severityText: {
    fontSize: 10,
    fontWeight: 800,
  },
  attentionTitle: {
    fontSize: 12,
    lineHeight: 1.25,
    fontWeight: 700,
    color: "#212121",
    overflow: "hidden",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
  },
  attentionMeta: {
    fontSize: 10,
    color: "#757575",
    marginTop: 5,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  noAttention: {
    gridColumn: "span 2",
    background: "#fff",
    border: "1px solid #dfe6ee",
    borderRadius: 8,
    padding: "14px",
    fontSize: 12,
    color: "#757575",
  },
};
