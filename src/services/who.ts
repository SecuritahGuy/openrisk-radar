import { newEventId } from "../lib/ids";
import { readJsonResponse } from "../lib/http";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE = "https://www.who.int/api/news/diseaseoutbreaknews";

interface WhoOutbreakItem {
  Id?: string;
  DonId?: string;
  Title?: string;
  Summary?: string;
  Overview?: string;
  Advice?: string;
  Assessment?: string;
  Epidemiology?: string;
  PublicationDate?: string;
  PublicationDateAndTime?: string;
  DateCreated?: string;
  LastModified?: string;
  UrlName?: string;
  ItemDefaultUrl?: string;
}

interface WhoOutbreakResponse {
  value?: WhoOutbreakItem[];
}

function whoSeverity(item: WhoOutbreakItem): Severity {
  const text = `${item.Title ?? ""} ${item.Summary ?? ""}`.toLowerCase();
  if (text.includes("emergency") || text.includes("pandemic") || text.includes("grade 3")) {
    return "Extreme";
  }
  if (text.includes("outbreak") || text.includes("epidemic") || text.includes("grade 2")) {
    return "Severe";
  }
  return "Moderate";
}

function haversineKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function normalizeWho(item: WhoOutbreakItem): RiskEvent {
  const id = item.DonId ?? item.Id ?? item.UrlName ?? item.Title ?? "who";
  const updated = item.LastModified ?? item.PublicationDateAndTime ?? item.DateCreated ?? new Date().toISOString();
  const headline = item.Title ?? "WHO disease outbreak news";
  const summary = (item.Summary ?? item.Overview ?? "").replace(/\s+/g, " ").trim();
  const advice = item.Advice ? ` Advice: ${item.Advice.replace(/\s+/g, " ").trim()}` : "";

  return {
    id: newEventId(),
    source: "WHO",
    sourceEventId: `who-${id}`,
    type: "Disease Outbreak",
    category: "Disaster",
    severity: whoSeverity(item),
    headline,
    description: `${summary}${advice}`.slice(0, 600).trim() || headline,
    geometryType: "None",
    latitude: null,
    longitude: null,
    polygon: null,
    startedAt: item.PublicationDateAndTime ?? item.PublicationDate ?? updated,
    expiresAt: null,
    updatedAt: updated,
    url: item.ItemDefaultUrl
      ? `https://www.who.int${item.ItemDefaultUrl}`
      : "https://www.who.int/emergencies/disease-outbreak-news",
    confidence: "Source reported",
    raw: item as unknown as Record<string, unknown>,
  };
}

export async function fetchWhoOutbreaks(
  lat: number,
  lng: number,
  radiusKm = 20000
): Promise<RiskEvent[]> {
  const res = await fetch(BASE);
  const data = await readJsonResponse<WhoOutbreakResponse>(res, "WHO Disease Outbreak News");
  if (!data.value?.length) return [];

  return data.value
    .map(normalizeWho)
    .filter((event) => {
      if (event.latitude == null || event.longitude == null) return true;
      return haversineKm(lat, lng, event.latitude, event.longitude) <= radiusKm;
    });
}
