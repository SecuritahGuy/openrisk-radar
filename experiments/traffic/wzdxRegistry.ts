// EXPERIMENT ONLY — not imported by the OpenRiskRadar web app.
// Client for the USDOT WZDx feed registry (Socrata open dataset).
// Registry: https://data.transportation.gov/resource/69qe-yiui.json
// Do NOT hardcode participating states — resolve from this registry at runtime.

import type { TransportationExchangeFeed } from "./transportationDataExchange";

export const WZDX_REGISTRY_URL =
  "https://data.transportation.gov/resource/69qe-yiui.json";

export interface WzdxRegistryRecord {
  organizationName: string;
  jurisdiction: string;
  feedUrl: string;
  feedType: string;
  specificationVersion: string;
  needsApiKey: boolean;
  active: boolean;
}

export interface ResolvedTrafficFeed {
  organizationName: string;
  jurisdiction: string;
  feedUrl: string;
  feedType: TransportationExchangeFeed;
  specificationVersion: string;
  needsApiKey: boolean;
  active: boolean;
}

function classifyFeedType(feedType: string): TransportationExchangeFeed {
  const t = feedType.toLowerCase();
  if (t.includes("device")) return "WZDX_DEVICE";
  if (t.includes("incident")) return "TDX_INCIDENT";
  if (t.includes("restriction")) return "TDX_RESTRICTION";
  return "WZDX_WORK_ZONE";
}

export async function fetchWzdxRegistry(
  signal?: AbortSignal
): Promise<ResolvedTrafficFeed[]> {
  const res = await fetch(WZDX_REGISTRY_URL, { signal });
  if (!res.ok) {
    throw new Error(`WZDx registry returned ${res.status}`);
  }
  const rows = (await res.json()) as Array<Record<string, unknown>>;
  return rows.map((row) => {
    const urlObj = row.url as { url?: string } | string | undefined;
    const feedUrl = typeof urlObj === "object" && urlObj?.url ? urlObj.url : String(urlObj ?? "");
    const organizationName = String(row.issuingorganization ?? row.organizationName ?? "Unknown");
    const jurisdiction = String(row.state ?? row.jurisdiction ?? "");
    const feedTypeRaw = String(row.format ?? row.feed_type ?? "geojson");
    const specificationVersion = String(row.version ?? row.specification_version ?? "");
    const needsApiKey = row.needapikey === true || row.needapikey === "true";
    const active = row.active === true || row.active === "true" || row.active === undefined;
    return {
      organizationName,
      jurisdiction,
      feedUrl,
      feedType: classifyFeedType(feedTypeRaw),
      specificationVersion,
      needsApiKey,
      active,
    };
  });
}

const STATE_ABBR_TO_NAME: Record<string, string> = {
  AL: "ALABAMA", AK: "ALASKA", AZ: "ARIZONA", AR: "ARKANSAS", CA: "CALIFORNIA",
  CO: "COLORADO", CT: "CONNECTICUT", DE: "DELAWARE", FL: "FLORIDA", GA: "GEORGIA",
  HI: "HAWAII", ID: "IDAHO", IL: "ILLINOIS", IN: "INDIANA", IA: "IOWA",
  KS: "KANSAS", KY: "KENTUCKY", LA: "LOUISIANA", ME: "MAINE", MD: "MARYLAND",
  MA: "MASSACHUSETTS", MI: "MICHIGAN", MN: "MINNESOTA", MO: "MISSOURI",
  MT: "MONTANA", NE: "NEBRASKA", NV: "NEVADA", NH: "NEW HAMPSHIRE", NJ: "NEW JERSEY",
  NM: "NEW MEXICO", NY: "NEW YORK", NC: "NORTH CAROLINA", ND: "NORTH DAKOTA",
  OH: "OHIO", OK: "OKLAHOMA", OR: "OREGON", PA: "PENNSYLVANIA", RI: "RHODE ISLAND",
  SC: "SOUTH CAROLINA", SD: "SOUTH DAKOTA", TN: "TENNESSEE", TX: "TEXAS",
  UT: "UTAH", VT: "VERMONT", VA: "VIRGINIA", WA: "WASHINGTON", WV: "WEST VIRGINIA",
  WI: "WISCONSIN", WY: "WYOMING",
};

export async function fetchWzdxFeedsForState(
  state: string,
  signal?: AbortSignal
): Promise<ResolvedTrafficFeed[]> {
  const all = await fetchWzdxRegistry(signal);
  const target = state.toUpperCase();
  const targetName = STATE_ABBR_TO_NAME[target];
  return all.filter((feed) => {
    const jurisdiction = feed.jurisdiction.toUpperCase();
    if (targetName) return jurisdiction === targetName;
    return jurisdiction === target;
  });
}
