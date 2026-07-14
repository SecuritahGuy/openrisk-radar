import Papa from "papaparse";
import { newEventId } from "../lib/ids";
import type { EventCategory, RiskEvent, Severity } from "../types/riskEvent";

const BASE_URL = "https://www.ncei.noaa.gov/stormevents/csv";
const PROXY_URL = "/api/noaa/storm-events";
const DEFAULT_LOOKBACK_YEARS = 10;
const DEFAULT_LIMIT = 25;

const STATE_NAMES: Record<string, string> = {
  AL: "ALABAMA",
  AK: "ALASKA",
  AZ: "ARIZONA",
  AR: "ARKANSAS",
  CA: "CALIFORNIA",
  CO: "COLORADO",
  CT: "CONNECTICUT",
  DE: "DELAWARE",
  DC: "DISTRICT OF COLUMBIA",
  FL: "FLORIDA",
  GA: "GEORGIA",
  HI: "HAWAII",
  ID: "IDAHO",
  IL: "ILLINOIS",
  IN: "INDIANA",
  IA: "IOWA",
  KS: "KANSAS",
  KY: "KENTUCKY",
  LA: "LOUISIANA",
  ME: "MAINE",
  MD: "MARYLAND",
  MA: "MASSACHUSETTS",
  MI: "MICHIGAN",
  MN: "MINNESOTA",
  MS: "MISSISSIPPI",
  MO: "MISSOURI",
  MT: "MONTANA",
  NE: "NEBRASKA",
  NV: "NEVADA",
  NH: "NEW HAMPSHIRE",
  NJ: "NEW JERSEY",
  NM: "NEW MEXICO",
  NY: "NEW YORK",
  NC: "NORTH CAROLINA",
  ND: "NORTH DAKOTA",
  OH: "OHIO",
  OK: "OKLAHOMA",
  OR: "OREGON",
  PA: "PENNSYLVANIA",
  RI: "RHODE ISLAND",
  SC: "SOUTH CAROLINA",
  SD: "SOUTH DAKOTA",
  TN: "TENNESSEE",
  TX: "TEXAS",
  UT: "UTAH",
  VT: "VERMONT",
  VA: "VIRGINIA",
  WA: "WASHINGTON",
  WV: "WEST VIRGINIA",
  WI: "WISCONSIN",
  WY: "WYOMING",
  PR: "PUERTO RICO",
};

export interface StormEventsOptions {
  lookbackYears?: number;
  limit?: number;
  now?: Date;
}

interface StormEventRow {
  EVENT_ID: string;
  CZ_NAME_STR: string;
  BEGIN_LOCATION: string;
  BEGIN_DATE: string;
  BEGIN_TIME: string;
  EVENT_TYPE: string;
  MAGNITUDE: string;
  TOR_F_SCALE: string;
  DEATHS_DIRECT: string;
  INJURIES_DIRECT: string;
  DAMAGE_PROPERTY_NUM: string;
  DAMAGE_CROPS_NUM: string;
  STATE_ABBR: string;
  CZ_TIMEZONE: string;
  MAGNITUDE_TYPE: string;
  EPISODE_ID: string;
  CZ_TYPE: string;
  CZ_FIPS: string;
  WFO: string;
  INJURIES_INDIRECT: string;
  DEATHS_INDIRECT: string;
  SOURCE: string;
  FLOOD_CAUSE: string;
  TOR_LENGTH: string;
  TOR_WIDTH: string;
  BEGIN_RANGE: string;
  BEGIN_AZIMUTH: string;
  END_RANGE: string;
  END_AZIMUTH: string;
  END_LOCATION: string;
  END_DATE: string;
  END_TIME: string;
  BEGIN_LAT: string;
  BEGIN_LON: string;
  END_LAT: string;
  END_LON: string;
  EVENT_NARRATIVE: string;
  EPISODE_NARRATIVE: string;
  ABSOLUTE_ROWNUMBER: string;
}

function clean(value: string | undefined): string {
  return (value ?? "").trim();
}

