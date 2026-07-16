// EXPERIMENT ONLY — not imported by the OpenRiskRadar web app.
// Shared parser for USDOT WZDx (work zone) and TDx (incident / restriction) feeds.
// WZDx spec v4.x: https://github.com/usdot-jpo-ode/wzdx  (CC0)
//   EventType: "work-zone" | "detour"
//   VehicleImpact: all-lanes-closed, some-lanes-closed, all-lanes-open,
//     alternating-one-way, some-lanes-closed-merge-left/right,
//     all-lanes-open-shift-left/right, some-lanes-closed-split,
//     flagging, temporary-traffic-signal, unknown
// TDx spec: https://github.com/usdot-jpo-ode/TDx

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

interface WzdxCoreDetails {
  event_type?: string;
  road_names?: string[];
  direction?: string;
  description?: string;
  creation_date?: string;
  update_date?: string;
  data_source_id?: string;
  name?: string;
}

interface LaneProperties {
  status?: string;
  type?: string;
  order?: number;
}

interface TypeOfWorkProperties {
  type_name?: string;
  is_architectural_change?: boolean;
}

// v4+ structure: core_details nested, properties flat for temporal/spatial
interface WzdxV4Properties {
  core_details?: WzdxCoreDetails;
  start_date?: string;
  end_date?: string;
  vehicle_impact?: string;
  lanes?: LaneProperties[];
  restrictions?: Record<string, unknown>[];
  types_of_work?: TypeOfWorkProperties[];
  beginning_milepost?: number;
  ending_milepost?: number;
  beginning_cross_street?: string;
  ending_cross_street?: string;
  reduced_speed_limit_kph?: number;
  is_start_date_verified?: boolean;
  is_end_date_verified?: boolean;
  is_start_position_verified?: boolean;
  is_end_position_verified?: boolean;
  // v3 fallback fields (flat)
  event_type?: string;
  description?: string;
  creation_date?: string;
  update_date?: string;
  relationship?: Record<string, unknown>;
  road_event_id?: string;
}

interface WzdxFeature {
  type: "Feature";
  id?: string | number;
  properties: WzdxV4Properties;
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

const VEHICLE_IMPACT_SEVERITY: Record<string, Severity> = {
  "all-lanes-closed": "Severe",
  "some-lanes-closed": "Moderate",
  "some-lanes-closed-merge-left": "Moderate",
  "some-lanes-closed-merge-right": "Moderate",
  "some-lanes-closed-split": "Moderate",
  "alternating-one-way": "Moderate",
  "temporary-traffic-signal": "Moderate",
  "all-lanes-open": "Minor",
  "all-lanes-open-shift-left": "Minor",
  "all-lanes-open-shift-right": "Minor",
  flagging: "Minor",
  unknown: "Minor",
};

function wzdxSeverity(vehicleImpact: string | undefined): Severity {
  return VEHICLE_IMPACT_SEVERITY[(vehicleImpact ?? "unknown").toLowerCase()] ?? "Minor";
}

function wzdxEventType(eventType: string | undefined): TransportationEventType {
  if (!eventType) return "Work Zone";
  const et = eventType.toLowerCase().trim();
  if (et === "detour") return "Road Closure";
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

function laneStats(lanes: LaneProperties[] | undefined): {
  lanesClosed: number | null;
  totalLanes: number | null;
  fullClosure: boolean;
} {
  if (!Array.isArray(lanes) || lanes.length === 0) {
    return { lanesClosed: null, totalLanes: null, fullClosure: false };
  }
  const totalLanes = lanes.length;
  const closed = lanes.filter((l) => {
    const status = String(l.status ?? "").toLowerCase();
    return status === "closed" || status === "merge-left" || status === "merge-right";
  }).length;
  return {
    lanesClosed: closed > 0 ? closed : null,
    totalLanes,
    fullClosure: totalLanes > 0 && closed >= totalLanes,
  };
}

function corsDetails(p: WzdxV4Properties): {
  core: WzdxCoreDetails;
  isV4: boolean;
} {
  if (p.core_details && typeof p.core_details === "object" && p.core_details.event_type) {
    return { core: p.core_details, isV4: true };
  }
  return { core: p, isV4: false };
}

function roadLabel(roadNames: string[] | undefined, fallback: string): string {
  if (!roadNames || roadNames.length === 0) return fallback;
  return roadNames.join(" / ");
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max).trimEnd() + "..." : text;
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

  const events: TransportationRiskEvent[] = [];

  for (const feature of feed.features) {
    const p = feature.properties;
    if (!p) continue;

    const { core, isV4 } = corsDetails(p);
    const eventType = wzdxEventType(core.event_type);
    const sev = wzdxSeverity(p.vehicle_impact);
    const { lanesClosed, totalLanes, fullClosure } = laneStats(p.lanes);
    const roadNames = core.road_names;
    const roadLabelStr = roadLabel(roadNames, feedName);

    const headParts: string[] = [eventType];
    if (roadNames && roadNames.length > 0) {
      headParts.push(`on ${roadNames.join(", ")}`);
    }
    if (core.direction) {
      headParts.push(`(${core.direction})`);
    }
    const headline = headParts.join(" ");

    const descParts: string[] = [];
    if (isV4 && core.description) {
      descParts.push(core.description);
    } else if (!isV4 && core.description) {
      descParts.push(core.description as string);
    }
    if (p.reduced_speed_limit_kph) {
      descParts.push(`Reduced speed: ${p.reduced_speed_limit_kph} km/h.`);
    }
    if (Array.isArray(p.types_of_work)) {
      const workTypes = p.types_of_work
        .filter((w): w is TypeOfWorkProperties => !!w.type_name)
        .map((w) => w.type_name!.replace(/-/g, " "));
      if (workTypes.length > 0) {
        descParts.push(`Work types: ${workTypes.join(", ")}.`);
      }
    }
    const description = descParts.length > 0
      ? truncate(descParts.join(" "), 600)
      : `${eventType} reported by ${feedName}.`;

    const eventId = String(feature.id ?? `wzdx-${core.data_source_id ?? "?"}-${p.start_date ?? ""}`);
    const nowIso = new Date().toISOString();

    const details: TransportationDetails = {
      state,
      roadway: roadLabelStr,
      direction: core.direction ?? null,
      startMilepost: p.beginning_milepost ?? null,
      endMilepost: p.ending_milepost ?? null,
      lanesClosed,
      totalLanes,
      fullClosure,
      delayMinutes: null,
      detour: null,
      verified: p.is_start_position_verified ?? null,
      planned: !(p.is_start_date_verified ?? false),
    };

    events.push({
      id: `tz-${eventId}`,
      source: sourceLabel,
      sourceEventId: eventId,
      type: eventType,
      category: "Transportation",
      severity: sev,
      headline,
      description,
      geometry: toGeometry(feature.geometry),
      startedAt: p.start_date ?? core.creation_date ?? nowIso,
      expiresAt: p.end_date ?? null,
      updatedAt: (isV4 ? core.update_date : (core as Record<string, unknown>).update_date as string) ?? nowIso,
      url: null,
      confidence: "Source reported",
      transportation: details,
      raw: feature as unknown as Record<string, unknown>,
    });
  }

  return events;
}

export function parseTdxFeed(
  raw: unknown,
  sourceLabel: string,
  state: string
): TransportationRiskEvent[] {
  void raw;
  void sourceLabel;
  void state;
  return [];
}
