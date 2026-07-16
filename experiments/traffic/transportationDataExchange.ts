// EXPERIMENT ONLY — not imported by the OpenRiskRadar web app.
// Shared parser for USDOT WZDx (work zone) and TDx (incident / restriction) feeds.
// WZDx spec: https://github.com/usdot-jpo-ode/wzdx  (CC0)
// TDx spec:   https://github.com/usdot-jpo-ode/TDx

import type {
  TransportationRiskEvent,
  TransportationEventType,
  Severity,
  TrafficGeometry,
  TransportationDetails,
} from "./types";

export type TransportationExchangeFeed =
  | "WZDX_WORK_ZONE"
  | "WZDX_DEVICE"
  | "TDX_INCIDENT"
  | "TDX_RESTRICTION";

interface WzdxFeature {
  type: "Feature";
  properties: Record<string, unknown> & {
    road_event_id?: string;
    event_type?: string;
    start_date?: string;
    end_date?: string;
    beginning_accuracy?: string;
    ending_accuracy?: string;
    vehicle_impact?: string;
    lanes?: Array<Record<string, unknown>>;
    relationship?: Record<string, unknown>;
    description?: string;
    creation_date?: string;
    update_date?: string;
    issuing_organization?: Record<string, unknown>;
  };
  geometry: { type: string; coordinates: unknown } | null;
}

interface WzdxFeed {
  type: "FeatureCollection";
  features: WzdxFeature[];
  metadata?: {
    feed_name?: string;
    issuing_organization?: string;
    specification_version?: string;
  };
  road_event_feed_info?: {
    feed_name?: string;
    issuing_organization?: string;
    specification_version?: string;
  };
}

function wzdxSeverity(vehicleImpact?: string): Severity {
  switch ((vehicleImpact ?? "").toLowerCase()) {
    case "all-lanes-closed":
    case "none-flowing":
      return "Severe";
    case "some-lanes-closed":
    case "signal-wobble":
      return "Moderate";
    case "fair-traffic":
    case "minimal-traffic":
    case "unknown-traffic":
    default:
      return "Minor";
  }
}

function wzdxEventType(eventType?: string): TransportationEventType {
  const et = (eventType ?? "").toLowerCase();
  if (et.includes("work")) return "Work Zone";
  if (et.includes("closure")) return "Road Closure";
  if (et.includes("lane")) return "Lane Closure";
  return "Work Zone";
}

function toGeometry(geometry: WzdxFeature["geometry"]): TrafficGeometry {
  if (!geometry) return { type: "None", coordinates: null };
  if (geometry.type === "LineString") return { type: "LineString", coordinates: geometry.coordinates };
  if (geometry.type === "MultiLineString") return { type: "MultiLineString", coordinates: geometry.coordinates };
  if (geometry.type === "Point") return { type: "Point", coordinates: geometry.coordinates };
  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    return { type: geometry.type as TrafficGeometry["type"], coordinates: geometry.coordinates };
  }
  return { type: "None", coordinates: null };
}

function laneStats(lanes: Array<Record<string, unknown>> | undefined): {
  lanesClosed: number | null;
  totalLanes: number | null;
  fullClosure: boolean;
} {
  if (!Array.isArray(lanes)) return { lanesClosed: null, totalLanes: null, fullClosure: false };
  const totalLanes = lanes.length;
  const closed = lanes.filter((l) => {
    const status = String(l.status ?? l.closed ?? "").toLowerCase();
    return status.includes("closed") || status === "true";
  }).length;
  return {
    lanesClosed: closed || null,
    totalLanes: totalLanes || null,
    fullClosure: totalLanes > 0 && closed >= totalLanes,
  };
}

export function parseWzdxFeed(
  raw: unknown,
  sourceLabel: string,
  state: string
): TransportationRiskEvent[] {
  const feed = raw as WzdxFeed;
  if (feed.type !== "FeatureCollection" || !Array.isArray(feed.features)) return [];

  const feedName =
    feed.metadata?.feed_name ??
    feed.road_event_feed_info?.feed_name ??
    feed.metadata?.issuing_organization ??
    sourceLabel;

  return feed.features.map((feature) => {
    const p = feature.properties;
    const type = wzdxEventType(p.event_type);
    const { lanesClosed, totalLanes, fullClosure } = laneStats(p.lanes);
    const impact = p.vehicle_impact;
    const details: TransportationDetails = {
      state,
      roadway: (p.relationship?.roadway_name as string) ?? null,
      direction: (p.relationship?.direction as string) ?? null,
      startMilepost: (p.relationship?.beginning_milepost as number) ?? null,
      endMilepost: (p.relationship?.ending_milepost as number) ?? null,
      lanesClosed,
      totalLanes,
      fullClosure,
      delayMinutes: null,
      detour: (p.relationship?.detour as string) ?? null,
      verified: null,
      planned: true,
    };

    return {
      id: `tz-${p.road_event_id ?? feedName}`,
      source: sourceLabel,
      sourceEventId: p.road_event_id ?? feedName,
      type,
      category: "Transportation",
      severity: wzdxSeverity(impact),
      headline: `${type} — ${details.roadway ?? feedName}${details.direction ? ` (${details.direction})` : ""}`,
      description: (p.description ?? "").slice(0, 600) || `${type} reported by ${feedName}.`,
      geometry: toGeometry(feature.geometry),
      startedAt: p.start_date ?? p.creation_date ?? new Date().toISOString(),
      expiresAt: p.end_date ?? null,
      updatedAt: p.update_date ?? p.creation_date ?? new Date().toISOString(),
      url: null,
      confidence: "Source reported",
      transportation: details,
    };
  });
}

// TDx incident/restriction parsing can reuse this same shape once sample
// payloads are captured. Placeholder until a live TDx feed is validated.
export function parseTdxFeed(
  raw: unknown,
  sourceLabel: string,
  state: string
): TransportationRiskEvent[] {
  // TODO: implement against a validated TDx RoadIncidentFeed / RoadRestrictionFeed.
  void raw;
  void sourceLabel;
  void state;
  return [];
}
