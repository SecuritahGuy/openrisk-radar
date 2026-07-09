export interface AircraftState {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  geoAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  heading: number | null;
  verticalRate: number | null;
  squawk: string | null;
  lastContact: number | null;
  positionSource: number | null;
}

export interface OpenSkyStateVector {
  time: number;
  states: (string | number | boolean | null)[] | null;
}

const API_BASE = "https://opensky-network.org/api";

/**
 * Fetch live aircraft state vectors within a bounding box.
 */
export async function fetchAircraftStates(
  bbox: { lamin: number; lomin: number; lamax: number; lomax: number }
): Promise<AircraftState[]> {
  const params = new URLSearchParams({
    lamin: String(bbox.lamin),
    lomin: String(bbox.lomin),
    lamax: String(bbox.lamax),
    lomax: String(bbox.lomax),
  });

  const url = `${API_BASE}/states/all?${params}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`OpenSky API returned ${res.status}`);

  const data: OpenSkyStateVector = await res.json();
  if (!data.states?.length) return [];

  return data.states.map(toAircraftState);
}

/**
 * Map the raw OpenSky state array (index-based) to a typed object.
 *
 * Index reference:
 *   0  icao24
 *   1  callsign
 *   2  originCountry
 *   3  timePosition
 *   4  lastContact
 *   5  longitude
 *   6  latitude
 *   7  baroAltitude
 *   8  onGround
 *   9  velocity
 *  10  trueTrack (heading)
 *  11  verticalRate
 *  12  sensors
 *  13  geoAltitude
 *  14  squawk
 *  15  spi
 *  16  positionSource
 */
function toAircraftState(s: (string | number | boolean | null)[]): AircraftState {
  return {
    icao24: (s[0] ?? "") as string,
    callsign: trimCallsign(s[1]),
    originCountry: (s[2] ?? "") as string,
    longitude: toNum(s[5]),
    latitude: toNum(s[6]),
    baroAltitude: toNum(s[7]),
    geoAltitude: toNum(s[13]),
    onGround: s[8] === true,
    velocity: toNum(s[9]),
    heading: toNum(s[10]),
    verticalRate: toNum(s[11]),
    squawk: (s[14] as string) ?? null,
    lastContact: toNum(s[4]),
    positionSource: toNum(s[16]),
  };
}

function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  return null;
}

function trimCallsign(v: unknown): string | null {
  if (typeof v === "string") {
    const trimmed = v.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}
