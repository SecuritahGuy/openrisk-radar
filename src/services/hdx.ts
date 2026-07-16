import { newEventId } from "../lib/ids";
import { readJsonResponse } from "../lib/http";
import type { SupplementalRiskSignal, SupplementalMetric } from "../types/supplementalRisk";
import type { Severity } from "../types/riskEvent";

const BASE = "https://data.humdata.org/api/3/action/package_search";

export interface HdxExposureQuery {
  country?: string;
  datasetQuery?: string;
  limit?: number;
}

interface HdxResource {
  name?: string;
  url?: string;
  format?: string;
  description?: string;
}

interface HdxResult {
  name?: string;
  title?: string;
  license_title?: string;
  url?: string;
  resources?: HdxResource[];
  metadata_modified?: string;
}

interface HdxSearchResponse {
  success?: boolean;
  result?: { count: number; results: HdxResult[] };
}

function hdxSeverity(): Severity {
  return "Minor";
}

export async function fetchHdxExposure(query: HdxExposureQuery): Promise<SupplementalRiskSignal[]> {
  const { country, datasetQuery = "health facilities", limit = 5 } = query;
  const q = [country, datasetQuery].filter(Boolean).join(" ");

  const params = new URLSearchParams({
    q,
    rows: limit.toString(),
    fq: "res_format:GeoJSON OR res_format:geojson",
  });

  const res = await fetch(`${BASE}?${params}`);
  const data = await readJsonResponse<HdxSearchResponse>(res, "HDX");
  const results = data.result?.results ?? [];
  if (results.length === 0) return [];

  const signals: SupplementalRiskSignal[] = [];

  for (const result of results) {
    const geojsonResource = result.resources?.find(
      (r) => (r.format ?? "").toLowerCase() === "geojson"
    );
    const metrics: SupplementalMetric[] = [
      { label: "License", value: result.license_title ?? "Unknown" },
      { label: "Datasets", value: results.length },
    ];

    signals.push({
      id: newEventId(),
      source: "HDX",
      sourceEventId: `hdx-${result.name ?? result.title ?? "exposure"}`,
      category: "Exposure",
      type: "Exposure Data",
      severity: hdxSeverity(),
      headline: result.title ?? result.name ?? "HDX exposure dataset",
      description: `Open exposure dataset from Humanitarian OpenStreetMap Team / UN OCHA: ${
        geojsonResource?.name ?? result.title ?? "infrastructure exposure"
      }. Use for proximity analysis against active hazards.`,
      geometry: { type: "None" },
      startedAt: result.metadata_modified ?? new Date().toISOString(),
      expiresAt: null,
      updatedAt: result.metadata_modified ?? new Date().toISOString(),
      url: geojsonResource?.url ?? result.url ?? "https://data.humdata.org/",
      confidence: "Source reported",
      metrics,
      raw: result as unknown as Record<string, unknown>,
    });
  }

  return signals;
}
