import type { RiskEvent, Severity } from "../types/riskEvent";

interface WzdxCoreDetails {
  event_type?: string;
  road_names?: string[];
  direction?: string;
  description?: string;
  creation_date?: string;
  update_date?: string;
  data_source_id?: string;
  related_road_events?: Array<{ type?: string; id?: string }>;
}

interface WzdxProperties {
  core_details?: WzdxCoreDetails;
  start_date?: string;
  end_date?: string;
  vehicle_impact?: string;
  beginning_milepost?: number;
  ending_milepost?: number;
  reduced_speed_limit_kph?: number;
  event_type?: string;
  road_names?: string[];
  direction?: string;
  description?: string;
  creation_date?: string;
  update_date?: string;
  data_source_id?: string;
  related_road_events?: Array<{ type?: string; id?: string }>;
  road_event_id?: string;
  beginning_cross_street?: string;
  ending_cross_street?: string;
  is_start_position_verified?: boolean;
  is_end_position_verified?: boolean;
  is_start_date_verified?: boolean;
  is_end_date_verified?: boolean;
  location_method?: string;
  restrictions?: Array<Record<string, unknown>>;
  types_of_work?: Array<Record<string, unknown>>;
  lanes?: Array<Record<string, unknown>>;
}

interface WzdxFeature {
  id?: string | number;
  geometry?: { type?: string; coordinates?: unknown } | null;
  properties?: WzdxProperties;
}

interface WzdxFeed {
  type?: string;
  features?: WzdxFeature[];
}

export interface WzdxProvider {
  id: string;
  label: string;
  url?: string;
}

export const US_STATE_NAMES: Record<string, string> = {
  AL: "ALABAMA", AK: "ALASKA", AZ: "ARIZONA", AR: "ARKANSAS", CA: "CALIFORNIA",
  CO: "COLORADO", CT: "CONNECTICUT", DE: "DELAWARE", FL: "FLORIDA", GA: "GEORGIA",
  HI: "HAWAII", ID: "IDAHO", IL: "ILLINOIS", IN: "INDIANA", IA: "IOWA",
  KS: "KANSAS", KY: "KENTUCKY", LA: "LOUISIANA", ME: "MAINE", MD: "MARYLAND",
  MA: "MASSACHUSETTS", MI: "MICHIGAN", MN: "MINNESOTA", MS: "MISSISSIPPI", MO: "MISSOURI",
  MT: "MONTANA", NE: "NEBRASKA", NV: "NEVADA", NH: "NEW HAMPSHIRE", NJ: "NEW JERSEY",
  NM: "NEW MEXICO", NY: "NEW YORK", NC: "NORTH CAROLINA", ND: "NORTH DAKOTA",
  OH: "OHIO", OK: "OKLAHOMA", OR: "OREGON", PA: "PENNSYLVANIA", RI: "RHODE ISLAND",
  SC: "SOUTH CAROLINA", SD: "SOUTH DAKOTA", TN: "TENNESSEE", TX: "TEXAS",
  UT: "UTAH", VT: "VERMONT", VA: "VIRGINIA", WA: "WASHINGTON", WV: "WEST VIRGINIA",
  WI: "WISCONSIN", WY: "WYOMING", DC: "DISTRICT OF COLUMBIA",
};

function distanceKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function coordinatePairs(value: unknown, pairs: Array<[number, number]>): void {
  if (!Array.isArray(value)) return;
  if (
    value.length >= 2 &&
    typeof value[0] === "number" &&
    typeof value[1] === "number" &&
    Number.isFinite(value[0]) &&
    Number.isFinite(value[1])
  ) {
    pairs.push([value[0], value[1]]);
    return;
  }
  for (const child of value) coordinatePairs(child, pairs);
}

function nearestCoordinate(
  coordinates: unknown,
  latitude: number,
  longitude: number
): { longitude: number; latitude: number; distanceKm: number } | null {
  const pairs: Array<[number, number]> = [];
  coordinatePairs(coordinates, pairs);
  let nearest: { longitude: number; latitude: number; distanceKm: number } | null = null;
  for (const [candidateLongitude, candidateLatitude] of pairs) {
    const distance = distanceKm(latitude, longitude, candidateLatitude, candidateLongitude);
    if (!nearest || distance < nearest.distanceKm) {
      nearest = { longitude: candidateLongitude, latitude: candidateLatitude, distanceKm: distance };
    }
  }
  return nearest;
}

