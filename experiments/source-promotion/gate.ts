// EXPERIMENT ONLY — production-promotion checks for state/country source research.

export interface PromotionSource {
  id: string;
  access: string;
  endpoint: string;
  refreshSeconds: number;
  attribution: string;
  termsUrl: string;
  status: string;
  format: string;
  proxyRequired: boolean;
}

export interface StaticPromotionAssessment {
  readyForProbe: boolean;
  blockers: string[];
  requirements: string[];
}

export interface FreshnessAssessment {
  status: "fresh" | "stale" | "unknown";
  newestTimestamp: string | null;
  timestampCount: number;
  maxAgeHours: number;
}

const TIMESTAMP_KEY = /(?:date|time|updated|modified|published|issued|reported|created|started|ended|discovered)/i;
const OBSERVATION_TIMESTAMP_KEY = /(?:updated|modified|published|issued|reported|created)/i;
const MAX_VALUES = 5_000;

export function assessPromotionMetadata(source: PromotionSource): StaticPromotionAssessment {
  const blockers: string[] = [];
  const requirements: string[] = [];
  if (source.status !== "validated") blockers.push(`status is ${source.status}, not validated`);
  if (source.access !== "public") blockers.push(`access is ${source.access}, not public`);
  if (!source.endpoint.startsWith("https://")) blockers.push("endpoint must use HTTPS");
  if (!source.attribution.trim()) blockers.push("attribution is missing");
  if (!source.termsUrl.startsWith("https://")) blockers.push("terms URL must use HTTPS");
  if (!Number.isFinite(source.refreshSeconds) || source.refreshSeconds <= 0) {
    blockers.push("refresh interval must be positive");
  }
  if (source.proxyRequired) requirements.push("a Worker proxy and upstream failure policy are required");
  requirements.push("an adapter contract test and source-health entry are required");
  return { readyForProbe: blockers.length === 0, blockers, requirements };
}

function timestampMs(value: unknown): number | null {
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    if (value > 1e11) return value;
    if (value > 1e9) return value * 1000;
  }
  return null;
}

function timestampCandidates(payload: unknown): Array<{ value: number; observation: boolean }> {
  const timestamps: Array<{ value: number; observation: boolean }> = [];
  const queue: unknown[] = [payload];
  let visited = 0;
  while (queue.length > 0 && visited < MAX_VALUES) {
    const value = queue.shift();
    visited += 1;
    if (Array.isArray(value)) {
      queue.push(...value.slice(0, MAX_VALUES - visited));
      continue;
    }
    if (!value || typeof value !== "object") continue;
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      if (TIMESTAMP_KEY.test(key)) {
        const parsed = timestampMs(nested);
        if (parsed != null) timestamps.push({ value: parsed, observation: OBSERVATION_TIMESTAMP_KEY.test(key) });
      }
      if (nested && typeof nested === "object") queue.push(nested);
    }
  }
  return timestamps;
}

export function extractRecordTimestamps(payload: unknown): number[] {
  return timestampCandidates(payload).map((candidate) => candidate.value);
}

export function assessPayloadFreshness(
  source: Pick<PromotionSource, "refreshSeconds">,
  payload: unknown,
  nowMs = Date.now()
): FreshnessAssessment {
  const candidates = timestampCandidates(payload)
    .filter((candidate) => candidate.value <= nowMs + 24 * 60 * 60 * 1000);
  const observations = candidates.filter((candidate) => candidate.observation);
  const timestamps = (observations.length > 0 ? observations : candidates)
    .map((candidate) => candidate.value);
  const maxAgeMs = Math.max(24 * 60 * 60 * 1000, source.refreshSeconds * 4 * 1000);
  if (timestamps.length === 0) {
    return { status: "unknown", newestTimestamp: null, timestampCount: 0, maxAgeHours: maxAgeMs / 3_600_000 };
  }
  const newest = Math.max(...timestamps);
  return {
    status: nowMs - newest <= maxAgeMs ? "fresh" : "stale",
    newestTimestamp: new Date(newest).toISOString(),
    timestampCount: timestamps.length,
    maxAgeHours: maxAgeMs / 3_600_000,
  };
}

async function jsonResponse(url: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json, application/geo+json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function probeArcGis(source: PromotionSource): Promise<unknown> {
  const base = source.endpoint.replace(/\/$/, "");
  if (/\/(?:FeatureServer|MapServer)\/\d+$/i.test(base)) {
    return jsonResponse(`${base}/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=200&f=json`);
  }
  const metadata = await jsonResponse(`${base}?f=json`) as { layers?: Array<{ id: number }> };
  const layerId = metadata.layers?.[0]?.id;
  if (layerId == null) throw new Error("ArcGIS service has no queryable layer");
  return jsonResponse(`${base}/${layerId}/query?where=1%3D1&outFields=*&returnGeometry=false&resultRecordCount=200&f=json`);
}

export async function probeSourcePayload(source: PromotionSource): Promise<unknown> {
  if (source.format === "arcgis") return probeArcGis(source);
  if (["json", "geojson", "wzdx"].includes(source.format)) return jsonResponse(source.endpoint);
  throw new Error(`freshness probing is not implemented for ${source.format}`);
}
