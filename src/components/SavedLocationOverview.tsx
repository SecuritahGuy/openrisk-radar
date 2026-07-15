import type { CurrentWeather } from "../services/weather";
import type { Location, RadiusOption } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import type { SourceHealthItem } from "../hooks/useRiskFeeds";
import type { SavedLocationRiskSummary } from "../hooks/useSavedLocationRiskSummaries";
import {
  activeConcernEvents,
  attentionEvents,
  buildRiskSummary,
  sourceColor,
} from "../lib/riskInsights";
import { buildImpactSummary } from "../lib/impactInsights";
import {
  eventMatchesWatch,
  isWatchExpired,
  watchPreferencesFor,
} from "../lib/watchPreferences";

interface SavedLocationOverviewProps {
  savedLocations: Location[];
  activeLocation: Location | null;
  summaries: SavedLocationRiskSummary[];
  events: RiskEvent[];
  radius: RadiusOption;
  currentWeather: CurrentWeather | null;
  sourceHealth: SourceHealthItem[];
  isFetching: boolean;
  onSelect: (loc: Location) => void;
  onShareActiveView: () => Promise<"shared" | "copied" | "unavailable">;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "never checked";
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "unknown";
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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

function criticalityColor(criticality: Location["criticality"]): string {
  if (criticality === "High") return "#c62828";
  if (criticality === "Medium") return "#ef6c00";
  return "#2e7d32";
}

export function SavedLocationOverview({
  savedLocations,
  activeLocation,
  summaries,
  events,
  radius,
  currentWeather,
  sourceHealth,
  isFetching,
  onSelect,
  onShareActiveView,
}: SavedLocationOverviewProps) {
  if (savedLocations.length === 0) return null;

  const activeWatch = activeLocation ? watchPreferencesFor(activeLocation) : null;
  const watchedEvents = activeWatch
    ? events.filter((event) => eventMatchesWatch(event, activeWatch))
    : events;
  const concernEvents = activeConcernEvents(watchedEvents);
  const risk = buildRiskSummary(concernEvents);
  const impact = activeLocation
    ? buildImpactSummary(
        watchedEvents,
        {
          city: activeLocation.city,
          state: activeLocation.state,
          postalCode: activeLocation.postalCode,
          country: activeLocation.country,
          latitude: activeLocation.latitude,
          longitude: activeLocation.longitude,
          county: activeLocation.county,
          stateFips: activeLocation.stateFips,
          countyFips: activeLocation.countyFips,
        },
        radius
      )
    : null;
  const topEvent = activeLocation
    ? attentionEvents(
        concernEvents,
        {
          city: activeLocation.city,
          state: activeLocation.state,
          postalCode: activeLocation.postalCode,
          country: activeLocation.country,
          latitude: activeLocation.latitude,
          longitude: activeLocation.longitude,
          county: activeLocation.county,
          stateFips: activeLocation.stateFips,
          countyFips: activeLocation.countyFips,
        },
        1
      )[0] ?? null
    : null;
  const liveSources = sourceHealth.filter((item) => item.status === "live").length;
  const sourceIssues = sourceHealth.filter(
    (item) => item.status === "error" || item.status === "unavailable"
  ).length;
  const summaryByLocationId = new Map(
    summaries.map((summary) => [summary.locationId, summary])
  );
  const sortedLocations = [...savedLocations].sort((a, b) => {
    const aSummary = summaryByLocationId.get(a.id);
    const bSummary = summaryByLocationId.get(b.id);
    const aScore = aSummary?.risk.score ?? -1;
    const bScore = bSummary?.risk.score ?? -1;
    return bScore - aScore || a.label.localeCompare(b.label);
  });

  return (
    <section className="saved-location-overview" style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.eyebrow}>Saved location overview</div>
          <div style={styles.title}>
            {savedLocations.length} monitored place
            {savedLocations.length !== 1 ? "s" : ""}
          </div>
        </div>
        {activeLocation && (
          <button
            type="button"
            style={styles.shareBtn}
            onClick={() => void onShareActiveView()}
          >
            Share active
          </button>
        )}
      </div>
      <div style={styles.cardRow}>
        {sortedLocations.map((loc) => {
          const active = loc.id === activeLocation?.id;
          const summary = summaryByLocationId.get(loc.id);
          const cardRisk = active ? risk : summary?.risk;
          const cardImpact = active ? impact : summary?.impact;
          const cardWeather = active ? currentWeather : summary?.currentWeather;
          const cardTopEvent = active ? topEvent : summary?.topEvent;
          const cardLiveSources = active
            ? liveSources
            : summary?.liveSourceCount ?? 0;
          const cardSourceIssues = active
            ? sourceIssues
            : summary?.errorCount ?? 0;
          const watch = watchPreferencesFor(loc);
          const watchExpired = isWatchExpired(watch);
          const watchState = watchExpired
            ? "Expired"
            : watch.enabled
              ? "Watching"
              : "Paused";
          const matchingCount = active
            ? concernEvents.length
            : summary?.eventCount ?? 0;
          const postureColor = cardRisk ? levelColor(cardRisk.level) : "#607d8b";
          return (
            <button
              key={loc.id}
              type="button"
              style={{
                ...styles.card,
                ...(active ? styles.cardActive : {}),
              }}
              onClick={() => onSelect(loc)}
              title={`Open ${loc.label}`}
            >
              <div style={styles.cardTop}>
                <span style={styles.cardTitle}>{loc.label}</span>
                <span style={styles.pillRow}>
                  <span
                    style={{
                      ...styles.watchPill,
                      color: watch.enabled && !watchExpired ? "#1565c0" : "#78909c",
                      background: watch.enabled && !watchExpired ? "#e3f2fd" : "#eceff1",
                    }}
                  >
                    {watchState}
                  </span>
                  <span
                    style={{
                      ...styles.criticalityPill,
                      color: criticalityColor(loc.criticality),
                      background: `${criticalityColor(loc.criticality)}14`,
                    }}
                  >
                    {loc.criticality}
                  </span>
                </span>
              </div>
              <div style={styles.cardMeta}>
                {loc.city}, {loc.state} · {loc.locationType}
              </div>
              <div style={styles.metricRow}>
                <span style={{ ...styles.posture, color: postureColor }}>
                  {summary?.isLoading
                    ? "Checking"
                    : cardRisk
                      ? cardRisk.level
                      : "Open to assess"}
                </span>
                {cardImpact && (
                  <span style={styles.metric}>
                    {cardImpact.currentImpactCount} impact
                  </span>
                )}
              </div>
              {cardRisk ? (
                <>
                  <div style={styles.detail}>
                    {active && isFetching
                      ? "Refreshing..."
                      : summary?.isFetching && !active
                        ? "Refreshing..."
                        : cardRisk.topDriver}
                  </div>
                  {cardTopEvent && (
                    <div style={styles.topSignal}>
                      <span
                        style={{
                          ...styles.sourcePill,
                          background: sourceColor(cardTopEvent.source),
                        }}
                      >
                        {cardTopEvent.source}
                      </span>
                      <span style={styles.signalText}>
                        {cardTopEvent.headline}
                      </span>
                    </div>
                  )}
                  <div style={styles.footer}>
                    {cardWeather
                      ? `${Math.round(cardWeather.temperature)}F · ${Math.round(
                          cardWeather.windSpeed
                        )} mph`
                      : "Weather pending"}
                    {" · "}
                    {cardLiveSources} live
                    {` · ${matchingCount} matching`}
                    {cardSourceIssues > 0 ? `, ${cardSourceIssues} issues` : ""}
                  </div>
                </>
              ) : summary?.error ? (
                <div style={styles.detail}>Summary unavailable</div>
              ) : (
                <div style={styles.detail}>
                  Last saved check {timeAgo(loc.lastCheckedAt)}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    borderBottom: "1px solid #dfe6ee",
    background: "#f7fafc",
    maxHeight: 230,
    overflowY: "auto",
    padding: "9px 12px",
  },
  header: {
    alignItems: "center",
    display: "flex",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 8,
  },
  eyebrow: {
    color: "#607d8b",
    fontSize: 10,
    fontWeight: 900,
    textTransform: "uppercase",
  },
  title: {
    color: "#263238",
    fontSize: 13,
    fontWeight: 800,
    marginTop: 2,
  },
  shareBtn: {
    border: "1px solid #bbdefb",
    borderRadius: 6,
    background: "#fff",
    color: "#1565c0",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 900,
    padding: "6px 8px",
    whiteSpace: "nowrap",
  },
  cardRow: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
  },
  card: {
    background: "#fff",
    border: "1px solid #dfe7ef",
    borderRadius: 8,
    color: "#263238",
    cursor: "pointer",
    display: "grid",
    gap: 6,
    minWidth: 0,
    padding: 10,
    textAlign: "left",
  },
  cardActive: {
    border: "1px solid #1565c0",
    boxShadow: "inset 0 0 0 1px #1565c0",
  },
  cardTop: {
    alignItems: "center",
    display: "flex",
    gap: 8,
    justifyContent: "space-between",
    minWidth: 0,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 850,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  criticalityPill: {
    borderRadius: 999,
    flex: "0 0 auto",
    fontSize: 10,
    fontWeight: 900,
    padding: "3px 6px",
  },
  pillRow: { display: "flex", flex: "0 0 auto", gap: 4 },
  watchPill: {
    borderRadius: 999,
    fontSize: 9,
    fontWeight: 900,
    padding: "3px 6px",
  },
  cardMeta: {
    color: "#607d8b",
    fontSize: 11,
    fontWeight: 700,
  },
  metricRow: {
    alignItems: "center",
    display: "flex",
    gap: 8,
  },
  posture: {
    fontSize: 16,
    fontWeight: 900,
  },
  metric: {
    color: "#607d8b",
    fontSize: 11,
    fontWeight: 800,
  },
  detail: {
    color: "#455a64",
    fontSize: 12,
    lineHeight: 1.35,
  },
  topSignal: {
    alignItems: "center",
    display: "flex",
    gap: 6,
    minWidth: 0,
  },
  sourcePill: {
    borderRadius: 4,
    color: "#fff",
    flex: "0 0 auto",
    fontSize: 9,
    fontWeight: 900,
    lineHeight: 1,
    padding: "4px 5px",
  },
  signalText: {
    color: "#263238",
    fontSize: 11,
    fontWeight: 700,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  footer: {
    color: "#78909c",
    fontSize: 11,
    fontWeight: 700,
  },
};
