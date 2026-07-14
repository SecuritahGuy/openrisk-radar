import type { RadiusOption, ResolvedLocation } from "../types/location";
import type { RiskEvent, Severity } from "../types/riskEvent";
import { buildImpactSeveritySummary } from "./impactInsights";

export interface ActionGuidance {
  level: "act" | "prepare" | "monitor" | "clear";
  title: string;
  detail: string;
  sourceEvent: RiskEvent | null;
}

const severityRank: Record<Severity, number> = {
  Minor: 0,
  Moderate: 1,
  Severe: 2,
  Extreme: 3,
};

function detailFor(event: RiskEvent): string {
  if (event.category === "Air Quality") {
    return "Limit exposure if you are sensitive to air pollution and follow local health guidance.";
  }
  if (event.category === "Wildfire") {
    return "Review local evacuation information and be ready to leave if officials advise it.";
  }
  if (event.category === "River Gauge") {
    return "Avoid flooded roads and low-lying areas; monitor the official river forecast.";
  }
  if (event.category === "Tropical") {
    return "Review your severe-weather plan and follow evacuation guidance from local officials.";
  }
  if (event.category === "Seismic") {
    return "Check for local impacts and aftershock information from the official source.";
  }
  return "Review the official alert, prepare for changing conditions, and follow local authority guidance.";
}

export function buildActionGuidance(
  events: RiskEvent[],
  location: ResolvedLocation,
  radius: RadiusOption,
  now = Date.now()
): ActionGuidance {
  const relevant = buildImpactSeveritySummary(events, location, radius, now)
    .events
    .sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);
  const top = relevant[0] ?? null;

  if (!top) {
    return {
      level: "clear",
      title: "No immediate action indicated",
      detail: "No current alerts or hazards are affecting or nearby this location. Check again as conditions change.",
      sourceEvent: null,
    };
  }
  if (top.severity === "Extreme" || top.severity === "Severe") {
    return {
      level: "act",
      title: "Act on official guidance",
      detail: detailFor(top),
      sourceEvent: top,
    };
  }
  if (top.severity === "Moderate") {
    return {
      level: "prepare",
      title: "Prepare and stay aware",
      detail: detailFor(top),
      sourceEvent: top,
    };
  }
  return {
    level: "monitor",
    title: "Monitor changing conditions",
    detail: `A minor signal is relevant to this location. Review ${top.source} details if your plans may be affected.`,
    sourceEvent: top,
  };
}
