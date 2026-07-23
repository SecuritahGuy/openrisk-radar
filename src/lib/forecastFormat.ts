export function forecastDateKey(iso: string): string {
  return iso.slice(0, 10);
}

export function compassDirection(degrees: number | null): string | null {
  if (degrees == null || !Number.isFinite(degrees)) return null;
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return directions[Math.round((((degrees % 360) + 360) % 360) / 45) % 8];
}
