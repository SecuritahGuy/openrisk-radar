const SERVICE_URL =
  "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query";

export interface FemaRiskIndexHazard {
  code: string;
  label: string;
  score: number | null;
  rating: string;
}

export interface FemaRiskIndexCounty {
  county: string;
  state: string;
  stateCountyFips: string;
  population: number | null;
  riskScore: number | null;
  riskRating: string;
  riskPercentile: number | null;
  expectedAnnualLoss: number | null;
  expectedAnnualLossRating: string;
  socialVulnerabilityRating: string;
  communityResilienceRating: string;
  topHazards: FemaRiskIndexHazard[];
  raw: Record<string, unknown>;
}

interface ArcGisQueryResponse {
  features?: Array<{
    attributes?: Record<string, unknown>;
  }>;
  error?: {
    message?: string;
  };
}

const HAZARDS: Array<{ code: string; label: string }> = [
  { code: "AVLN", label: "Avalanche" },
  { code: "CFLD", label: "Coastal flooding" },
  { code: "CWAV", label: "Cold wave" },
  { code: "DRGT", label: "Drought" },
  { code: "ERQK", label: "Earthquake" },
  { code: "HAIL", label: "Hail" },
  { code: "HWAV", label: "Heat wave" },
  { code: "HRCN", label: "Hurricane" },
  { code: "ISTM", label: "Ice storm" },
  { code: "LNDS", label: "Landslide" },
  { code: "LTNG", label: "Lightning" },
  { code: "IFLD", label: "Riverine flooding" },
  { code: "SWND", label: "Strong wind" },
  { code: "TRND", label: "Tornado" },
  { code: "TSUN", label: "Tsunami" },
  { code: "VLCN", label: "Volcanic activity" },
  { code: "WFIR", label: "Wildfire" },
  { code: "WNTW", label: "Winter weather" },
];

function text(value: unknown, fallback = "Not rated"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function mapCounty(attributes: Record<string, unknown>): FemaRiskIndexCounty {
  const hazards = HAZARDS.map((hazard) => ({
    code: hazard.code,
    label: hazard.label,
    score: numberValue(attributes[`${hazard.code}_RISKS`]),
    rating: text(attributes[`${hazard.code}_RISKR`], "Not Applicable"),
  }))
    .filter((hazard) => hazard.score != null)
    .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    .slice(0, 5);

  return {
    county: text(attributes.COUNTY, "Unknown county"),
    state: text(attributes.STATEABBRV, ""),
    stateCountyFips: text(attributes.STCOFIPS, ""),
    population: numberValue(attributes.POPULATION),
    riskScore: numberValue(attributes.RISK_SCORE),
    riskRating: text(attributes.RISK_RATNG),
    riskPercentile: numberValue(attributes.RISK_SPCTL),
    expectedAnnualLoss: numberValue(attributes.EAL_VALT),
    expectedAnnualLossRating: text(attributes.EAL_RATNG),
    socialVulnerabilityRating: text(attributes.SOVI_RATNG),
    communityResilienceRating: text(attributes.RESL_RATNG),
    topHazards: hazards,
    raw: attributes,
  };
}

export async function fetchFemaRiskIndexCounty(
  stateCountyFips: string | null
): Promise<FemaRiskIndexCounty | null> {
  if (!stateCountyFips) return null;

  const params = new URLSearchParams({
    where: `STCOFIPS='${stateCountyFips}'`,
    outFields: "*",
    resultRecordCount: "1",
    f: "json",
  });
  const res = await fetch(`${SERVICE_URL}?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`FEMA NRI API returned ${res.status}`);

  const data = (await res.json()) as ArcGisQueryResponse;
  if (data.error) {
    throw new Error(data.error.message ?? "FEMA NRI API error");
  }

  const attributes = data.features?.[0]?.attributes;
  return attributes ? mapCounty(attributes) : null;
}
