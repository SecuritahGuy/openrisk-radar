export type GibsLayerId =
  | "MODIS_Terra_CorrectedReflectance_TrueColor"
  | "VIIRS_SNPP_Thermal_Anomalies_375m"
  | "MODIS_Combined_Value_Added_AOD"
  | "Snow_Cover";

export interface GIBSLayer {
  id: GibsLayerId;
  serviceLayer: string;
  title: string;
  description: string;
  rendering: "wmts" | "wms";
  format: "jpeg" | "png";
  tileMatrixSet: string;
  maxNativeZoom: number;
  opacity: number;
  legendTitle: string;
  legendStops: Array<{ color: string; label: string }>;
}

export const GIBS_LAYERS: Record<GibsLayerId, GIBSLayer> = {
  MODIS_Terra_CorrectedReflectance_TrueColor: {
    id: "MODIS_Terra_CorrectedReflectance_TrueColor",
    serviceLayer: "MODIS_Terra_CorrectedReflectance_TrueColor",
    title: "True color",
    description: "Daily MODIS Terra natural-color satellite imagery.",
    rendering: "wmts",
    format: "jpeg",
    tileMatrixSet: "GoogleMapsCompatible_Level9",
    maxNativeZoom: 9,
    opacity: 0.72,
    legendTitle: "Natural color",
    legendStops: [
      { color: "#315b2f", label: "Vegetation" },
      { color: "#9e8b6d", label: "Land" },
      { color: "#d9d9d9", label: "Cloud or snow" },
    ],
  },
  VIIRS_SNPP_Thermal_Anomalies_375m: {
    id: "VIIRS_SNPP_Thermal_Anomalies_375m",
    serviceLayer: "VIIRS_SNPP_Thermal_Anomalies_375m_All",
    title: "Thermal anomalies",
    description: "VIIRS daytime and nighttime thermal-anomaly detections rendered by GIBS.",
    rendering: "wms",
    format: "png",
    tileMatrixSet: "GoogleMapsCompatible_Level8",
    maxNativeZoom: 8,
    opacity: 0.9,
    legendTitle: "Thermal detection intensity",
    legendStops: [
      { color: "#ffeb3b", label: "Lower" },
      { color: "#ff9800", label: "Elevated" },
      { color: "#d32f2f", label: "Higher" },
    ],
  },
  MODIS_Combined_Value_Added_AOD: {
    id: "MODIS_Combined_Value_Added_AOD",
    serviceLayer: "MODIS_Combined_Value_Added_AOD",
    title: "Aerosol and smoke",
    description: "MODIS combined aerosol optical depth for broad smoke and haze context.",
    rendering: "wmts",
    format: "png",
    tileMatrixSet: "GoogleMapsCompatible_Level6",
    maxNativeZoom: 6,
    opacity: 0.72,
    legendTitle: "Aerosol optical depth",
    legendStops: [
      { color: "#fff59d", label: "Lower" },
      { color: "#ffb74d", label: "Moderate" },
      { color: "#b71c1c", label: "Higher" },
    ],
  },
  Snow_Cover: {
    id: "Snow_Cover",
    serviceLayer: "MODIS_Terra_NDSI_Snow_Cover",
    title: "Snow cover",
    description: "Daily MODIS Terra normalized-difference snow-cover imagery.",
    rendering: "wmts",
    format: "png",
    tileMatrixSet: "GoogleMapsCompatible_Level8",
    maxNativeZoom: 8,
    opacity: 0.72,
    legendTitle: "Snow-cover fraction",
    legendStops: [
      { color: "#b3e5fc", label: "Lower" },
      { color: "#4fc3f7", label: "Moderate" },
      { color: "#ffffff", label: "Higher" },
    ],
  },
};

export const GIBS_LAYER_OPTIONS = Object.values(GIBS_LAYERS);
export const GIBS_WMS_URL = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";
const GIBS_WMTS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";
export const GIBS_PREFERENCE_KEY = "openrisk:gibs-preferences:v1";

export interface GibsPreferences {
  layer: GibsLayerId | null;
  date: string;
  opacity: number;
}

interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

export function yyyyMmDd(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function latestGibsDate(now = new Date()): string {
  return yyyyMmDd(new Date(now.getTime() - 24 * 60 * 60 * 1000));
}

export function gibsDateOptions(now = new Date(), days = 7): string[] {
  return Array.from({ length: days }, (_, index) =>
    yyyyMmDd(new Date(now.getTime() - (index + 1) * 24 * 60 * 60 * 1000))
  );
}

export function readGibsPreferences(
  storage: PreferenceStorage | null,
  now = new Date()
): GibsPreferences {
  const fallback: GibsPreferences = { layer: null, date: latestGibsDate(now), opacity: 0.72 };
  if (!storage) return fallback;
  try {
    const parsed = JSON.parse(storage.getItem(GIBS_PREFERENCE_KEY) ?? "null") as Partial<GibsPreferences> | null;
    if (!parsed) return fallback;
    const layer = parsed.layer === null || (typeof parsed.layer === "string" && parsed.layer in GIBS_LAYERS)
      ? parsed.layer as GibsLayerId | null
      : fallback.layer;
    const date = typeof parsed.date === "string" && gibsDateOptions(now).includes(parsed.date)
      ? parsed.date
      : fallback.date;
    const opacity = typeof parsed.opacity === "number" && parsed.opacity >= 0.25 && parsed.opacity <= 1
      ? parsed.opacity
      : layer ? GIBS_LAYERS[layer].opacity : fallback.opacity;
    return { layer, date, opacity };
  } catch {
    return fallback;
  }
}

export function writeGibsPreferences(
  storage: PreferenceStorage | null,
  preferences: GibsPreferences
): void {
  if (!storage) return;
  try {
    storage.setItem(GIBS_PREFERENCE_KEY, JSON.stringify(preferences));
  } catch {
    // Imagery controls remain usable when storage is unavailable.
  }
}

export function gibsTileTemplate(layer: GibsLayerId, date: string): string {
  const metadata = GIBS_LAYERS[layer];
  if (metadata.rendering !== "wmts") {
    throw new Error(`${metadata.title} uses the GIBS WMS renderer`);
  }
  return [
    GIBS_WMTS_BASE,
    metadata.serviceLayer,
    "default",
    date,
    metadata.tileMatrixSet,
    "{z}",
    "{y}",
    `{x}.${metadata.format}`,
  ].join("/");
}

export interface GIBSTileOptions {
  layer: GibsLayerId;
  date?: Date;
  zoom: number;
  x: number;
  y: number;
}

export function gibsTileUrl({ layer, date = new Date(), zoom, x, y }: GIBSTileOptions): string {
  return gibsTileTemplate(layer, yyyyMmDd(date))
    .replace("{z}", String(zoom))
    .replace("{y}", String(y))
    .replace("{x}", String(x));
}