function severityForImpact(value: string | undefined): Severity {
  switch ((value ?? "unknown").toLowerCase()) {
    case "all-lanes-closed":
      return "Severe";
    case "some-lanes-closed":
    case "some-lanes-closed-merge-left":
    case "some-lanes-closed-merge-right":
    case "some-lanes-closed-split":
    case "alternating-one-way":
      return "Moderate";
    default:
      return "Minor";
  }
}

function meaningfulValue(value: string | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized || ["unknown", "unspecified", "other"].includes(normalized.toLowerCase())) {
    return null;
  }
  return normalized;
}

function impactFromDescription(impact: string | undefined, description: string | undefined): string | undefined {
  if (meaningfulValue(impact)) return impact;
  const text = description?.toLowerCase() ?? "";
  if (/\b(?:all lanes?|road(?:way)?) (?:is |are )?(?:closed|blocked)\b/.test(text)) {
    return "all-lanes-closed";
  }
  if (/\b(?:lane|lanes) closed\b|\balternating traffic\b|\bvarious lanes closed\b/.test(text)) {
    return "some-lanes-closed";
  }
  return impact;
}

function eventType(value: string | undefined, impact: string | undefined): string {
  if ((impact ?? "").toLowerCase() === "all-lanes-closed") return "Road Closure";
  if ((value ?? "").toLowerCase() === "detour") return "Road Detour";
  return "Work Zone";
}

function headlineForEvent(
  description: string | undefined,
  type: string,
  road: string,
  direction: string | null
): string {
  const descriptionLead = description?.split(/\s+(?:between|from)\s+/i)[0]?.trim();
  if (descriptionLead && descriptionLead.length <= 120 && descriptionLead.length >= 8) {
    return descriptionLead;
  }
  return `${type} on ${road}${direction ? ` (${direction})` : ""}`;
}

function validDate(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? new Date(time).toISOString() : fallback;
}

function isRelevantWindow(start: string | undefined, end: string | undefined, nowMs: number): boolean {
  const endMs = end ? new Date(end).getTime() : Number.NaN;
  if (Number.isFinite(endMs) && endMs < nowMs) return false;
  const startMs = start ? new Date(start).getTime() : Number.NaN;
  return !Number.isFinite(startMs) || startMs <= nowMs + 7 * 24 * 60 * 60 * 1000;
}

