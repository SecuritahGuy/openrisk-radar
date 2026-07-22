import type { ResolvedLocation, RadiusOption } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import { activeConcernEvents, distanceMiles } from "./riskInsights";

export type ImpactLevel = "affects" | "nearby" | "historical" | "monitor";

export interface ImpactAssessment {
  level: ImpactLevel;
  label: string;
  detail: string;
  sortRank: number;
}

export interface ImpactSummary {
  affectsCount: number;
  nearbyCount: number;
  historicalCount: number;
  monitorCount: number;
  currentImpactCount: number;
}

export interface ImpactSeveritySummary {
  criticalCount: number;
  moderateCount: number;
  events: RiskEvent[];
}

function pointInPolygon(
  lng: number,
  lat: number,
  polygon: number[][]
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersects =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi || Number.EPSILON) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

function milesBetweenCoords(
  location: ResolvedLocation,
  lng: number,
  lat: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthMiles = 3958.8;
  const dLat = toRad(lat - location.latitude);
  const dLon = toRad(lng - location.longitude);
  const lat1 = toRad(location.latitude);
  const lat2 = toRad(lat);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return earthMiles * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function polygonNearLocation(
  location: ResolvedLocation,
  polygon: number[][],
  radius: RadiusOption
): boolean {
  return polygon.some(
    ([lng, lat]) => milesBetweenCoords(location, lng, lat) <= radius
  );
}

export function assessImpact(
  event: RiskEvent,
  location: ResolvedLocation | null,
  radius: RadiusOption
): ImpactAssessment {
  if (event.source === "FEMA" || event.source === "NOAA") {
    return {
      level: "historical",
      label: "Historical",
      detail: event.source === "NOAA" ? "County storm history" : "County disaster history",
      sortRank: 1,
    };
  }

  if (!location) {
    return {
      level: "monitor",
      label: "Monitor",
      detail: "Search a place to assess impact",
      sortRank: 2,
    };
  }

  if (event.geometryType === "Polygon" && event.polygon?.length) {
    const containsLocation = pointInPolygon(
      location.longitude,
      location.latitude,
      event.polygon
    );
    if (containsLocation) {
      return {
        level: "affects",
        label: "Affects area",
        detail:
          event.source === "SPC"
            ? "Outlook polygon includes this location"
            : "Alert polygon includes this location",
        sortRank: 4,
      };
    }

    if (polygonNearLocation(location, event.polygon, radius)) {
      return {
        level: "nearby",
        label: "Nearby",
        detail:
          event.source === "SPC"
            ? `Outlook boundary is within ${radius} mi`
            : `Alert boundary is within ${radius} mi`,
        sortRank: 3,
      };
    }

    return {
      level: "monitor",
      label: "Monitor",
      detail: "Active elsewhere in the state",
      sortRank: 2,
    };
  }

  const scope = event.raw.openRiskScope as
    | {
        nwsPointMatch?: boolean;
        whoCountryMatch?: boolean;
        whoLocalityMatch?: boolean;
      }
    | undefined;
  if (event.source === "NWS" && scope?.nwsPointMatch) {
    return {
      level: "affects",
      label: "Affects area",
      detail: "NWS point alert includes this location",
      sortRank: 4,
    };
  }

  if (event.source === "WHO" && scope?.whoCountryMatch) {
    if (scope.whoLocalityMatch) {
      return {
        level: "affects",
        label: "Affects area",
        detail: "WHO outbreak report names this state or locality",
        sortRank: 4,
      };
    }
    return {
      level: "monitor",
      label: "Monitor",
      detail: "WHO report concerns this country but does not name this locality",
      sortRank: 2,
    };
  }

  const miles = distanceMiles(location, event);
  if (miles != null && miles <= radius) {
    return {
      level: "nearby",
      label: "Nearby",
      detail: `${Math.max(1, Math.round(miles))} mi from search point`,
      sortRank: 3,
    };
  }

  return {
    level: "monitor",
    label: "Monitor",
    detail: "Outside current search radius",
    sortRank: 2,
  };
}

export function isCurrentImpact(
  event: RiskEvent,
  location: ResolvedLocation | null,
  radius: RadiusOption
): boolean {
  const level = assessImpact(event, location, radius).level;
  return level === "affects" || level === "nearby";
}

export function currentImpactConcernEvents(
  events: RiskEvent[],
  location: ResolvedLocation | null,
  radius: RadiusOption,
  now = Date.now()
): RiskEvent[] {
  return activeConcernEvents(events, now).filter((event) =>
    isCurrentImpact(event, location, radius)
  );
}

export function buildImpactSummary(
  events: RiskEvent[],
  location: ResolvedLocation | null,
  radius: RadiusOption
): ImpactSummary {
  const summary: ImpactSummary = {
    affectsCount: 0,
    nearbyCount: 0,
    historicalCount: 0,
    monitorCount: 0,
    currentImpactCount: 0,
  };

  for (const event of events) {
    const impact = assessImpact(event, location, radius);
    if (impact.level === "affects") summary.affectsCount += 1;
    if (impact.level === "nearby") summary.nearbyCount += 1;
    if (impact.level === "historical") summary.historicalCount += 1;
    if (impact.level === "monitor") summary.monitorCount += 1;
  }

  summary.currentImpactCount = summary.affectsCount + summary.nearbyCount;
  return summary;
}

export function buildImpactSeveritySummary(
  events: RiskEvent[],
  location: ResolvedLocation | null,
  radius: RadiusOption,
  now = Date.now()
): ImpactSeveritySummary {
  const currentEvents = currentImpactConcernEvents(events, location, radius, now);

  return {
    criticalCount: currentEvents.filter(
      (event) => event.severity === "Extreme" || event.severity === "Severe"
    ).length,
    moderateCount: currentEvents.filter(
      (event) => event.severity === "Moderate"
    ).length,
    events: currentEvents,
  };
}

export function impactColor(level: ImpactLevel): string {
  switch (level) {
    case "affects":
      return "#c62828";
    case "nearby":
      return "#ef6c00";
    case "historical":
      return "#7b1fa2";
    case "monitor":
      return "#607d8b";
  }
}
