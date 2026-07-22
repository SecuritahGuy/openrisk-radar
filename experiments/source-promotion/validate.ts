// Run with: node --experimental-strip-types experiments/source-promotion/validate.ts [--source SOURCE_ID]
import { getAllPacks as getStatePacks } from "../state-packs/stateRegistry.ts";
import { getAllPacks as getCountryPacks } from "../country-packs/countryRegistry.ts";
import {
  assessPayloadFreshness,
  assessPromotionMetadata,
  probeSourcePayload,
  type PromotionSource,
} from "./gate.ts";

const sources = [
  ...getStatePacks().flatMap((pack) => pack.sources),
  ...getCountryPacks().flatMap((pack) => pack.sources),
] as PromotionSource[];
const sourceArg = process.argv.indexOf("--source");
const sourceId = sourceArg >= 0 ? process.argv[sourceArg + 1] : null;

if (!sourceId) {
  const ready = sources.filter((source) => assessPromotionMetadata(source).readyForProbe);
  console.log(`Promotion inventory: ${sources.length} sources; ${ready.length} pass static probe prerequisites.`);
  console.log("Use --source SOURCE_ID to run a live payload and freshness check.");
  process.exit(0);
}

const source = sources.find((candidate) => candidate.id === sourceId);
if (!source) throw new Error(`Unknown source: ${sourceId}`);
const metadata = assessPromotionMetadata(source);
console.log(JSON.stringify({ source: source.id, metadata }, null, 2));
if (!metadata.readyForProbe) process.exit(2);

try {
  const payload = await probeSourcePayload(source);
  const freshness = assessPayloadFreshness(source, payload);
  console.log(JSON.stringify({ source: source.id, freshness }, null, 2));
  if (freshness.status !== "fresh") process.exit(2);
} catch (error) {
  console.error(`Probe failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(2);
}
