interface LegendItem {
  label: string;
  color: string;
  shape: "circle" | "square" | "diamond";
}

const ITEMS: LegendItem[] = [
  { label: "Weather alert", color: "#f57c00", shape: "square" },
  { label: "Earthquake", color: "#2e7d32", shape: "circle" },
  { label: "FEMA record", color: "#7b1fa2", shape: "square" },
  { label: "Wildfire", color: "#d84315", shape: "circle" },
  { label: "Convective outlook", color: "#00897b", shape: "square" },
  { label: "Tropical cyclone", color: "#c62828", shape: "circle" },
  { label: "Radius ring", color: "#1565c0", shape: "diamond" },
];

const WEATHER_ITEMS: LegendItem[] = [
  { label: "NWS grid", color: "#00897b", shape: "square" },
  { label: "Forecast zone", color: "#6a1b9a", shape: "diamond" },
  { label: "Fire weather zone", color: "#d84315", shape: "diamond" },
  { label: "Station observation", color: "#2e7d32", shape: "circle" },
];

function Shape({ item }: { item: LegendItem }) {
  const style: React.CSSProperties = {
    width: 12,
    height: 12,
    border: `2px solid ${item.color}`,
    flexShrink: 0,
  };
  if (item.shape === "circle") {
    return (
      <div
        style={{
          ...style,
          borderRadius: "50%",
          background: `${item.color}55`,
        }}
      />
    );
  }
  if (item.shape === "diamond") {
    return (
      <div
        style={{
          ...style,
          transform: "rotate(45deg)",
          margin: 4,
          borderStyle: "dashed",
        }}
      />
    );
  }
  return (
    <div
      style={{
        ...style,
        background: `${item.color}22`,
        borderRadius: 2,
      }}
    />
  );
}

export function MapLegend({ showWeatherOverlay }: { showWeatherOverlay: boolean }) {
  const items = showWeatherOverlay ? [...ITEMS, ...WEATHER_ITEMS] : ITEMS;

  return (
    <div style={styles.legend}>
      <div style={styles.title}>Legend</div>
      {items.map((item) => (
        <div key={item.label} style={styles.row}>
          <Shape item={item} />
          <span style={styles.label}>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  legend: {
    position: "absolute",
    bottom: 24,
    right: 12,
    zIndex: 1000,
    background: "rgba(255,255,255,0.92)",
    borderRadius: 8,
    padding: "8px 12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
    fontFamily: "system-ui, sans-serif",
    fontSize: 11,
    lineHeight: 1.6,
  },
  title: {
    fontWeight: 700,
    color: "#616161",
    marginBottom: 4,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  label: {
    color: "#424242",
    whiteSpace: "nowrap",
  },
};
