import { newEventId } from "../lib/ids";
import type { Severity } from "../types/riskEvent";
import type { SupplementalRiskSignal, SupplementalMetric } from "../types/supplementalRisk";

const WFS = "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wfs";
const TYPE_NAME = "GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes";

export interface GvpProperties {
  Volcano_Number: string;
  Volcano_Name: string;
  Primary_Volcano_Type: string;
  Volcanic_Landform: string;
  Last_Eruption_Year: string;
  Country: string;
  Region: string;
  Subregion: string;
  Latitude: string;
  Longitude: string;
  Elevation: string;
  Tectonic_Setting: string;
  Geologic_Epoch: string;
  Evidence_Category: string;
  Major_Rock_Type: string;
}

export interface GvpFeature {
  type: "Feature";
  id: string;
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: GvpProperties;
}

interface GvpResponse {
  type: "FeatureCollection";
  features: GvpFeature[];
  numberReturned: number;
  numberMatched: number;
}

export function gvpSeverity(volcano: GvpProperties): Severity {
  const year = volcano.Last_Eruption_Year;
  if (!year || year === "None" || year === "Unknown") return "Minor";
  const y = parseInt(year, 10);
  if (isNaN(y)) return "Minor";
  if (y >= 2000) return "Moderate";
  if (y >= 1900) return "Minor";
  return "Minor";
}

export function normalize(volcano: GvpProperties): SupplementalRiskSignal {
  const lat = parseFloat(volcano.Latitude);
  const lng = parseFloat(volcano.Longitude);
  const year = volcano.Last_Eruption_Year || "Unknown";
  const sev = gvpSeverity(volcano);

  const metrics: SupplementalMetric[] = [
    { label: "Type", value: volcano.Primary_Volcano_Type },
    { label: "Elevation", value: volcano.Elevation, unit: "m" },
    { label: "Last Eruption", value: year },
    { label: "Evidence", value: volcano.Evidence_Category },
    { label: "Tectonic Setting", value: volcano.Tectonic_Setting },
    { label: "Rock Type", value: volcano.Major_Rock_Type },
  ];

  return {
    id: newEventId(),
    source: "GVP",
    sourceEventId: `gvp-${volcano.Volcano_Number}`,
    category: "Volcano",
    type: `Volcano: ${volcano.Primary_Volcano_Type}`,
    severity: sev,
    headline: `${volcano.Volcano_Name} (${volcano.Country}) — Last erupted ${year}`,
    description: [
      `${volcano.Volcano_Name} is a ${volcano.Primary_Volcano_Type} in ${volcano.Region}, ${volcano.Country}.`,
      `Elevation: ${volcano.Elevation} m.`,
      `Last eruption: ${year}.`,
    ].join(" "),
    geometry: {
      type: "Point",
      latitude: lat,
      longitude: lng,
    },
    startedAt: new Date().toISOString(),
    expiresAt: null,
    updatedAt: new Date().toISOString(),
    url: `https://volcano.si.edu/volcano.cfm?vn=${volcano.Volcano_Number}`,
    confidence: "Source reported",
    metrics,
    raw: volcano as unknown as Record<string, unknown>,
  };
}

function wfsUrl(typeNames: string, extraParams?: string): string {
  const base =
    `${WFS}?service=WFS&version=2.0.0&request=GetFeature` +
    `&typeNames=${typeNames}&outputFormat=application/json`;
  return extraParams ? `${base}&${extraParams}` : base;
}

export async function fetchVolcanoByNumber(vn: string): Promise<SupplementalRiskSignal | null> {
  const url = wfsUrl(TYPE_NAME, `cql_filter=Volcano_Number=${vn}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GVP WFS returned ${res.status}`);
  const data: GvpResponse = await res.json();
  if (!data.features || data.features.length === 0) return null;
  return normalize(data.features[0].properties);
}

export async function fetchVolcanoesByCountry(country: string): Promise<SupplementalRiskSignal[]> {
  const encoded = encodeURIComponent(country);
  const url = wfsUrl(TYPE_NAME, `cql_filter=Country=%27${encoded}%27`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GVP WFS returned ${res.status}`);
  const data: GvpResponse = await res.json();
  if (!data.features || data.features.length === 0) return [];
  return data.features.map((f) => normalize(f.properties));
}

export async function fetchRecentlyErupted(minYear: number): Promise<SupplementalRiskSignal[]> {
  const url = wfsUrl(TYPE_NAME, `cql_filter=Last_Eruption_Year%20>=%20${minYear}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GVP WFS returned ${res.status}`);
  const data: GvpResponse = await res.json();
  if (!data.features || data.features.length === 0) return [];
  return data.features.map((f) => normalize(f.properties));
}

export async function fetchVolcanoesByRegion(region: string): Promise<SupplementalRiskSignal[]> {
  const encoded = encodeURIComponent(region);
  const url = wfsUrl(TYPE_NAME, `cql_filter=Region=%27${encoded}%27`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GVP WFS returned ${res.status}`);
  const data: GvpResponse = await res.json();
  if (!data.features || data.features.length === 0) return [];
  return data.features.map((f) => normalize(f.properties));
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

export async function fetchVolcanoesNearby(
  lat: number,
  lng: number,
  radiusKm: number
): Promise<SupplementalRiskSignal[]> {
  const kmPerDeg = 111.32;
  const latDelta = radiusKm / kmPerDeg;
  const lngDelta = radiusKm / (kmPerDeg * Math.cos((lat * Math.PI) / 180));

  const bbox = `${lng - lngDelta},${lat - latDelta},${lng + lngDelta},${lat + latDelta}`;
  const url = wfsUrl(TYPE_NAME, `bbox=${bbox}`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`GVP WFS returned ${res.status}`);
  const data: GvpResponse = await res.json();
  if (!data.features || data.features.length === 0) return [];

  return data.features
    .filter((f) => {
      const coords = f.geometry.coordinates;
      return haversineKm(lat, lng, coords[1], coords[0]) <= radiusKm;
    })
    .map((f) => normalize(f.properties));
}
