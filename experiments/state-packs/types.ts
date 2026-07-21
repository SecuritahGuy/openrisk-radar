// EXPERIMENT ONLY — not imported by the OpenRiskRadar web app.
// Research scaffold for state-intelligence packs.
// Each pack bundles transportation, wildfire, evacuation, water, grid and
// environmental sources for a single US state, activated when a searched
// location or saved asset is within that state.

export type Capability =
  | "transportation-events"
  | "road-weather"
  | "wildfire"
  | "evacuation"
  | "water"
  | "grid"
  | "environmental-health"
  | "landslide"
  | "tsunami"
  | "volcano"
  | "hazard"
  | "avalanche"
  | "marine"
  | "earthquake";

export type OutputModel = "risk-event" | "supplemental-signal" | "map-overlay";

export type AccessType = "public" | "api-key" | "authenticated" | "research-required";

export type SourceFormat =
  | "json"
  | "geojson"
  | "xml"
  | "csv"
  | "arcgis"
  | "wzdx"
  | "cap"
  | "rss"
  | "kml"
  | "html";

export type SourceStatus =
  | "validated"
  | "discovered"
  | "research-required"
  | "research"
  | "error";

export type AuthorityLevel = "local" | "state" | "federal" | "international" | "unknown";

export interface StateSourceDefinition {
  id: string;
  authority: string;
  authorityLevel?: AuthorityLevel;
  coverage: {
    states: string[];
    counties?: string[];
    isoTerritory?: string;
  };
  capability: Capability;
  outputModel: OutputModel;
  access: AccessType;
  format: SourceFormat;
  endpoint: string;
  refreshSeconds: number;
  proxyRequired: boolean;
  attribution: string;
  termsUrl: string;
  status: SourceStatus;
  notes?: string;
}

export interface StateIntelligencePack {
  state: string;
  name: string;
  sources: StateSourceDefinition[];
}

export interface StateIntelRegistry {
  byState: Record<string, StateIntelligencePack>;
  byCapability: Partial<Record<Capability, string[]>>;
  allSources: StateSourceDefinition[];
}

// Authority hierarchy for deduplication — higher = more authoritative.
// Research spec: Local > State > Federal > International.
export const AUTHORITY_RANK: Record<string, number> = {
  local: 100,
  state: 80,
  federal: 60,
  international: 40,
  unknown: 0,
};

export function sourceAuthority(source: StateSourceDefinition): number {
  if (source.authorityLevel) return AUTHORITY_RANK[source.authorityLevel];
  const authority = source.authority.toLowerCase();
  if (/\b(city|county|municipal|local)\b/.test(authority)) return AUTHORITY_RANK.local;
  if (/\b(noaa|nws|usgs|fema|nifc|nasa|federal|national interagency)\b/.test(authority)) {
    return AUTHORITY_RANK.federal;
  }
  if (/\b(state|department|dept|dot|dnr|dec|dem|cal fire|office of emergency)\b/.test(authority)) {
    return AUTHORITY_RANK.state;
  }
  if (/\b(united nations|international|global)\b/.test(authority)) {
    return AUTHORITY_RANK.international;
  }
  return AUTHORITY_RANK.unknown;
}

export function compareAuthority(a: StateSourceDefinition, b: StateSourceDefinition): number {
  return sourceAuthority(b) - sourceAuthority(a);
}
