import { bboxAround, distanceMiles, kmToMiles } from "../lib/geo";
import { newEventId } from "../lib/ids";
import type { SupplementalMetric, SupplementalRiskSignal } from "../types/supplementalRisk";

const SITE_BASE = "https://waterservices.usgs.gov/nwis/site";
const IV_BASE = "https://waterservices.usgs.gov/nwis/iv";
const PARAMETERS = ["00065", "00060"] as const;

export interface UsgsWaterSite {
  agency: string;
  siteId: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  distanceMiles: number;
}

interface WaterMlValue {
  value: string;
  dateTime: string;
  qualifiers?: string[];
}

interface WaterMlTimeSeries {
  sourceInfo: {
    siteName: string;
    siteCode: Array<{ value: string }>;
    geoLocation: {
      geogLocation: {
        latitude: number;
        longitude: number;
      };
    };
  };
  variable: {
    variableCode: Array<{ value: string }>;
    variableDescription: string;
    unit: { unitCode: string };
  };
  values: Array<{ value: WaterMlValue[] }>;
}

interface WaterMlResponse {
  value?: {
    timeSeries?: WaterMlTimeSeries[];
  };
}

function parseRdb(text: string): Array<Record<string, string>> {
  const lines = text
    .split(/\r?\n/)
    .filter((line) => line.trim() && !line.startsWith("#"));
  const [headerLine, , ...rows] = lines;
  if (!headerLine) return [];

  const headers = headerLine.split("\t");
  return rows.map((row) => {
    const values = row.split("\t");
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });
}

function latestValue(series: WaterMlTimeSeries): WaterMlValue | null {
  const values = series.values[0]?.value ?? [];
  return values.length > 0 ? values[values.length - 1] : null;
}

function metricLabel(parameter: string): string {
  if (parameter === "00065") return "Gage height";
  if (parameter === "00060") return "Discharge";
  return parameter;
}

export async function fetchUsgsWaterSites(
  latitude: number,
  longitude: number,
  radiusKm: number,
  limit = 12
): Promise<UsgsWaterSite[]> {
  const radiusMiles = kmToMiles(radiusKm);
  const bbox = bboxAround(latitude, longitude, radiusMiles);
  const round6 = (n: number) => n.toFixed(6);
  const params = new URLSearchParams({
    format: "rdb",
    bBox: `${round6(bbox.west)},${round6(bbox.south)},${round6(bbox.east)},${round6(bbox.north)}`,
    parameterCd: PARAMETERS.join(","),
    siteStatus: "active",
  });
  const res = await fetch(`${SITE_BASE}?${params}`);
  if (!res.ok) throw new Error(`USGS site service returned ${res.status}`);

  const rows = parseRdb(await res.text());
  return rows
    .map((row): UsgsWaterSite | null => {
      const siteLatitude = Number(row.dec_lat_va);
      const siteLongitude = Number(row.dec_long_va);
      if (!Number.isFinite(siteLatitude) || !Number.isFinite(siteLongitude)) {
        return null;
      }

      return {
        agency: row.agency_cd,
        siteId: row.site_no,
        name: row.station_nm,
        type: row.site_tp_cd,
        latitude: siteLatitude,
        longitude: siteLongitude,
        distanceMiles: distanceMiles(
          { latitude, longitude },
          { latitude: siteLatitude, longitude: siteLongitude }
        ),
      };
    })
    .filter((site): site is UsgsWaterSite => site != null)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)
    .slice(0, limit);
}

export async function fetchUsgsWaterObservations(
  latitude: number,
  longitude: number,
  radiusKm: number,
  limit = 8
): Promise<SupplementalRiskSignal[]> {
  const sites = await fetchUsgsWaterSites(latitude, longitude, radiusKm, limit);
  if (sites.length === 0) return [];

  const params = new URLSearchParams({
    format: "json",
    sites: sites.map((site) => site.siteId).join(","),
    period: "PT2H",
    parameterCd: PARAMETERS.join(","),
    siteStatus: "all",
  });
  const res = await fetch(`${IV_BASE}?${params}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`USGS water service returned ${res.status}`);

  const data: WaterMlResponse = await res.json();
  const bySite = new Map<string, WaterMlTimeSeries[]>();
  for (const series of data.value?.timeSeries ?? []) {
    const siteId = series.sourceInfo.siteCode[0]?.value;
    if (!siteId) continue;
    bySite.set(siteId, [...(bySite.get(siteId) ?? []), series]);
  }

  return sites.flatMap((site) => {
    const series = bySite.get(site.siteId) ?? [];
    const metrics: SupplementalMetric[] = series.flatMap((item) => {
      const parameter = item.variable.variableCode[0]?.value ?? "";
      const value = latestValue(item);
      if (!value) return [];
      return [
        {
          label: metricLabel(parameter),
          value: Number(value.value),
          unit: item.variable.unit.unitCode,
        },
      ];
    });
    if (metrics.length === 0) return [];

    const updatedAt =
      series
        .map(latestValue)
        .filter((value): value is WaterMlValue => value != null)
        .map((value) => new Date(value.dateTime).getTime())
        .filter(Number.isFinite)
        .sort((a, b) => b - a)[0] ?? Date.now();

    return [
      {
        id: newEventId(),
        source: "USGS_WATER",
        sourceEventId: site.siteId,
        category: "River Gauge",
        type: "Water Observation",
        severity: "Minor",
        headline: site.name,
        description: `Latest USGS water observations for ${site.name}.`,
        geometry: {
          type: "Point",
          latitude: site.latitude,
          longitude: site.longitude,
        },
        startedAt: new Date(updatedAt).toISOString(),
        expiresAt: null,
        updatedAt: new Date(updatedAt).toISOString(),
        url: `https://waterdata.usgs.gov/monitoring-location/${site.siteId}/`,
        confidence: "Source reported",
        metrics,
        raw: { site, series } as unknown as Record<string, unknown>,
      },
    ];
  });
}
