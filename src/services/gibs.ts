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
  },
};

export const GIBS_LAYER_OPTIONS = Object.values(GIBS_LAYERS);
export const GIBS_WMS_URL = "https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";
const GIBS_WMTS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best";

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
