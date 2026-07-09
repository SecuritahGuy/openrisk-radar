import { newEventId } from "../lib/ids";
import type { RiskEvent, Severity } from "../types/riskEvent";

const BASE = "https://www.fema.gov/api/open/v2";

interface FemaDeclaration {
  femaDeclarationString: string;
  disasterNumber: number;
  declarationTitle: string;
  declarationType: string;
  incidentType: string;
  state: string;
  county: string;
  countyCode: string;
  fipsStateCode: string;
  fipsCountyCode: string;
  declarationDate: string;
  incidentBeginDate: string;
  incidentEndDate: string | null;
  disasterCloseOutDate: string | null;
  programType: string;
}

interface FemaResponse {
  DisasterDeclarationsSummaries: FemaDeclaration[];
  metadata?: {
    count: number;
  };
}

function mapSeverity(decl: FemaDeclaration): Severity {
  const type = decl.declarationType;
  if (type === "DR") return "Severe";
  if (type === "EM") return "Moderate";
  if (type === "FM") return "Moderate";
  return "Minor";
}

function normalize(decl: FemaDeclaration): RiskEvent {
  return {
    id: newEventId(),
    source: "FEMA",
    sourceEventId: decl.femaDeclarationString,
    type: decl.incidentType || "Disaster Declaration",
    category: "Disaster",
    severity: mapSeverity(decl),
    headline:
      decl.declarationTitle ||
      `${decl.incidentType} - ${decl.county}, ${decl.state}`,
    description: `${decl.declarationType === "DR" ? "Major Disaster" : decl.declarationType === "EM" ? "Emergency" : "Fire Management"} declaration for ${decl.incidentType} in ${decl.county}, ${decl.state}.`,
    geometryType: "None",
    latitude: null,
    longitude: null,
    polygon: null,
    startedAt: decl.incidentBeginDate || decl.declarationDate,
    expiresAt: decl.disasterCloseOutDate,
    updatedAt: decl.declarationDate,
    url: null,
    confidence: "Source reported",
    raw: decl as unknown as Record<string, unknown>,
  };
}

export async function fetchFemaDeclarations(
  state: string,
  countyFips: string | null
): Promise<RiskEvent[]> {
  const filters = [`state eq '${state}'`];
  if (countyFips && countyFips.length >= 3) {
    filters.push(
      `fipsCountyCode eq '${countyFips.slice(-3)}'`
    );
  }
  const params = new URLSearchParams({
    $filter: filters.join(" and "),
    $orderby: "declarationDate desc",
    $top: "10",
  });
  const url = `${BASE}/DisasterDeclarationsSummaries?${params}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`FEMA API returned ${res.status}`);
  const data: FemaResponse = await res.json();
  return (data.DisasterDeclarationsSummaries ?? []).map(normalize);
}
