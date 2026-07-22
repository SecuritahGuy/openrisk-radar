import { newEventId } from "../lib/ids";
import type { Severity } from "../types/riskEvent";
import type { SupplementalRiskSignal } from "../types/supplementalRisk";
import { fetchTsunamiEvents } from "./tsunami";

const NTWC_ATOM = "https://www.tsunami.gov/events/xml/PAAQAtom.xml";
const PTWC_ATOM = "https://www.tsunami.gov/events/xml/PHEBAtom.xml";
const PROXY = "/api/noaa/tsunami-feed";
const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type TsunamiFeedMode = "primary" | "official-gap-fill" | "official-fallback";

export interface TsunamiFeedResult {
  signals: SupplementalRiskSignal[];
  mode: TsunamiFeedMode;
  primaryError: string | null;
}

interface FetchTsunamiFeedOptions {
  noaaEnabled: boolean;
}

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tag(xml: string, name: string): string | null {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${name}>`, "i"));
  return match ? decodeXml(match[1]) : null;
}

function severity(category: string): Severity {
  switch (category.toLowerCase()) {
    case "warning": return "Extreme";
    case "advisory": return "Severe";
    case "watch":
    case "threat": return "Moderate";
    default: return "Minor";
  }
}

function activeCategory(summary: string): string | null {
  const statedCategory = summary.match(/Category:\s*([A-Za-z]+)/i)?.[1];
  if (statedCategory) {
    return /^(Warning|Advisory|Watch|Threat)$/i.test(statedCategory)
      ? statedCategory
      : null;
  }
  return summary.match(/Tsunami\s+(Warning|Advisory|Watch|Threat)\b/i)?.[1] ?? null;
}

export function parseTsunamiAtom(xml: string, center: "NTWC" | "PTWC", nowMs = Date.now()): SupplementalRiskSignal[] {
  const entries = xml.match(/<entry\b[\s\S]*?<\/entry>/gi) ?? [];
  return entries.flatMap((entry) => {
    const summary = tag(entry, "summary") ?? "";
    const category = activeCategory(summary);
    const updatedAt = tag(entry, "updated");
    const latitude = Number(tag(entry, "geo:lat"));
    const longitude = Number(tag(entry, "geo:long"));
    const updatedMs = updatedAt ? new Date(updatedAt).getTime() : Number.NaN;
    if (!category || !updatedAt || !Number.isFinite(updatedMs) || nowMs - updatedMs > ACTIVE_WINDOW_MS) return [];
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];

    const sourceEventId = (tag(entry, "id") ?? `${center}-${updatedAt}`).replace(/^urn:uuid:/i, "");
    const place = tag(entry, "title") ?? "reported event";
    const bulletinUrl = entry.match(/<link\b[^>]*title=["']Bulletin["'][^>]*href=["']([^"']+)/i)?.[1]
      ?? entry.match(/<link\b[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)/i)?.[1]
      ?? "https://www.tsunami.gov/";

    return [{
      id: newEventId(),
      source: "NOAA_TSUNAMI",
      sourceEventId: `atom-${sourceEventId}`,
      category: "Coastal Water",
      type: `Tsunami ${category}`,
      severity: severity(category),
      headline: `${center} Tsunami ${category} — ${place}`,
      description: summary,
      geometry: { type: "Point", latitude, longitude },
      startedAt: updatedAt,
      expiresAt: new Date(updatedMs + ACTIVE_WINDOW_MS).toISOString(),
      updatedAt,
      url: bulletinUrl,
      confidence: "Source reported",
      metrics: [],
      raw: { center, transport: "Atom", summary },
    } satisfies SupplementalRiskSignal];
  });
}

async function fetchAtom(center: "ntwc" | "ptwc"): Promise<string> {
  const url = import.meta.env.PROD
    ? `${PROXY}?center=${center}`
    : center === "ntwc" ? NTWC_ATOM : PTWC_ATOM;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`NOAA ${center.toUpperCase()} Atom feed returned ${response.status}`);
  return response.text();
}

export async function fetchOfficialTsunamiFeeds(): Promise<SupplementalRiskSignal[]> {
  const results = await Promise.allSettled([fetchAtom("ntwc"), fetchAtom("ptwc")]);
  const signals = results.flatMap((result, index) => result.status === "fulfilled"
    ? parseTsunamiAtom(result.value, index === 0 ? "NTWC" : "PTWC")
    : []);
  if (results.every((result) => result.status === "rejected")) {
    throw new Error(results.map((result) => result.status === "rejected" ? errorMessage(result.reason) : "").join("; "));
  }
  return signals;
}

export async function fetchTsunamiFeed({ noaaEnabled }: FetchTsunamiFeedOptions): Promise<TsunamiFeedResult> {
  let primaryError: string | null = null;
  let primarySignals: SupplementalRiskSignal[] = [];
  if (noaaEnabled) {
    try {
      primarySignals = await fetchTsunamiEvents();
    } catch (error) {
      primaryError = errorMessage(error);
    }
  }

  if (primarySignals.length > 0) {
    return { signals: primarySignals, mode: "primary", primaryError: null };
  }

  try {
    const signals = await fetchOfficialTsunamiFeeds();
    return {
      signals,
      mode: primaryError ? "official-fallback" : signals.length > 0 ? "official-gap-fill" : "primary",
      primaryError,
    };
  } catch (fallbackError) {
    if (primaryError) {
      throw new Error(`NOAA Tsunami unavailable (${primaryError}); official Atom fallback unavailable (${errorMessage(fallbackError)})`);
    }
    if (!noaaEnabled) {
      throw new Error(`Official NOAA tsunami feeds unavailable (${errorMessage(fallbackError)})`);
    }
    return { signals: primarySignals, mode: "primary", primaryError: null };
  }
}
