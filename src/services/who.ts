import { newEventId } from "../lib/ids";
import { readJsonResponse } from "../lib/http";
import { stateName } from "../data/state-abbr";
import type { ResolvedLocation } from "../types/location";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE = "https://www.who.int/api/news/diseaseoutbreaknews";
const RECENT_WINDOW_MS = 45 * 24 * 60 * 60 * 1000;

export interface WhoOutbreakItem {
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

function countryNames(location: ResolvedLocation): string[] {
  const country = location.country.trim().toLowerCase();
  const aliases: Record<string, string[]> = {
    usa: ["united states", "usa", "u.s."],
    "united states": ["united states", "usa", "u.s."],
    uk: ["united kingdom", "uk", "u.k."],
    "united kingdom": ["united kingdom", "uk", "u.k."],
  };
  return [...new Set((aliases[country] ?? [country]).filter((value) => value.length >= 3))];
}

function normalizedWords(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function includesPhrase(text: string, phrase: string): boolean {
  const haystack = ` ${normalizedWords(text)} `;
  const needle = normalizedWords(phrase);
  return needle.length >= 2 && haystack.includes(` ${needle} `);
}

export function whoItemMatchesLocation(
  item: WhoOutbreakItem,
  location: ResolvedLocation
): boolean {
  const title = item.Title ?? "";
  return countryNames(location).some((name) => includesPhrase(title, name));
}

export function whoItemMatchesLocality(
  item: WhoOutbreakItem,
  location: ResolvedLocation
): boolean {
  const geographyText = [item.Title, item.Summary, item.Overview]
    .filter(Boolean)
    .join(" ");
  const expandedState = stateName(location.state);
  const localityNames = [
    location.city,
    location.county,
    expandedState,
    expandedState ? null : location.state,
  ].filter((value): value is string => Boolean(value && value.trim().length >= 4));

  return localityNames.some((name) => includesPhrase(geographyText, name));
}

function isRecentWhoItem(item: WhoOutbreakItem, nowMs: number): boolean {
  const published = new Date(
    item.PublicationDateAndTime ?? item.PublicationDate ?? item.DateCreated ?? ""
  ).getTime();
  return Number.isFinite(published) && nowMs - published <= RECENT_WINDOW_MS;
}

export function normalizeWho(
  item: WhoOutbreakItem,
  location?: ResolvedLocation
): RiskEvent {
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
    provider: {
      id: "who-don",
      label: "WHO Disease Outbreak News",
      authority: "international",
      attributionUrl: "https://www.who.int/emergencies/disease-outbreak-news",
    },
    raw: {
      ...item,
      openRiskScope: location
        ? {
            whoCountryMatch: true,
            whoLocalityMatch: whoItemMatchesLocality(item, location),
          }
        : undefined,
    },
  };
}

export async function fetchWhoOutbreaks(
  location: ResolvedLocation,
  nowMs = Date.now()
): Promise<RiskEvent[]> {
  const params = new URLSearchParams({
    "$orderby": "PublicationDateAndTime desc",
    "$top": "50",
  });
  const res = await fetch(`${BASE}?${params}`);
  const data = await readJsonResponse<WhoOutbreakResponse>(res, "WHO Disease Outbreak News");
  if (!data.value?.length) return [];

  return data.value
    .filter((item) => isRecentWhoItem(item, nowMs))
    .filter((item) => whoItemMatchesLocation(item, location))
    .map((item) => normalizeWho(item, location))
    .slice(0, 10);
}
