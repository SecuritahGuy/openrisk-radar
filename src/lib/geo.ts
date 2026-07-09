const EARTH_RADIUS_MILES = 3958.8;

export function milesToKm(miles: number): number {
  return miles * 1.60934;
}

export function kmToMiles(km: number): number {
  return km / 1.60934;
}

export function distanceMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function bboxAround(
  latitude: number,
  longitude: number,
  radiusMiles: number
): {
  west: number;
  south: number;
  east: number;
  north: number;
} {
  const latDelta = radiusMiles / 69;
  const lonDelta =
    radiusMiles / Math.max(1, 69 * Math.cos((latitude * Math.PI) / 180));

  return {
    west: longitude - lonDelta,
    south: latitude - latDelta,
    east: longitude + lonDelta,
    north: latitude + latDelta,
  };
}
