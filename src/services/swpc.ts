import { newEventId } from "../lib/ids";
import type { Severity } from "../types/riskEvent";
import type { SupplementalRiskSignal, SupplementalMetric } from "../types/supplementalRisk";

const SWPC_JSON = "https://services.swpc.noaa.gov/json";

interface KpRecord {
  time_tag: string;
  kp_index: number;
  estimated_kp: number;
  kp: string;
}

interface DstRecord {
  time_tag: string;
  dst: number;
}

interface XrayFlare {
  time_tag: string;
  satellite: number;
  current_class: string;
  current_ratio: number;
  max_time: string;
  max_class: string;
}

interface F107Record {
  time_tag: string;
  flux: number;
  observed_flux: number;
  adjusted_flux: number | null;
}

function kpSeverity(kp: number): Severity {
  if (kp >= 8) return "Extreme";
  if (kp >= 6) return "Severe";
  if (kp >= 4) return "Moderate";
  return "Minor";
}

function dstSeverity(dst: number): Severity {
  if (dst <= -350) return "Extreme";
  if (dst <= -200) return "Severe";
  if (dst <= -50) return "Moderate";
  return "Minor";
}

function flareSeverity(flareClass: string): Severity {
  const cls = flareClass.charAt(0).toUpperCase();
  if (cls === "X") return "Extreme";
  if (cls === "M") return "Severe";
  if (cls === "C") return "Moderate";
  return "Minor";
}

export async function fetchSwpcKpIndex(): Promise<SupplementalRiskSignal | null> {
  const res = await fetch(`${SWPC_JSON}/planetary_k_index_1m.json`);
  if (!res.ok) throw new Error(`SWPC Kp index API returned ${res.status}`);

  const data: KpRecord[] = await res.json();
  if (!data || data.length === 0) return null;

  const latest = data[data.length - 1];
  const sev = kpSeverity(latest.kp_index);

  const metrics: SupplementalMetric[] = [
    { label: "Kp Index", value: latest.kp_index },
    { label: "Estimated Kp", value: latest.estimated_kp.toFixed(2) },
    { label: "Kp Label", value: latest.kp },
  ];

  const description =
    latest.kp_index >= 8
      ? "G4-G5 Severe to Extreme geomagnetic storm — power grid issues, spacecraft problems, aurora visible at low latitudes."
      : latest.kp_index >= 6
        ? "G2-G3 Moderate to Strong geomagnetic storm — possible voltage alarms, HF radio degradation, aurora visible."
        : latest.kp_index >= 4
          ? "G1 Minor geomagnetic storm — weak power grid fluctuations, minor aurora visible."
          : "Quiet geomagnetic conditions.";

  return {
    id: newEventId(),
    source: "SPACE_WEATHER",
    sourceEventId: `swpc-kp-${latest.time_tag}`,
    category: "Space Weather",
    type: "Geomagnetic Activity",
    severity: sev,
    headline: `Kp ${latest.kp_index}${latest.kp} — ${sev} Geomagnetic Activity`,
    description,
    geometry: { type: "None" },
    startedAt: latest.time_tag,
    expiresAt: null,
    updatedAt: new Date().toISOString(),
    url: "https://www.swpc.noaa.gov/products/planetary-k-index",
    confidence: "Source reported",
    metrics,
    raw: { latest, source: "planetary_k_index_1m" } as unknown as Record<string, unknown>,
  };
}

export async function fetchSwpcDstIndex(): Promise<SupplementalRiskSignal | null> {
  const res = await fetch(`${SWPC_JSON}/geospace/geospace_dst_1_hour.json`);
  if (!res.ok) throw new Error(`SWPC DST index API returned ${res.status}`);

  const data: DstRecord[] = await res.json();
  if (!data || data.length === 0) return null;

  const latest = data[data.length - 1];
  const sev = dstSeverity(latest.dst);

  const metrics: SupplementalMetric[] = [
    { label: "DST Index", value: Math.round(latest.dst) },
    { label: "DST Label", value: latest.dst <= -350 ? "Extreme" : latest.dst <= -200 ? "Severe" : latest.dst <= -50 ? "Moderate" : "Quiet" },
  ];

  return {
    id: newEventId(),
    source: "SPACE_WEATHER",
    sourceEventId: `swpc-dst-${latest.time_tag}`,
    category: "Space Weather",
    type: "Geomagnetic Storm (DST)",
    severity: sev,
    headline: `DST ${Math.round(latest.dst)} nT — ${sev} Geomagnetic Storm${latest.dst <= -50 ? " In Progress" : ""}`,
    description: latest.dst <= -350
      ? "Extreme geomagnetic storm (DST ≤ -350 nT). Severe power grid and satellite impacts possible."
      : latest.dst <= -200
        ? "Severe geomagnetic storm (DST -200 to -350 nT). Possible voltage control problems, aurora at low latitudes."
        : latest.dst <= -50
          ? "Moderate geomagnetic storm (DST -50 to -200 nT). Weak power grid fluctuations, satellite drag increase."
          : "Quiet geomagnetic conditions.",
    geometry: { type: "None" },
    startedAt: latest.time_tag,
    expiresAt: null,
    updatedAt: new Date().toISOString(),
    url: "https://www.swpc.noaa.gov/products/real-time-dst-index",
    confidence: "Source reported",
    metrics,
    raw: { latest, source: "geospace_dst_1_hour" } as unknown as Record<string, unknown>,
  };
}

