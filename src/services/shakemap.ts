import { newEventId } from "../lib/ids";
import type { SupplementalRiskSignal, SupplementalMetric } from "../types/supplementalRisk";
import type { Severity } from "../types/riskEvent";

const DETAIL_BASE = "https://earthquake.usgs.gov/fdsnws/event/1/query";

interface ShakeMapProductProperty {
  maxmmi?: string;
  maxpga?: string;
  maxpgv?: string;
  magnitude?: string;
  depth?: string;
  eventsource?: string;
  eventsourcecode?: string;
  eventtime?: string;
  latitude?: string;
  longitude?: string;
  "event-description"?: string;
  "map-status"?: string;
}

interface ShakeMapContentEntry {
  contentType: string;
  url: string;
}

interface ShakeMapProduct {
  properties: ShakeMapProductProperty;
  contents: Record<string, ShakeMapContentEntry>;
  preferredWeight: number;
}

interface UsgsDetailProperties {
  mag: number;
  place: string;
  time: number;
  url: string;
  title: string;
  products: {
    shakemap?: ShakeMapProduct[];
  };
}

interface UsgsDetailGeometry {
  type: "Point";
  coordinates: [number, number, number];
}

interface UsgsDetailFeature {
  id: string;
  properties: UsgsDetailProperties;
  geometry: UsgsDetailGeometry;
}

export async function fetchShakeMap(
  eventId: string
): Promise<SupplementalRiskSignal | null> {
  const params = new URLSearchParams({
    eventid: eventId,
    format: "geojson",
  });

  const url = `${DETAIL_BASE}?${params}`;
  const res = await fetch(url);
  if (!res.ok) return null;

  const feature: UsgsDetailFeature = await res.json();
  const p = feature.properties;
  const shakemapProducts = p.products?.shakemap;
  if (!shakemapProducts?.length) return null;

  const preferred = shakemapProducts.sort(
    (a, b) => b.preferredWeight - a.preferredWeight
  )[0];

  const sm = preferred.properties;
  const maxMmi = sm.maxmmi ? parseFloat(sm.maxmmi) : null;
  const maxPga = sm.maxpga ? parseFloat(sm.maxpga) : null;
  const maxPgv = sm.maxpgv ? parseFloat(sm.maxpgv) : null;

  if (maxMmi == null && maxPga == null) return null;

  const sev: Severity =
    maxMmi != null
      ? maxMmi >= 7 ? "Extreme" : maxMmi >= 5 ? "Severe" : maxMmi >= 3 ? "Moderate" : "Minor"
      : "Minor";

  const metrics: SupplementalMetric[] = [];
  if (maxMmi != null) metrics.push({ label: "Max MMI", value: maxMmi });
  if (maxPga != null) metrics.push({ label: "Max PGA", value: maxPga, unit: "%g" });
  if (maxPgv != null) metrics.push({ label: "Max PGV", value: maxPgv, unit: "cm/s" });

  const mmiUrl = preferred.contents?.["download/cont_mmi.json"]?.url ?? null;

  return {
    id: newEventId(),
    source: "USGS_SHAKEMAP",
    sourceEventId: `shakemap-${eventId}`,
    category: "Seismic",
    type: "ShakeMap",
    severity: sev,
    headline: `ShakeMap event maximum: MMI ${maxMmi?.toFixed(1) ?? "N/A"} — ${p.place}`,
    description: `Maximum estimated intensity across the ShakeMap footprint for ${p.place}; this is not the intensity at the searched location.${mmiUrl ? " MMI contour data is available from USGS." : ""}`,
    geometry: { type: "Point", latitude: feature.geometry.coordinates[1], longitude: feature.geometry.coordinates[0] },
    startedAt: new Date(p.time).toISOString(),
    expiresAt: null,
    updatedAt: new Date(p.time).toISOString(),
    url: mmiUrl ?? p.url,
    confidence: "Source reported",
    metrics,
    raw: preferred as unknown as Record<string, unknown>,
  };
}
