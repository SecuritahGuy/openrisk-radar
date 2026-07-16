// EXPERIMENT ONLY — not imported by the OpenRiskRadar web app.
// State-pack activation logic. Determines which state intelligence packs
// apply based on a searched location, saved asset, or radius overlap.
//
// Activation triggers (from research):
//   1. A searched location is within that state.
//   2. A saved asset is located in that state.
//   3. A search radius overlaps the state.
//   4. Future: iOS user follows locations in that state.

import { getStatePack, type StateIntelligencePack, type StateSourceDefinition } from "./stateRegistry.ts";
import { readySources, resolveAuthority } from "./authorityHierarchy.ts";

export interface ResolvedLocation {
  state: string;
  latitude: number;
  longitude: number;
  county?: string;
  fips?: string;
}

export interface SavedAsset {
  id: string;
  label: string;
  state: string;
  latitude: number;
  longitude: number;
}

// Rough state bounding boxes for radius-overlap detection.
// Only includes states that have intelligence packs.
const STATE_BBOX: Record<string, { north: number; south: number; east: number; west: number }> = {
  OR: { north: 46.3, south: 42, east: -116.4, west: -124.6 },
  CA: { north: 42, south: 32.5, east: -114.1, west: -124.4 },
  WA: { north: 49, south: 45.5, east: -117, west: -124.8 },
  FL: { north: 31, south: 24.4, east: -80, west: -87.6 },
  TX: { north: 36.5, south: 25.8, east: -93.5, west: -106.6 },
  WI: { north: 47.3, south: 42.5, east: -86.8, west: -92.9 },
  NY: { north: 45, south: 40.5, east: -71.8, west: -80 },
  PA: { north: 42.3, south: 39.7, east: -74.7, west: -80.5 },
  MI: { north: 48.3, south: 41.7, east: -82.4, west: -90.4 },
  MN: { north: 49.4, south: 43.5, east: -89.5, west: -97.2 },
  IL: { north: 42.5, south: 36.9, east: -87.5, west: -91.6 },
  AZ: { north: 37, south: 31.3, east: -109, west: -114.8 },
  CO: { north: 41, south: 37, east: -102, west: -109 },
  NV: { north: 42, south: 35, east: -114, west: -120 },
  UT: { north: 42, south: 37, east: -109, west: -114 },
  NM: { north: 37, south: 31.3, east: -103, west: -109 },
  GA: { north: 35, south: 30.3, east: -80.8, west: -85.6 },
  NC: { north: 36.6, south: 33.8, east: -75.4, west: -84.3 },
  VA: { north: 39.5, south: 36.5, east: -75.2, west: -83.7 },
  OH: { north: 42, south: 38.4, east: -80.5, west: -84.8 },
  ID: { north: 49, south: 42, east: -111, west: -117.2 },
  SC: { north: 35.2, south: 32, east: -78.5, west: -83.4 },
  IN: { north: 41.8, south: 37.8, east: -84.8, west: -88.2 },
  MD: { north: 39.7, south: 37.9, east: -75, west: -79.5 },
  LA: { north: 33, south: 28.9, east: -88.8, west: -94 },
  MO: { north: 40.6, south: 36, east: -89.1, west: -95.8 },
  AL: { north: 35, south: 30.2, east: -84.9, west: -88.5 },
  KY: { north: 39.1, south: 36.5, east: -81.9, west: -89.6 },
  TN: { north: 36.7, south: 35, east: -81.6, west: -90.3 },
  NJ: { north: 41.4, south: 38.9, east: -73.9, west: -75.6 },
  IA: { north: 43.5, south: 40.4, east: -90.1, west: -96.7 },
};

function haversineKm(latA: number, lngA: number, latB: number, lngB: number): number {
  const toRad = (v: number) => (v * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(latB - latA);
  const dLng = toRad(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(latA)) * Math.cos(toRad(latB)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function circleTouchesBBox(
  lat: number, lng: number, radiusKm: number,
  bbox: { north: number; south: number; east: number; west: number }
): boolean {
  // Nearest point on bbox to center
  const nearLat = Math.max(bbox.south, Math.min(lat, bbox.north));
  const nearLng = Math.max(bbox.west, Math.min(lng, bbox.east));
  return haversineKm(lat, lng, nearLat, nearLng) <= radiusKm;
}

export interface ActivationResult {
  state: string;
  pack: StateIntelligencePack;
  sources: StateSourceDefinition[];
  readySources: StateSourceDefinition[];
  trigger: "location" | "asset" | "radius-overlap";
}

/**
 * Resolve which state packs activate from a searched location.
 * The primary state is derived from the location's state field.
 * Radius overlap with neighboring pack states is also checked.
 */
export function resolvePacksForLocation(
  location: ResolvedLocation,
  radiusKm: number
): ActivationResult[] {
  const results: ActivationResult[] = [];
  const seen = new Set<string>();

  // Primary: location is within this state
  const primaryPack = getStatePack(location.state);
  if (primaryPack) {
    seen.add(location.state.toUpperCase());
    results.push({
      state: location.state.toUpperCase(),
      pack: primaryPack,
      sources: primaryPack.sources,
      readySources: readySources(primaryPack.sources),
      trigger: "location",
    });
  }

  // Secondary: radius overlaps a neighboring pack state
  for (const [code, bbox] of Object.entries(STATE_BBOX)) {
    if (seen.has(code)) continue;
    if (circleTouchesBBox(location.latitude, location.longitude, radiusKm, bbox)) {
      const pack = getStatePack(code);
      if (pack) {
        results.push({
          state: code,
          pack,
          sources: pack.sources,
          readySources: readySources(pack.sources),
          trigger: "radius-overlap",
        });
      }
    }
  }

  return results;
}

/**
 * Resolve which state packs activate from a set of saved assets.
 * Deduplicates by state to avoid redundant API calls.
 */
export function resolvePacksForAssets(
  assets: SavedAsset[]
): ActivationResult[] {
  const seen = new Set<string>();
  const results: ActivationResult[] = [];

  const uniqueStates = [...new Set(assets.map((a) => a.state.toUpperCase()))];

  for (const stateCode of uniqueStates) {
    if (seen.has(stateCode)) continue;
    seen.add(stateCode);

    const pack = getStatePack(stateCode);
    if (pack) {
      results.push({
        state: stateCode,
        pack,
        sources: pack.sources,
        readySources: readySources(pack.sources),
        trigger: "asset",
      });
    }
  }

  return results;
}

/**
 * Get all ready-to-build sources across all activated packs.
 */
export function collectReadySources(
  activations: ActivationResult[]
): StateSourceDefinition[] {
  const seen = new Set<string>();
  const all: StateSourceDefinition[] = [];

  for (const activation of activations) {
    for (const source of activation.readySources) {
      if (!seen.has(source.id)) {
        seen.add(source.id);
        all.push(source);
      }
    }
  }

  return all;
}

/**
 * Build a source ID → definition lookup map for authority resolution.
 */
export function buildSourceLookup(
  sources: StateSourceDefinition[]
): Map<string, StateSourceDefinition> {
  const map = new Map<string, StateSourceDefinition>();
  for (const s of sources) {
    map.set(s.id, s);
  }
  return map;
}
