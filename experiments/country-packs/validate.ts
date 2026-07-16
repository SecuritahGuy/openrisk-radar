// EXPERIMENT ONLY — quick smoke test for country packs.
// Run: npx tsx experiments/country-packs/validate.ts

import { getAllPacks } from "./countryRegistry.ts";

const packs = getAllPacks();

console.log(`Loaded ${packs.length} country packs\n`);

for (const pack of packs) {
  const validated = pack.sources.filter(s => s.status === "validated").length;
  const discovered = pack.sources.filter(s => s.status === "discovered").length;
  console.log(`${pack.country} — ${pack.name}: ${pack.sources.length} sources (${validated} validated, ${discovered} discovered)`);

  for (const src of pack.sources) {
    console.log(`  ${src.id}`);
    console.log(`    ${src.capability} | ${src.format} | ${src.access} | ${src.status}`);
    console.log(`    ${src.endpoint}`);
  }
}

console.log(`\nTotal sources: ${packs.reduce((a, p) => a + p.sources.length, 0)}`);
