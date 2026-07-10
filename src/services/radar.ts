export type RadarColorScheme = 1 | 2 | 3;

export interface RadarFrame {
  time: number;
  path: string;
}

export interface RadarManifest {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RadarFrame[];
    nowcast: RadarFrame[];
  };
}

const RAINVIEWER_MANIFEST = "https://api.rainviewer.com/public/weather-maps.json";
const IEM_TILE_BASE = "https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/nexrad-n0q";

export async function fetchRadarManifest(): Promise<RadarManifest> {
  const res = await fetch(RAINVIEWER_MANIFEST);
  if (!res.ok) throw new Error(`RainViewer API returned ${res.status}`);
  return res.json();
}

export function iemRadarTileUrl(zoom: number, x: number, y: number): string {
  return `${IEM_TILE_BASE}/${zoom}/${x}/${y}.png`;
}

export function rainviewerTileUrl(
  host: string,
  path: string,
  zoom: number,
  x: number,
  y: number,
  colorScheme: RadarColorScheme = 1
): string {
  return `${host}/${colorScheme}/256/${x}/${y}/${zoom}/${path}/1/1_1.png`;
}

export function latestPastFrame(manifest: RadarManifest): RadarFrame | null {
  const past = manifest.radar.past;
  return past.length > 0 ? past[past.length - 1] : null;
}

export function getAnimationFrames(
  manifest: RadarManifest,
  options?: {
    pastMinutes?: number;
    includeForecast?: boolean;
    maxFrames?: number;
  }
): RadarFrame[] {
  const { pastMinutes = 120, includeForecast = false, maxFrames = 60 } = options ?? {};
  const cutoff = Date.now() / 1000 - pastMinutes * 60;

  const past = manifest.radar.past.filter((f) => f.time >= cutoff);
  const frames = includeForecast ? [...past, ...manifest.radar.nowcast] : past;

  return frames.length > maxFrames ? frames.slice(-maxFrames) : frames;
}
