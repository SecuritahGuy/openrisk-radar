// EXPERIMENT ONLY — not imported by the OpenRiskRadar web app.
// State intelligence packs loaded from JSON files in sources/.
// Each JSON file contains one state's sources (transportation, wildfire,
// water, grid, evacuation, environmental hazards).

import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { StateIntelligencePack, StateSourceDefinition } from "./types.ts";

export type { StateIntelligencePack, StateSourceDefinition };

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCES_DIR = resolve(__dirname, "sources");

let cachedPacks: StateIntelligencePack[] | null = null;

function loadStatePack(filePath: string): StateIntelligencePack {
  const raw = readFileSync(filePath, "utf-8");
  const pack = JSON.parse(raw) as StateIntelligencePack;

  if (!pack.state || !pack.name || !Array.isArray(pack.sources)) {
    throw new Error(`Invalid state pack in ${filePath}: missing state, name, or sources array`);
  }

  return pack;
}

function loadAllPacks(): StateIntelligencePack[] {
  const files = readdirSync(SOURCES_DIR).filter(f => f.endsWith(".json"));
  return files
    .map(f => loadStatePack(resolve(SOURCES_DIR, f)))
    .sort((a, b) => a.state.localeCompare(b.state));
}

function getPacks(): StateIntelligencePack[] {
  if (!cachedPacks) cachedPacks = loadAllPacks();
  return cachedPacks;
}

export function getStatePack(stateCode: string): StateIntelligencePack | undefined {
  return getPacks().find(p => p.state === stateCode.toUpperCase());
}

export function getAllPacks(): StateIntelligencePack[] {
  return getPacks();
}

export function getSourcesForCapability(
  capability: string,
  stateCode?: string
): StateSourceDefinition[] {
  const packs = stateCode ? [getStatePack(stateCode)].filter(Boolean) : getAllPacks();
  return packs.flatMap((p) =>
    p!.sources.filter((s) => s.capability === capability)
  );
}

export function getSourcesForOutputModel(
  model: string,
  stateCode?: string
): StateSourceDefinition[] {
  const packs = stateCode ? [getStatePack(stateCode)].filter(Boolean) : getAllPacks();
  return packs.flatMap((p) =>
    p!.sources.filter((s) => s.outputModel === model)
  );
}

export function getStatesWithCapability(capability: string): string[] {
  return getPacks()
    .filter((pack) => pack.sources.some((s) => s.capability === capability))
    .map((pack) => pack.state);
}
