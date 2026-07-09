import { newEventId } from "../lib/ids";
import type { RiskEvent } from "../types/riskEvent";

const BASE =
  "https://services9.arcgis.com/RHVPKKiFTONKtxq3/arcgis/rest/services/USA_Wildfires_v1/FeatureServer/0/query";

interface NifcProperties {
  IncidentName: string | null;
  IncidentTypeCategory: string | null;
  CalculatedAcres: number | null;
  PercentContained: number | null;
  FireDiscoveryDateTime: number | null;
  POOCounty: string | null;
  POOState: string | null;
  FireCauseGeneral: string | null;
  FireCause: string | null;
  TotalIncidentPersonnel: number | null;
  ResidencesDestroyed: number | null;
  OtherStructuresDestroyed: number | null;
  Injuries: number | null;
  Fatalities: number | null;
  ModifiedOnDateTime: number | null;
  IncidentTypeKind: string | null;
  IrwinID: string | null;
}

interface NifcFeature {
  geometry: {
    type: "Point";
    coordinates: [number, number];
  } | null;
  properties: NifcProperties;
}

interface NifcResponse {
  features: NifcFeature[];
}

function mapSeverity(props: NifcProperties): RiskEvent["severity"] {
  const acres = props.CalculatedAcres ?? 0;
  const contained = props.PercentContained ?? 0;

  if (props.IncidentTypeCategory !== "WF") return "Minor";

  if (acres >= 10000 && contained < 50) return "Extreme";
  if (acres >= 1000 && contained < 80) return "Severe";
  if (acres >= 100) return "Moderate";
  return "Minor";
}

function normalize(feature: NifcFeature): RiskEvent | null {
  const p = feature.properties;
  if (!p || !feature.geometry) return null;

  const [lng, lat] = feature.geometry.coordinates;
  const cat = p.IncidentTypeCategory ?? "UNK";
  const isWildfire = cat === "WF";
  const acres = p.CalculatedAcres;
  const contained = p.PercentContained;

  const sizeLabel =
    acres != null
      ? `${acres.toLocaleString()} acres`
      : "size unknown";
  const containmentLabel =
    contained != null
      ? `${contained}% contained`
      : "containment unknown";

  const headline = p.IncidentName ?? "Unnamed Fire";
  const description = isWildfire
    ? `Wildfire: ${headline} — ${sizeLabel}, ${containmentLabel}.${p.POOCounty ? ` County: ${p.POOCounty}.` : ""}${p.FireCauseGeneral ? ` Cause: ${p.FireCauseGeneral}.` : ""}`
    : `Prescribed burn: ${headline} — ${sizeLabel}.${p.POOCounty ? ` County: ${p.POOCounty}.` : ""}`;

  const discoveryTs = p.FireDiscoveryDateTime
    ? new Date(p.FireDiscoveryDateTime).toISOString()
    : null;
  const modifiedTs = p.ModifiedOnDateTime
    ? new Date(p.ModifiedOnDateTime).toISOString()
    : null;

  return {
    id: newEventId(),
    source: "NIFC",
    sourceEventId: p.IrwinID ?? `${lng},${lat}`,
    type: isWildfire ? "Wildfire" : "Prescribed Burn",
    category: "Wildfire",
    severity: mapSeverity(p),
    headline,
    description,
    geometryType: "Point",
    latitude: lat,
    longitude: lng,
    polygon: null,
    startedAt: discoveryTs ?? modifiedTs ?? new Date().toISOString(),
    expiresAt: null,
    updatedAt: modifiedTs ?? discoveryTs ?? new Date().toISOString(),
    url: null,
    confidence: "Source reported",
    raw: p as unknown as Record<string, unknown>,
  };
}

export async function fetchWildfires(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<RiskEvent[]> {
  const params = new URLSearchParams({
    where: "IncidentTypeCategory IN ('WF','RX')",
    geometry: `${lng},${lat}`,
    geometryType: "esriGeometryPoint",
    inSR: "4326",
    outSR: "4326",
    returnGeometry: "true",
    f: "geojson",
    distance: Math.round(radiusKm * 1000).toString(),
    units: "esriSRUnit_Meter",
    outFields: [
      "IncidentName",
      "IncidentTypeCategory",
      "CalculatedAcres",
      "PercentContained",
      "FireDiscoveryDateTime",
      "POOCounty",
      "POOState",
      "FireCauseGeneral",
      "FireCause",
      "TotalIncidentPersonnel",
      "ResidencesDestroyed",
      "OtherStructuresDestroyed",
      "Injuries",
      "Fatalities",
      "ModifiedOnDateTime",
      "IncidentTypeKind",
      "IrwinID",
    ].join(","),
    orderByFields: "CalculatedAcres DESC",
    resultRecordCount: "50",
  });
  const url = `${BASE}?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NIFC API returned ${res.status}`);
  const data: NifcResponse = await res.json();
  return (data.features ?? []).map(normalize).filter(Boolean) as RiskEvent[];
}
