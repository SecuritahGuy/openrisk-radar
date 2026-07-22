import { newEventId } from "../lib/ids";
import { readJsonResponse } from "../lib/http";
import { parseNoaaTsunamiJson } from "../lib/noaaTsunamiJson";
import type { SupplementalRiskSignal, SupplementalMetric } from "../types/supplementalRisk";
import type { Severity } from "../types/riskEvent";

const BASE = "https://tsunami.gov/php/esri.php";
const PROXY = "/api/noaa/tsunami";

interface TsunamiSegment {
  id: number;
  category: string;
  headline: string;
  recommendedActions: string;
  NWSZones?: string;
  productDefinition: string;
  bkp_start_location?: string;
  bkp_end_location?: string;
}

interface TsunamiObservation {
  id: number;
  locationName: string;
  locationCountry?: string;
  lat: string;
  lon: string;
  observedPosAmplitude: string;
  observedMaxTime: string;
  predictedPosAmplitude: string;
  predictedPosAmplitudeUnits: string;
  predictedArrivalTime: string;
}

interface TsunamiEvent {
  TWCID: string;
  eventMagnitude: number;
  eventMagnitudeType: string;
  eventDepth: number;
  eventLat: number;
  eventLon: number;
  originTime: string;
  bulletinIssueTime: string;
  quakeLocation: string;
  twcEventID: string;
  bulletinNr: string;
  segments: TsunamiSegment[];
  observations: TsunamiObservation[];
}

interface TsunamiResponse {
  items: TsunamiEvent[];
}

function tsunamiSeverity(segmentCategory: string): Severity {
  switch (segmentCategory.toLowerCase()) {
    case "warning": return "Extreme";
    case "advisory": return "Severe";
    case "watch": return "Moderate";
    case "cancellation": return "Minor";
    case "information statement": return "Minor";
    case "statement": return "Minor";
    default: return "Minor";
  }
}

function parsePayload(text: string): TsunamiResponse {
  return parseNoaaTsunamiJson<TsunamiResponse>(text);
}

function isActiveSegment(category: string): boolean {
  return ["warning", "advisory", "watch"].includes(category.toLowerCase());
}

export async function fetchTsunamiEvents(): Promise<SupplementalRiskSignal[]> {
  const params = new URLSearchParams({
    a: "t",
    format: "json",
  });

  const url = import.meta.env.PROD ? PROXY : `${BASE}?${params}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`NOAA Tsunami API returned ${res.status}`);
  }
  const json = import.meta.env.PROD
    ? await readJsonResponse<TsunamiResponse>(res, "NOAA Tsunami API")
    : parsePayload(await res.text());
  if (!json.items?.length) return [];

  const signals: SupplementalRiskSignal[] = [];

  for (const event of json.items) {
    const segment = event.segments?.find((item) => isActiveSegment(item.category));
    if (!segment) continue;
    const issuedAt = new Date(event.bulletinIssueTime).getTime();
    if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > 7 * 24 * 60 * 60 * 1000) continue;

    const sev = tsunamiSeverity(segment.category);
    const metrics: SupplementalMetric[] = [
      { label: "Magnitude", value: event.eventMagnitude, unit: event.eventMagnitudeType },
      { label: "Depth", value: event.eventDepth, unit: "km" },
    ];

    const nearestObs = event.observations?.slice(0, 3) ?? [];
    for (const obs of nearestObs) {
      const amp = parseFloat(obs.predictedPosAmplitude);
      if (!isNaN(amp) && amp > 0) {
        metrics.push({
          label: obs.locationName,
          value: amp,
          unit: obs.predictedPosAmplitudeUnits,
        });
      }
    }

    signals.push({
      id: newEventId(),
      source: "NOAA_TSUNAMI",
      sourceEventId: `${event.TWCID}-${event.twcEventID}-${event.bulletinNr}`,
      category: "Coastal Water",
      type: `Tsunami ${segment.category}`,
      severity: sev,
      headline: segment.headline || `Tsunami ${segment.category} from M${event.eventMagnitude} quake`,
      description: segment.recommendedActions
        ? segment.recommendedActions.replace(/\s+/g, " ").trim()
        : `Tsunami threat from M${event.eventMagnitude} earthquake near ${event.quakeLocation}.`,
      geometry: { type: "Point", latitude: event.eventLat, longitude: event.eventLon },
      startedAt: event.bulletinIssueTime,
      expiresAt: null,
      updatedAt: event.bulletinIssueTime,
      url: "https://tsunami.gov",
      confidence: "Source reported",
      metrics,
      raw: event as unknown as Record<string, unknown>,
    });
  }

  return signals;
}
