// EXPERIMENT ONLY — run with: node --experimental-strip-types experiments/state-packs/validate.ts
// Validates the state intelligence pack research by:
//   1. Testing real endpoints (CAL FIRE, CDEC, CAISO)
//   2. Running the state resolver against sample locations
//   3. Printing pack coverage and authority hierarchy

import { getStatePack, getAllPacks, getStatesWithCapability } from "./stateRegistry.ts";
import { resolveAuthority, isSourceReady, canonicalEventSources } from "./authorityHierarchy.ts";
import { resolvePacksForLocation, resolvePacksForAssets, collectReadySources, buildSourceLookup } from "./stateResolver.ts";

async function testCalFire(): Promise<void> {
  console.log("--- CAL FIRE Incidents ---");
  try {
    const res = await fetch("https://incidents.fire.ca.gov/umbraco/api/incidentapi/List", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`  HTTP ${res.status} — endpoint unreachable`);
      return;
    }
    const data = await res.json();
    if (Array.isArray(data)) {
      console.log(`  ${data.length} current incidents`);
      for (const inc of data.slice(0, 3)) {
        console.log(`    ${inc.Name} | ${inc.Type} | ${inc.County} | ${inc.AcresBurned ?? 0} acres | ${inc.PercentContained ?? "?"}% contained`);
        console.log(`      LAT ${inc.Latitude} LON ${inc.Longitude}`);
        console.log(`      Admin: ${inc.AdminUnit}`);
      }
    } else {
      console.log("  Unexpected response shape:", Object.keys(data).slice(0, 5));
    }
  } catch (err) {
    console.log(`  Fetch failed: ${err}`);
  }
}

async function testCdec(): Promise<void> {
  console.log("\n--- CDEC California Water (station metadata) ---");
  try {
    const res = await fetch("https://cdec.water.ca.gov/dynamicapp/staMeta?station_id=SAC", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`  HTTP ${res.status} — CDEC station meta not found`);
      return;
    }
    const text = await res.text();
    const stationMatch = text.match(/<th[^>]*>Station ID<\/th>\s*<td[^>]*>([^<]+)/i);
    const nameMatch = text.match(/<th[^>]*>Station Name<\/th>\s*<td[^>]*>([^<]+)/i);
    const riverMatch = text.match(/<th[^>]*>River Basin<\/th>\s*<td[^>]*>([^<]+)/i);
    console.log(`  Station SAC: ${stationMatch?.[1] ?? "?"}`);
    console.log(`  Name: ${nameMatch?.[1] ?? "?"}`);
    console.log(`  Basin: ${riverMatch?.[1] ?? "?"}`);
    console.log("  Note: CDEC JSON data API path needs additional research. Station metadata available.");
  } catch (err) {
    console.log(`  Fetch failed: ${err}`);
  }
}

async function testCaiso(): Promise<void> {
  console.log("\n--- CAISO Today's Outlook ---");
  try {
    const res = await fetch("https://www.caiso.com/todays-outlook", {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.log(`  HTTP ${res.status} — CAISO unavailable`);
      return;
    }
    console.log("  Page reachable (200). Data rendered client-side; CSV export path needs deeper inspection.");
  } catch (err) {
    console.log(`  Fetch failed: ${err}`);
  }
}

async function testResolver(): Promise<void> {
  console.log("\n--- State Resolver ---");

  // Sample: someone searching for Sacramento, CA with 50mi radius
  const sacramento = { state: "CA", latitude: 38.58, longitude: -121.49 };
  const radiusKm = 80; // ~50mi

  console.log(`\n  Location: Sacramento, CA (${sacramento.latitude}, ${sacramento.longitude}) radius ${radiusKm}km`);
  const results = resolvePacksForLocation(sacramento, radiusKm);
  console.log(`  Activated packs: ${results.map(r => r.state).join(", ")}`);
  for (const r of results) {
    const ready = r.readySources.length;
    const total = r.sources.length;
    console.log(`    ${r.state} (${r.trigger}): ${ready}/${total} sources ready`);
    for (const s of r.sources) {
      console.log(`      [${s.status}] ${s.id} — ${s.capability} (${s.outputModel})${s.proxyRequired ? " [proxy]" : ""}`);
    }
  }

  // Authority hierarchy demo
  console.log("\n  Authority hierarchy for wildfire sources:");
  const caPack = getStatePack("CA")!;
  const wildFires = caPack.sources.filter(s => s.capability === "wildfire");
  const groups = resolveAuthority(wildFires);
  for (const g of groups) {
    console.log(`    Primary: ${g.primary.id} (${g.primary.authority})`);
    for (const c of g.corroborating) {
      console.log(`      Corroborating: ${c.id} (${c.authority})`);
    }
  }

  // Saved assets dedup demo
  console.log("\n  Saved assets dedup (5 assets, 2 in CA):");
  const assets = [
    { id: "a1", label: "Home", state: "CA", latitude: 34.05, longitude: -118.25 },
    { id: "a2", label: "Cabin", state: "CA", latitude: 38.58, longitude: -121.49 },
    { id: "a3", label: "Office", state: "OR", latitude: 45.52, longitude: -122.68 },
    { id: "a4", label: "Vacation", state: "FL", latitude: 25.76, longitude: -80.19 },
    { id: "a5", label: "Warehouse", state: "CA", latitude: 33.94, longitude: -117.40 },
  ];
  const assetResults = resolvePacksForAssets(assets);
  console.log(`    Unique states: ${assetResults.length} (would make ${assetResults.length} API calls instead of 5)`);
  for (const r of assetResults) {
    console.log(`    ${r.state} — ${r.trigger}`);
  }

  // Canonical source resolution
  const lookup = buildSourceLookup(collectReadySources(results));
  const canons = ["ca-cal-fire-incidents", "ca-cdec-water", "ca-cdec-river-events"];
  const resolved = canonicalEventSources(canons, lookup);
  console.log(`\n  Canonical event source pick: primary=${resolved.primary}, corroborating=${resolved.corroborating}`);
}

function printRegistry(): void {
  console.log("--- State Intelligence Registry Summary ---");
  const packs = getAllPacks();
  console.log(`\n  ${packs.length} state packs configured`);
  let totalSources = 0;
  const byStatus: Record<string, number> = {};
  const byCapability: Record<string, number> = {};

  for (const pack of packs) {
    totalSources += pack.sources.length;
    const ready = pack.sources.filter(isSourceReady).length;
    console.log(`  ${pack.state}: ${pack.sources.length} sources (${ready} ready to build)`);
    for (const s of pack.sources) {
      byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
      byCapability[s.capability] = (byCapability[s.capability] ?? 0) + 1;
    }
  }

  console.log(`\n  Total sources: ${totalSources}`);
  console.log(`  By status: ${JSON.stringify(byStatus)}`);
  console.log(`  By capability: ${JSON.stringify(byCapability)}`);

  console.log("\n  States by capability:");
  for (const cap of ["wildfire", "grid", "water", "transportation-events", "environmental-health", "evacuation"]) {
    const states = getStatesWithCapability(cap);
    if (states.length > 0) {
      console.log(`    ${cap}: ${states.join(", ")}`);
    }
  }
}

async function main() {
  printRegistry();
  console.log("\n");
  await testCalFire();
  await testCdec();
  await testCaiso();
  await testResolver();
}

main().catch((err) => {
  console.error("Validation failed:", err);
  process.exit(1);
});
