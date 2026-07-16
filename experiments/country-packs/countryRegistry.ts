// EXPERIMENT ONLY — not imported by the OpenRiskRadar web app.
// Country intelligence packs loaded from JSON files in sources/.
// Each JSON file contains one country's sources (wildfire, grid, earthquake, etc.).

import { readdirSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CountryIntelligencePack } from "./types.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCES_DIR = resolve(__dirname, "sources");

let cachedPacks: CountryIntelligencePack[] | null = null;

function loadCountryPack(filePath: string): CountryIntelligencePack {
  const raw = readFileSync(filePath, "utf-8");
  const pack = JSON.parse(raw) as CountryIntelligencePack;

  if (!pack.country || !pack.name || !Array.isArray(pack.sources)) {
    throw new Error(`Invalid country pack in ${filePath}: missing country, name, or sources array`);
  }

  return pack;
}

function loadAllPacks(): CountryIntelligencePack[] {
  const files = readdirSync(SOURCES_DIR).filter(f => f.endsWith(".json"));
  return files
    .map(f => loadCountryPack(resolve(SOURCES_DIR, f)))
    .sort((a, b) => a.country.localeCompare(b.country));
}

function getPacks(): CountryIntelligencePack[] {
  if (!cachedPacks) cachedPacks = loadAllPacks();
  return cachedPacks;
}

export function getAllPacks(): CountryIntelligencePack[] {
  return getPacks();
}

export function getPack(countryCode: string): CountryIntelligencePack | undefined {
  return getPacks().find(p => p.country === countryCode.toUpperCase());
}

export function getSourcesByCapability(capability: string): Array<{ pack: CountryIntelligencePack; source: CountryIntelligencePack["sources"][number] }> {
  const results: Array<{ pack: CountryIntelligencePack; source: CountryIntelligencePack["sources"][number] }> = [];
  for (const pack of getPacks()) {
    for (const source of pack.sources) {
      if (source.capability === capability) {
        results.push({ pack, source });
      }
    }
  }
  return results;
}
