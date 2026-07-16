// EXPERIMENT ONLY — not imported by the OpenRiskRadar web app.
// Source authority hierarchy and deduplication logic.
// Research spec:  Local > State > Federal > International
//
// When multiple sources describe the same hazard:
//   1. Pick the highest-authority source as primary.
//   2. Retain lower-authority sources as corroborating references.
//   3. Preserve all sourceEventIds for cross-referencing.

import { compareAuthority, type StateSourceDefinition } from "./types.ts";

export interface CanonicalSourceGroup {
  primary: StateSourceDefinition;
  corroborating: StateSourceDefinition[];
}

// Capabilities that are eligible for deduplication across sources.
const DEDUP_CAPABILITIES = new Set(["wildfire", "transportation-events", "evacuation"]);

/**
 * Group candidate sources by capability and pick the most authoritative
 * as primary. This determines which agency's feed is displayed first when
 * multiple sources describe the same class of hazard.
 */
export function resolveAuthority(
  sources: StateSourceDefinition[]
): CanonicalSourceGroup[] {
  const byCapability = new Map<string, StateSourceDefinition[]>();

  for (const s of sources) {
    const list = byCapability.get(s.capability) ?? [];
    list.push(s);
    byCapability.set(s.capability, list);
  }

  const groups: CanonicalSourceGroup[] = [];

  for (const [, capSources] of byCapability) {
    const sorted = [...capSources].sort(compareAuthority);
    const [primary, ...rest] = sorted;
    if (primary) {
      groups.push({
        primary,
        corroborating: DEDUP_CAPABILITIES.has(primary.capability) ? rest : [],
      });
    }
  }

  return groups;
}

/**
 * For a set of events from different sources (e.g., CAL FIRE, NIFC, NASA FIRMS),
 * select which one to display as primary. The event with the highest-authority
 * source wins. This is called per-incident after correlation.
 */
export function canonicalEventSources(
  sourceIds: string[],
  sourceLookup: Map<string, StateSourceDefinition>
): { primary: string | null; corroborating: string[] } {
  if (sourceIds.length === 0) return { primary: null, corroborating: [] };

  const withDefs = sourceIds
    .map((id) => ({ id, def: sourceLookup.get(id) }))
    .filter((e): e is { id: string; def: StateSourceDefinition } => !!e.def)
    .sort((a, b) => compareAuthority(a.def, b.def));

  if (withDefs.length === 0) {
    return { primary: sourceIds[0], corroborating: sourceIds.slice(1) };
  }

  return {
    primary: withDefs[0].id,
    corroborating: withDefs.slice(1).map((e) => e.id),
  };
}

/**
 * Check whether a source is ready for production use based on its status.
 */
export function isSourceReady(source: StateSourceDefinition): boolean {
  return source.status === "validated" || source.status === "discovered";
}

/**
 * Get only sources that are ready for implementation, sorted by authority.
 */
export function readySources(sources: StateSourceDefinition[]): StateSourceDefinition[] {
  return sources.filter(isSourceReady).sort(compareAuthority);
}
