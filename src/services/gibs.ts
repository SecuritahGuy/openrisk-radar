export type GibsLayerId =
  | "MODIS_Terra_CorrectedReflectance_TrueColor"
  | "MODIS_Aqua_CorrectedReflectance_TrueColor"
  | "VIIRS_SNPP_CorrectedReflectance_TrueColor"
  | "MODIS_Terra_Thermal_Anomalies_All"
  | "VIIRS_SNPP_Thermal_Anomalies_375m"
  | "MODIS_Combined_Value_Added_AOD"
  | "Sea_Surface_Temp"
  | "Snow_Cover";

export interface GIBSLayer {
  id: GibsLayerId;
  title: string;
  description: string;
  format: "jpg" | "png";
  tileMatrixSet: "250m" | "500m";
  hasTimeDimension: boolean;
}

export const GIBS_LAYERS: Record<GibsLayerId, GIBSLayer> = {
  MODIS_Terra_CorrectedReflectance_TrueColor: {
    id: "MODIS_Terra_CorrectedReflectance_TrueColor",
    title: "True Color (MODIS Terra)",
    description: "Daily natural-color satellite imagery.",
    format: "jpg",
    tileMatrixSet: "250m",
    hasTimeDimension: true,
  },
  MODIS_Aqua_CorrectedReflectance_TrueColor: {
    id: "MODIS_Aqua_CorrectedReflectance_TrueColor",
    title: "True Color (MODIS Aqua)",
    description: "Daily natural-color satellite imagery.",
    format: "jpg",
    tileMatrixSet: "250m",
    hasTimeDimension: true,
  },
  VIIRS_SNPP_CorrectedReflectance_TrueColor: {
    id: "VIIRS_SNPP_CorrectedReflectance_TrueColor",
    title: "True Color (VIIRS SNPP)",
    description: "Daily natural-color satellite imagery.",
    format: "jpg",
    tileMatrixSet: "250m",
    hasTimeDimension: true,
  },
  MODIS_Terra_Thermal_Anomalies_All: {
    id: "MODIS_Terra_Thermal_Anomalies_All",
    title: "Thermal Anomalies (MODIS Terra)",
    description: "Active fire / thermal anomaly overlay.",
    format: "png",
    tileMatrixSet: "250m",
    hasTimeDimension: true,
  },
  VIIRS_SNPP_Thermal_Anomalies_375m: {
    id: "VIIRS_SNPP_Thermal_Anomalies_375m",
    title: "Thermal Anomalies (VIIRS 375m)",
    description: "High-resolution active fire / thermal anomaly overlay.",
    format: "png",
    tileMatrixSet: "250m",
    hasTimeDimension: true,
  },
  MODIS_Combined_Value_Added_AOD: {
    id: "MODIS_Combined_Value_Added_AOD",
    title: "Aerosol Optical Depth",
    description: "Global aerosol / smoke concentration.",
    format: "png",
    tileMatrixSet: "250m",
    hasTimeDimension: true,
  },
  Sea_Surface_Temp: {
    id: "Sea_Surface_Temp",
    title: "Sea Surface Temperature",
    description: "Global sea surface temperature.",
    format: "png",
    tileMatrixSet: "250m",
    hasTimeDimension: true,
  },
  Snow_Cover: {
    id: "Snow_Cover",
    title: "Snow Cover",
    description: "Global snow cover extent.",
    format: "png",
    tileMatrixSet: "250m",
    hasTimeDimension: true,
  },
};

const GIBS_BASE = "https://gibs.earthdata.nasa.gov/wmts/epsg4326";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function yyyyMmDd(date: Date): string {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export interface GIBSTileOptions {
  layer: GibsLayerId;
  date?: Date;
  zoom: number;
  x: number;
  y: number;
}

export function gibsTileUrl({ layer, date = new Date(), zoom, x, y }: GIBSTileOptions): string {
  const meta = GIBS_LAYERS[layer];
  const day = yyyyMmDd(date);
  return [
    GIBS_BASE,
    meta.id,
    "default",
    day,
    meta.tileMatrixSet,
    zoom.toString(),
    x.toString(),
    y.toString(),
  ].join("/") + `.${meta.format}`;
}

export function latestGibsDate(date = new Date()): string {
  return yyyyMmDd(date);
}
