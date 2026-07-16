// EXPERIMENT ONLY — run with: node --experimental-strip-types experiments/traffic/validate.ts
// Validates the research by hitting the live USDOT WZDx registry and parsing a
// real participating feed. This is a standalone research script, not part of the
// OpenRiskRadar build.

import { fetchWzdxRegistry, fetchWzdxFeedsForState, type ResolvedTrafficFeed } from "./wzdxRegistry.ts";
import { parseWzdxFeed } from "./transportationDataExchange.ts";

async function tryFetchFeed(feed: ResolvedTrafficFeed): Promise<number> {
  try {
    const res = await fetch(feed.feedUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return 0;
    const raw = await res.json();
    const events = parseWzdxFeed(raw, feed.organizationName, feed.jurisdiction);
    return events.length;
  } catch {
    return 0;
  }
}

async function main() {
  console.log("== WZDx registry validation ==");
  const registry = await fetchWzdxRegistry();
  console.log(`Registry records: ${registry.length}`);
  const usable = registry.filter((r) => r.feedUrl.startsWith("http") && r.active && !r.needsApiKey);
  console.log(`Usable (http + active + no key): ${usable.length}`);

  const feedTypes = registry.reduce<Record<string, number>>((acc, r) => {
    acc[r.feedType] = (acc[r.feedType] ?? 0) + 1;
    return acc;
  }, {});
  console.log("Feed types:", feedTypes);

  console.log("\n== Sample feeds (first 5 reachable, keyless) ==");
  let tested = 0;
  let reachable = 0;
  for (const feed of usable.slice(0, 25)) {
    const count = await tryFetchFeed(feed);
    tested += 1;
    if (count > 0) {
      reachable += 1;
      console.log(`  [${feed.jurisdiction}] ${feed.organizationName}: ${count} work-zone events (v${feed.specificationVersion})`);
      if (reachable >= 5) break;
    }
  }
  console.log(`Tested ${tested}, reachable with parseable WZDx: ${reachable}`);

  const probeStates = ["WA", "WI", "IL", "CA", "TX", "NY"];
  console.log("\n== State coverage via registry ==");
  for (const state of probeStates) {
    const feeds = await fetchWzdxFeedsForState(state).catch(() => []);
    console.log(`  ${state}: ${feeds.length} WZDx feed(s)`);
  }
}

main().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
