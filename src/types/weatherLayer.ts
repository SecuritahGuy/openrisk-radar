export type WeatherLayerMode =
  | "temp"
  | "precip"
  | "thunder"
  | "heat"
  | "wind"
  | "stations";

export const WEATHER_LAYER_OPTIONS: Array<{
  mode: WeatherLayerMode;
  label: string;
}> = [
  { mode: "temp", label: "Temp" },
  { mode: "precip", label: "Precip" },
  { mode: "thunder", label: "Thunder" },
  { mode: "heat", label: "Heat" },
  { mode: "wind", label: "Wind" },
  { mode: "stations", label: "Stations" },
];