export function normalizeWzdxFeed(
  raw: unknown,
  provider: WzdxProvider,
  state: string,
  latitude: number,
  longitude: number,
  radiusKm: number,
  nowMs = Date.now()
): RiskEvent[] {
  const feed = raw as WzdxFeed;
  if (feed.type !== "FeatureCollection" || !Array.isArray(feed.features)) return [];
  const nowIso = new Date(nowMs).toISOString();

  const groups = new Map<string, WzdxFeature[]>();
  feed.features.forEach((feature, index) => {
    const core = feature.properties?.core_details ?? feature.properties;
    const firstOccurrence = core?.related_road_events?.find(
      (relation) => relation.type?.toLowerCase() === "first-occurrence" && relation.id
    )?.id;
    const hasNextOccurrence = core?.related_road_events?.some(
      (relation) => relation.type?.toLowerCase() === "next-occurrence"
    );
    const ownId = String(feature.id ?? feature.properties?.road_event_id ?? index);
    const groupId = firstOccurrence ?? (hasNextOccurrence ? ownId : `single:${ownId}`);
    groups.set(groupId, [...(groups.get(groupId) ?? []), feature]);
  });

  return Array.from(groups.entries()).flatMap(([recurrenceId, features]): RiskEvent[] => {
    const candidates = features.flatMap((feature) => {
      const properties = feature.properties;
      if (!properties || !feature.geometry) return [];
      if (!isRelevantWindow(properties.start_date, properties.end_date, nowMs)) return [];
      const nearest = nearestCoordinate(feature.geometry.coordinates, latitude, longitude);
      if (!nearest || nearest.distanceKm > radiusKm) return [];
      return [{ feature, properties, nearest }];
    });
    if (!candidates.length) return [];

    candidates.sort((a, b) => {
      const aStart = new Date(a.properties.start_date ?? nowIso).getTime();
      const bStart = new Date(b.properties.start_date ?? nowIso).getTime();
      return aStart - bStart;
    });
    const current = candidates.find(({ properties }) => {
      const start = new Date(properties.start_date ?? nowIso).getTime();
      const end = new Date(properties.end_date ?? nowIso).getTime();
      return start <= nowMs && (!Number.isFinite(end) || end >= nowMs);
    }) ?? candidates[0];
    const { feature, properties, nearest } = current;
    const core = properties.core_details ?? properties;

    const roads = core.road_names?.filter(Boolean) ?? [];
    const road = roads.join(" / ") || "nearby roadway";
    const effectiveImpact = impactFromDescription(properties.vehicle_impact, core.description);
    const type = eventType(core.event_type, effectiveImpact);
    const direction = meaningfulValue(core.direction);
    const sourceEventId = features.length > 1
      ? recurrenceId
      : String(
          feature.id ??
          properties.road_event_id ??
          properties.core_details?.data_source_id ??
          properties.data_source_id ??
          `${road}-${properties.start_date ?? nowIso}`
        );
    const startedAt = validDate(properties.start_date ?? core.creation_date, nowIso);
    const updatedAt = validDate(core.update_date ?? properties.update_date, startedAt);
    const details = [
      core.description,
      meaningfulValue(effectiveImpact) ? `Vehicle impact: ${effectiveImpact?.replace(/-/g, " ")}.` : "",
      properties.reduced_speed_limit_kph ? `Reduced speed: ${properties.reduced_speed_limit_kph} km/h.` : "",
      properties.beginning_milepost != null ? `Begins near milepost ${properties.beginning_milepost}.` : "",
    ].filter(Boolean).join(" ");

    const validStarts = features
      .map((item) => item.properties?.start_date)
      .filter((value): value is string => !!value && Number.isFinite(new Date(value).getTime()))
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const validEnds = features
      .map((item) => item.properties?.end_date)
      .filter((value): value is string => !!value && Number.isFinite(new Date(value).getTime()))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    return [{
      id: `usdot-${provider.id}-${sourceEventId}`,
      source: "USDOT",
      sourceEventId: `${provider.id}:${sourceEventId}`,
      type,
      category: "Transportation",
      severity: severityForImpact(effectiveImpact),
      headline: headlineForEvent(core.description, type, road, direction),
      description: details || `${type} reported by ${provider.label}.`,
      geometryType: "Point",
      latitude: nearest.latitude,
      longitude: nearest.longitude,
      polygon: null,
      startedAt,
      expiresAt: properties.end_date ? validDate(properties.end_date, startedAt) : null,
      updatedAt,
      url: provider.url ?? "https://data.transportation.gov/",
      confidence: "Source reported",
      provider: {
        id: provider.id,
        label: provider.label,
        authority: "state",
        attributionUrl: provider.url ?? "https://data.transportation.gov/",
      },
      raw: {
        state,
        geometryType: feature.geometry?.type ?? "Unknown",
        vehicleImpact: properties.vehicle_impact ?? null,
        effectiveVehicleImpact: effectiveImpact ?? null,
        direction: direction ?? null,
        roadNames: roads,
        beginningCrossStreet: properties.beginning_cross_street ?? null,
        endingCrossStreet: properties.ending_cross_street ?? null,
        beginningMilepost: properties.beginning_milepost ?? null,
        endingMilepost: properties.ending_milepost ?? null,
        reducedSpeedLimitKph: properties.reduced_speed_limit_kph ?? null,
        locationMethod: meaningfulValue(properties.location_method),
        startPositionVerified: properties.is_start_position_verified ?? null,
        endPositionVerified: properties.is_end_position_verified ?? null,
        startDateVerified: properties.is_start_date_verified ?? null,
        endDateVerified: properties.is_end_date_verified ?? null,
        restrictions: properties.restrictions ?? [],
        typesOfWork: properties.types_of_work ?? [],
        lanes: properties.lanes ?? [],
        recurrenceId,
        occurrenceCount: features.length,
        seriesStartAt: validStarts[0] ?? properties.start_date ?? null,
        seriesEndAt: validEnds[0] ?? properties.end_date ?? null,
      },
    }];
  });
}