function numeric(value: string | undefined): number {
  const cleaned = clean(value);
  if (!cleaned) return 0;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(date: string, time: string): string {
  const [month = "01", day = "01", year = "1970"] = clean(date).split("/");
  const paddedTime = clean(time).padStart(4, "0");
  const hour = paddedTime.slice(0, -2) || "00";
  const minute = paddedTime.slice(-2) || "00";
  const iso = new Date(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hour.padStart(2, "0")}:${minute}:00`
  ).toISOString();
  return iso;
}

function categoryFor(eventType: string): EventCategory {
  const type = eventType.toLowerCase();
  if (type.includes("flood") || type.includes("rain")) return "Weather";
  if (type.includes("winter") || type.includes("snow") || type.includes("ice")) {
    return "Ice";
  }
  if (type.includes("wildfire")) return "Wildfire";
  if (type.includes("drought")) return "Drought";
  if (type.includes("volcanic")) return "Volcanic";
  if (type.includes("tropical") || type.includes("hurricane")) return "Tropical";
  if (type.includes("dust")) return "Dust";
  if (type.includes("debris flow")) return "Landslide";
  return "Weather";
}

function severityFor(row: StormEventRow): Severity {
  const deaths = numeric(row.DEATHS_DIRECT) + numeric(row.DEATHS_INDIRECT);
  const injuries = numeric(row.INJURIES_DIRECT) + numeric(row.INJURIES_INDIRECT);
  const damage = numeric(row.DAMAGE_PROPERTY_NUM) + numeric(row.DAMAGE_CROPS_NUM);
  const eventType = clean(row.EVENT_TYPE).toLowerCase();

  if (deaths > 0 || injuries >= 10 || damage >= 1_000_000) return "Severe";
  if (injuries > 0 || damage >= 100_000) return "Moderate";
  if (eventType.includes("tornado") || eventType.includes("flash flood")) {
    return "Moderate";
  }
  return "Minor";
}

function impactScore(row: StormEventRow): number {
  return (
    numeric(row.DEATHS_DIRECT) * 1_000_000 +
    numeric(row.DEATHS_INDIRECT) * 1_000_000 +
    numeric(row.INJURIES_DIRECT) * 50_000 +
    numeric(row.INJURIES_INDIRECT) * 50_000 +
    numeric(row.DAMAGE_PROPERTY_NUM) +
    numeric(row.DAMAGE_CROPS_NUM)
  );
}

function rowDate(row: StormEventRow): number {
  const value = new Date(parseDate(row.BEGIN_DATE, row.BEGIN_TIME)).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function normalizeCounty(county: string | null): string | null {
  if (!county) return null;
  return county.replace(/\s+County$/i, "").trim().toUpperCase();
}

function toEvent(row: StormEventRow): RiskEvent {
  const startedAt = parseDate(row.BEGIN_DATE, row.BEGIN_TIME);
  const endedAt = clean(row.END_DATE)
    ? parseDate(row.END_DATE, row.END_TIME)
    : startedAt;
  const eventType = clean(row.EVENT_TYPE) || "Storm Event";
  const location = clean(row.BEGIN_LOCATION) || clean(row.CZ_NAME_STR);
  const deaths = numeric(row.DEATHS_DIRECT) + numeric(row.DEATHS_INDIRECT);
  const injuries = numeric(row.INJURIES_DIRECT) + numeric(row.INJURIES_INDIRECT);
  const damage = numeric(row.DAMAGE_PROPERTY_NUM) + numeric(row.DAMAGE_CROPS_NUM);
  const narrative = clean(row.EVENT_NARRATIVE) || clean(row.EPISODE_NARRATIVE);
  const summaryParts = [
    `${eventType} recorded in ${clean(row.CZ_NAME_STR) || "the county"}`,
    location ? `near ${location}` : null,
    deaths > 0 ? `${deaths} death${deaths !== 1 ? "s" : ""}` : null,
    injuries > 0 ? `${injuries} injur${injuries !== 1 ? "ies" : "y"}` : null,
    damage > 0 ? `$${Math.round(damage).toLocaleString()} reported damage` : null,
  ].filter(Boolean);

  return {
    id: newEventId(),
    source: "NOAA",
    sourceEventId: clean(row.EVENT_ID),
    type: eventType,
    category: categoryFor(eventType),
    severity: severityFor(row),
    headline: `${eventType}${location ? ` - ${location}` : ""}`,
    description: narrative || `${summaryParts.join("; ")}.`,
    geometryType: clean(row.BEGIN_LAT) && clean(row.BEGIN_LON) ? "Point" : "None",
    latitude: clean(row.BEGIN_LAT) ? Number(row.BEGIN_LAT) : null,
    longitude: clean(row.BEGIN_LON) ? Number(row.BEGIN_LON) : null,
    polygon: null,
    startedAt,
    expiresAt: endedAt,
    updatedAt: endedAt,
    url: `https://www.ncei.noaa.gov/stormevents/eventdetails.jsp?id=${encodeURIComponent(clean(row.EVENT_ID))}`,
    confidence: "Source reported",
    raw: {
      ...row,
      impactScore: impactScore(row),
      totalDeaths: deaths,
      totalInjuries: injuries,
      totalDamage: damage,
    } as unknown as Record<string, unknown>,
  };
}

export async function fetchStormEvents(
  state: string,
  stateFips: string | null,
  county: string | null,
  countyFips: string | null,
  options: StormEventsOptions = {}
): Promise<RiskEvent[]> {
  const stateName = STATE_NAMES[state];
  const countyName = normalizeCounty(county);
  if (!stateName || !stateFips || !countyName || !countyFips) return [];

  const now = options.now ?? new Date();
  const lookbackYears = options.lookbackYears ?? DEFAULT_LOOKBACK_YEARS;
  const startYear = Math.max(1950, now.getFullYear() - lookbackYears + 1);
  const params = new URLSearchParams({
    eventType: "ALL",
    beginDate_mm: "01",
    beginDate_dd: "01",
    beginDate_yyyy: String(startYear),
    endDate_mm: "12",
    endDate_dd: "31",
    endDate_yyyy: String(now.getFullYear()),
    hailfilter: "0.00",
    tornfilter: "0",
    windfilter: "000",
    sort: "DN",
    submitbutton: "Search",
    statefips: `${Number(stateFips)},${stateName}`,
    county: `${countyName}:${Number(countyFips.slice(-3))}`,
  });

  const endpoint = import.meta.env.PROD ? PROXY_URL : BASE_URL;
  const res = await fetch(`${endpoint}?${params}`, {
    headers: { Accept: "text/csv" },
  });
  if (!res.ok) throw new Error(`NOAA Storm Events API returned ${res.status}`);

  const text = await res.text();
  const parsed = Papa.parse<StormEventRow>(text, {
    header: true,
    skipEmptyLines: true,
  });
  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "Unable to parse NOAA Storm Events CSV");
  }

  return parsed.data
    .filter((row) => clean(row.EVENT_ID))
    .sort((a, b) => {
      const impactDelta = impactScore(b) - impactScore(a);
      if (impactDelta !== 0) return impactDelta;
      return rowDate(b) - rowDate(a);
    })
    .slice(0, options.limit ?? DEFAULT_LIMIT)
    .map(toEvent);
}