export async function fetchSwpcFlares(): Promise<SupplementalRiskSignal | null> {
  const res = await fetch(`${SWPC_JSON}/goes/primary/xray-flares-latest.json`);
  if (!res.ok) throw new Error(`SWPC X-ray flares API returned ${res.status}`);

  const data: XrayFlare[] = await res.json();
  if (!data || data.length === 0) return null;

  const latest = data[data.length - 1];
  const sev = flareSeverity(latest.current_class);

  const metrics: SupplementalMetric[] = [
    { label: "Current Flare Class", value: latest.current_class },
    { label: "Max Flare Class", value: latest.max_class },
    { label: "Satellite", value: `GOES-${latest.satellite}` },
  ];

  return {
    id: newEventId(),
    source: "SPACE_WEATHER",
    sourceEventId: `swpc-flare-${latest.time_tag}`,
    category: "Space Weather",
    type: "Solar Flare",
    severity: sev,
    headline: `Solar Flare: ${latest.current_class} (Max: ${latest.max_class})`,
    description: latest.current_class.startsWith("X")
      ? "X-class flare — major radio blackout possible. Strongest flare category."
      : latest.current_class.startsWith("M")
        ? "M-class flare — moderate radio blackout possible."
        : latest.current_class.startsWith("C")
          ? "C-class flare — minor solar flare, typically no Earth impact."
          : "Minor solar activity.",
    geometry: { type: "None" },
    startedAt: latest.time_tag,
    expiresAt: null,
    updatedAt: new Date().toISOString(),
    url: "https://www.swpc.noaa.gov/products/goes-x-ray-flux",
    confidence: "Source reported",
    metrics,
    raw: { latest, source: "goes_primary_xray_flares_latest" } as unknown as Record<string, unknown>,
  };
}

export async function fetchSwpcSolarFlux(): Promise<SupplementalRiskSignal | null> {
  const res = await fetch(`${SWPC_JSON}/f107_cm_flux.json`);
  if (!res.ok) throw new Error(`SWPC F10.7 flux API returned ${res.status}`);

  const data: F107Record[] = await res.json();
  if (!data || data.length === 0) return null;

  const latest = data[data.length - 1];

  const metrics: SupplementalMetric[] = [
    { label: "Observed Flux", value: latest.observed_flux ?? latest.flux, unit: "sfu" },
  ];
  if (latest.adjusted_flux != null) {
    metrics.push({ label: "Adjusted Flux", value: latest.adjusted_flux, unit: "sfu" });
  }

  const sev: Severity = (latest.observed_flux ?? latest.flux) >= 200 ? "Moderate" : "Minor";

  return {
    id: newEventId(),
    source: "SPACE_WEATHER",
    sourceEventId: `swpc-f107-${latest.time_tag}`,
    category: "Space Weather",
    type: "Solar Radio Flux",
    severity: sev,
    headline: `F10.7 cm Flux: ${latest.observed_flux ?? latest.flux} sfu`,
    description: "Solar radio flux at 10.7 cm (2800 MHz). Values above 150 sfu indicate active solar conditions.",
    geometry: { type: "None" },
    startedAt: latest.time_tag,
    expiresAt: null,
    updatedAt: new Date().toISOString(),
    url: "https://www.swpc.noaa.gov/products/goes-x-ray-flux",
    confidence: "Source reported",
    metrics,
    raw: { latest, source: "f107_cm_flux" } as unknown as Record<string, unknown>,
  };
}

export async function fetchSwpcConditions(): Promise<SupplementalRiskSignal[]> {
  const results = await Promise.allSettled([
    fetchSwpcKpIndex(),
    fetchSwpcDstIndex(),
    fetchSwpcFlares(),
    fetchSwpcSolarFlux(),
  ]);

  return results
    .filter((r) => r.status === "fulfilled" && r.value != null)
    .map((r) => (r as PromiseFulfilledResult<SupplementalRiskSignal>).value);
}
