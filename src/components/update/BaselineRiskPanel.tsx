import type { FemaRiskIndexCounty } from "../../services/femaRiskIndex";

interface BaselineRiskPanelProps {
  riskIndex: FemaRiskIndexCounty | null;
}

function ratingColor(rating: string): string {
  if (rating.includes("Very High")) return "#b71c1c";
  if (rating.includes("High")) return "#d84315";
  if (rating.includes("Moderate")) return "#f57c00";
  if (rating.includes("Low")) return "#2e7d32";
  return "#546e7a";
}

function formatCurrency(value: number | null): string {
  if (value == null) return "n/a";
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

function formatScore(value: number | null): string {
  return value == null ? "n/a" : Math.round(value).toString();
}

export function BaselineRiskPanel({ riskIndex }: BaselineRiskPanelProps) {
  if (!riskIndex) {
    return (
      <section style={styles.section}>
        <div style={styles.label}>Baseline risk</div>
        <div style={styles.empty}>
          FEMA National Risk Index data is not available for this location.
        </div>
      </section>
    );
  }

  const color = ratingColor(riskIndex.riskRating);

  return (
    <section style={styles.section}>
      <div style={styles.header}>
        <div>
          <div style={styles.label}>Baseline risk</div>
          <div style={styles.title}>
            {riskIndex.county} County, {riskIndex.state}
          </div>
        </div>
        <span
          style={{
            ...styles.rating,
            color,
            background: `${color}14`,
            borderColor: `${color}55`,
          }}
        >
          {riskIndex.riskRating}
        </span>
      </div>

      <div style={styles.metricGrid}>
        <div style={styles.metric}>
          <span style={styles.metricValue}>{formatScore(riskIndex.riskScore)}</span>
          <span style={styles.metricLabel}>Risk score</span>
        </div>
        <div style={styles.metric}>
          <span style={styles.metricValue}>
            {formatCurrency(riskIndex.expectedAnnualLoss)}
          </span>
          <span style={styles.metricLabel}>Expected annual loss</span>
        </div>
      </div>

      <div style={styles.contextRow}>
        <span>Social vulnerability: {riskIndex.socialVulnerabilityRating}</span>
        <span>Community resilience: {riskIndex.communityResilienceRating}</span>
      </div>

      {riskIndex.topHazards.length > 0 && (
        <div style={styles.hazardList}>
          <div style={styles.subLabel}>Top baseline hazard drivers</div>
          {riskIndex.topHazards.map((hazard) => {
            const hazardColor = ratingColor(hazard.rating);
            return (
              <div key={hazard.code} style={styles.hazardRow}>
                <span style={styles.hazardName}>{hazard.label}</span>
                <span
                  style={{
                    ...styles.hazardRating,
                    color: hazardColor,
                    background: `${hazardColor}12`,
                  }}
                >
                  {hazard.rating}
                </span>
              </div>
            );
          })}
        </div>
      )}

      <a
        href="https://www.fema.gov/flood-maps/products-tools/national-risk-index"
        target="_blank"
        rel="noreferrer"
        style={styles.sourceLink}
      >
        FEMA National Risk Index
      </a>
    </section>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    border: "1px solid #dfe7ef",
    borderRadius: 8,
    background: "#fbfcfe",
    marginBottom: 16,
    padding: "10px 11px",
  },
  header: {
    alignItems: "flex-start",
    display: "flex",
    gap: 10,
    justifyContent: "space-between",
  },
  label: {
    color: "#616161",
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  title: {
    color: "#263238",
    fontSize: 14,
    fontWeight: 800,
    marginTop: 2,
  },
  rating: {
    border: "1px solid",
    borderRadius: 4,
    flex: "0 0 auto",
    fontSize: 10,
    fontWeight: 800,
    padding: "3px 6px",
    textTransform: "uppercase",
  },
  metricGrid: {
    display: "grid",
    gap: 8,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    marginTop: 10,
  },
  metric: {
    background: "#fff",
    border: "1px solid #e3e9ef",
    borderRadius: 7,
    padding: "8px",
  },
  metricValue: {
    color: "#263238",
    display: "block",
    fontSize: 17,
    fontWeight: 800,
    lineHeight: 1.15,
  },
  metricLabel: {
    color: "#546e7a",
    display: "block",
    fontSize: 10,
    fontWeight: 800,
    marginTop: 3,
    textTransform: "uppercase",
  },
  contextRow: {
    color: "#546e7a",
    display: "grid",
    fontSize: 11,
    gap: 3,
    lineHeight: 1.35,
    marginTop: 9,
  },
  hazardList: {
    display: "grid",
    gap: 6,
    marginTop: 10,
  },
  subLabel: {
    color: "#616161",
    fontSize: 10,
    fontWeight: 800,
    textTransform: "uppercase",
  },
  hazardRow: {
    alignItems: "center",
    background: "#fff",
    border: "1px solid #e3e9ef",
    borderRadius: 6,
    display: "flex",
    gap: 8,
    justifyContent: "space-between",
    padding: "6px 7px",
  },
  hazardName: {
    color: "#263238",
    fontSize: 12,
    fontWeight: 700,
  },
  hazardRating: {
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 800,
    padding: "2px 5px",
    whiteSpace: "nowrap",
  },
  sourceLink: {
    color: "#1565c0",
    display: "inline-block",
    fontSize: 12,
    fontWeight: 700,
    marginTop: 10,
    textDecoration: "none",
  },
  empty: {
    color: "#616161",
    fontSize: 12,
    lineHeight: 1.35,
    marginTop: 5,
  },
};
