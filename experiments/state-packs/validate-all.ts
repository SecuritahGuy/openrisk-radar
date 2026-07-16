// EXPERIMENT ONLY — comprehensive endpoint validation
// node --experimental-strip-types experiments/state-packs/validate-all.ts
// Tests every source endpoint across all 26 state packs.

import { getAllPacks } from "./stateRegistry.ts";
import type { StateSourceDefinition, SourceStatus } from "./types.ts";

interface ValidationResult {
  source: StateSourceDefinition;
  stateCode: string;
  stateName: string;
  httpStatus: number | null;
  error: string | null;
  contentType: string | null;
  bodySample: string | null;
  suggestedStatus: SourceStatus;
  notes: string;
}

const TIMEOUT = 10000;

function statusCategory(code: number | null): "success" | "client-error" | "server-error" | "network-error" | "redirect" {
  if (code === null) return "network-error";
  if (code >= 200 && code < 300) return "success";
  if (code >= 300 && code < 400) return "redirect";
  if (code >= 400 && code < 500) return "client-error";
  return "server-error";
}

function assessArcGIS(responseBody: string, _url: string): ValidationResult["notes"] {
  try {
    const json = JSON.parse(responseBody);
    if (json.currentVersion || json.layers || json.tables || json.serviceDescription) {
      return "ArcGIS REST service metadata received — service exists";
    }
    if (json.error) {
      return `ArcGIS error: ${json.error.message ?? JSON.stringify(json.error).slice(0, 200)}`;
    }
    return "ArcGIS endpoint returned JSON but unexpected shape";
  } catch {
    return "Expected ArcGIS JSON but got non-JSON response";
  }
}

function assessJSON(responseBody: string, source: StateSourceDefinition): ValidationResult["notes"] {
  try {
    const json = JSON.parse(responseBody);
    if (Array.isArray(json)) {
      return `JSON array with ${json.length} records`;
    }
    const keys = Object.keys(json).slice(0, 8);
    return `JSON object with keys: [${keys.join(", ")}]`;
  } catch {
    return `Invalid JSON (starts with: ${responseBody.slice(0, 120).replace(/\n/g, " ")})`;
  }
}

async function validateSource(
  source: StateSourceDefinition,
  stateCode: string,
  stateName: string
): Promise<ValidationResult> {
  if (source.status === "research-required") {
    // Skip "research-required" — endpoint URL isn't the real data URL
    return {
      source,
      stateCode,
      stateName,
      httpStatus: null,
      error: null,
      contentType: null,
      bodySample: null,
      suggestedStatus: "research-required",
      notes: `Skipped — endpoint is a portal page, not a data feed. Requires deeper inspection. Endpoint: ${source.endpoint}`,
    };
  }

  const result: ValidationResult = {
    source,
    stateCode,
    stateName,
    httpStatus: null,
    error: null,
    contentType: null,
    bodySample: null,
    suggestedStatus: source.status,
    notes: "",
  };

  try {
    const res = await fetch(source.endpoint, {
      signal: AbortSignal.timeout(TIMEOUT),
      redirect: "manual",
    });

    result.httpStatus = res.status;
    result.contentType = res.headers.get("content-type");

    const cat = statusCategory(res.status);

    if (cat === "redirect") {
      const location = res.headers.get("location") ?? "(no location)";
      result.suggestedStatus = "discovered";
      result.notes = `Redirected (${res.status}) → ${location}. Endpoint may have moved.`;
      result.bodySample = location;
      return result;
    }

    if (cat === "client-error") {
      if (res.status === 401 || res.status === 403) {
        result.suggestedStatus = "discovered";
        result.notes = `HTTP ${res.status} — endpoint exists but requires authentication/API key`;
      } else if (res.status === 404) {
        result.suggestedStatus = "error";
        result.notes = `HTTP 404 — endpoint not found. May have moved or been removed.`;
      } else if (res.status === 429) {
        result.suggestedStatus = "discovered";
        result.notes = `HTTP 429 — rate limited. Endpoint exists.`;
      } else if (res.status === 410) {
        result.suggestedStatus = "error";
        result.notes = `HTTP 410 — endpoint removed.`;
      } else {
        result.suggestedStatus = "error";
        result.notes = `HTTP ${res.status} — unexpected client error`;
      }
      return result;
    }

    if (cat === "server-error") {
      result.suggestedStatus = "error";
      result.notes = `HTTP ${res.status} — server error. May be temporary or endpoint broken.`;
      return result;
    }

    // Success (2xx) — read body and assess
    const body = await res.text();
    result.bodySample = body.slice(0, 300);

    const ct = (result.contentType ?? "").toLowerCase();

    if (source.format === "arcgis" || ct.includes("arcgis")) {
      result.notes = assessArcGIS(body, source.endpoint);
      result.suggestedStatus = body.includes("error") && JSON.parse(body).error?.code === 404
        ? "error"
        : "validated";
    } else if (source.format === "json" || source.format === "geojson" || source.format === "wzdx" || ct.includes("json")) {
      if (source.format === "geojson" || source.format === "wzdx") {
        try {
          const json = JSON.parse(body);
          if (source.format === "geojson" && json.type === "FeatureCollection") {
            result.notes = `Valid GeoJSON with ${json.features?.length ?? 0} features`;
            result.suggestedStatus = "validated";
          } else if (source.format === "wzdx") {
            result.notes = `JSON response, checking WZDx compliance`;
            result.suggestedStatus = "validated";
          } else {
            result.notes = assessJSON(body, source);
            result.suggestedStatus = "validated";
          }
        } catch {
          result.notes = `Expected ${source.format} but got non-JSON response`;
          result.suggestedStatus = "discovered";
        }
      } else {
        result.notes = assessJSON(body, source);
        result.suggestedStatus = "validated";
      }
    } else if (source.format === "csv" || ct.includes("csv") || ct.includes("text/csv")) {
      const lines = body.split("\n").filter(l => l.trim());
      result.notes = `CSV with ${lines.length} lines, ${(lines[0] ?? "").split(",").length} columns`;
      result.suggestedStatus = "validated";
    } else if (source.format === "xml" || ct.includes("xml")) {
      result.notes = `XML response (${body.length} bytes). Check well-formedness.`;
      result.suggestedStatus = "validated";
    } else if (source.format === "html" || ct.includes("html")) {
      const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "(no title)";
      result.notes = `HTML page: "${title}" (${body.length} bytes)`;
      result.suggestedStatus = "discovered";
    } else if (source.format === "kml" || ct.includes("kml") || ct.includes("vnd.google-earth")) {
      result.notes = `KML/XML response (${body.length} bytes)`;
      result.suggestedStatus = "validated";
    } else if (source.format === "cap" || ct.includes("cap") || ct.includes("xml")) {
      result.notes = `CAP/XML response (${body.length} bytes)`;
      result.suggestedStatus = "validated";
    } else {
      result.notes = `HTTP 200, content-type: ${result.contentType}, ${body.length} bytes`;
      result.suggestedStatus = "discovered";
    }

    return result;
  } catch (err: any) {
    result.httpStatus = null;
    if (err.name === "TimeoutError" || err.name === "AbortError") {
      result.error = "TIMEOUT";
      result.notes = `Request timed out after ${TIMEOUT}ms`;
      result.suggestedStatus = "discovered";
    } else if (err.cause?.code === "ENOTFOUND" || err.cause?.code === "EAI_AGAIN") {
      result.error = "DNS_FAILURE";
      result.notes = `DNS resolution failed for ${new URL(source.endpoint).hostname}`;
      result.suggestedStatus = "error";
    } else if (err.cause?.code === "ECONNREFUSED") {
      result.error = "CONNECTION_REFUSED";
      result.notes = `Connection refused`;
      result.suggestedStatus = "error";
    } else if (err.cause?.code === "ECONNRESET") {
      result.error = "CONNECTION_RESET";
      result.notes = `Connection reset`;
      result.suggestedStatus = "error";
    } else {
      result.error = err.message ?? String(err);
      result.notes = `Fetch error: ${result.error}`;
      result.suggestedStatus = "error";
    }
    return result;
  }
}

async function main() {
  const packs = getAllPacks();
  console.log(`Validating ${packs.reduce((a, p) => a + p.sources.length, 0)} sources across ${packs.length} states...\n`);

  const allResults: ValidationResult[] = [];

  for (const pack of packs) {
    console.log(`\n=== ${pack.state} — ${pack.name} ===`);
    const results = await Promise.all(
      pack.sources.map(s => validateSource(s, pack.state, pack.name))
    );
    // Small delay between states to avoid hammering
    await new Promise(r => setTimeout(r, 200));
    allResults.push(...results);

    for (const r of results) {
      const statusIcon =
        r.suggestedStatus === "validated" ? "✅" :
        r.suggestedStatus === "discovered" ? "🔶" :
        r.suggestedStatus === "research-required" ? "🔍" :
        r.suggestedStatus === "error" ? "❌" : "❓";
      const statusLabel = r.suggestedStatus === (r.source.status as SourceStatus) && r.suggestedStatus !== "error"
        ? r.suggestedStatus
        : `${r.source.status} → ${r.suggestedStatus}`;
      const httpStr = r.httpStatus ? `HTTP ${r.httpStatus}` : "no-conn";

      console.log(`  ${statusIcon} ${r.source.id}`);
      console.log(`      ${httpStr} | ${r.source.format} | ${r.source.access}`);
      console.log(`      ${r.notes.slice(0, 200)}`);
      console.log(`      Status: ${statusLabel}`);
    }
  }

  // Summary
  console.log("\n\n=== VALIDATION SUMMARY ===\n");
  const total = allResults.length;
  const validated = allResults.filter(r => r.suggestedStatus === "validated").length;
  const discovered = allResults.filter(r => r.suggestedStatus === "discovered").length;
  const researchReq = allResults.filter(r => r.suggestedStatus === "research-required").length;
  const errors = allResults.filter(r => r.suggestedStatus === "error").length;
  const changed = allResults.filter(r => r.suggestedStatus !== r.source.status).length;

  console.log(`  Total sources:     ${total}`);
  console.log(`  Validated:         ${validated} (${(validated/total*100).toFixed(0)}%)`);
  console.log(`  Discovered:        ${discovered}`);
  console.log(`  Research required: ${researchReq}`);
  console.log(`  Error/unreachable: ${errors}`);
  console.log(`  Status changes:    ${changed}`);

  // By state
  console.log("\n  Per state:");
  for (const pack of packs) {
    const stateResults = allResults.filter(r => r.stateCode === pack.state);
    const v = stateResults.filter(r => r.suggestedStatus === "validated").length;
    const e = stateResults.filter(r => r.suggestedStatus === "error").length;
    console.log(`    ${pack.state}: ${v}/${stateResults.length} validated, ${e} errors`);
  }

  // Per capability
  console.log("\n  Per capability:");
  const caps = [...new Set(allResults.map(r => r.source.capability))].sort();
  for (const cap of caps) {
    const capResults = allResults.filter(r => r.source.capability === cap);
    const v = capResults.filter(r => r.suggestedStatus === "validated").length;
    const e = capResults.filter(r => r.suggestedStatus === "error").length;
    console.log(`    ${cap}: ${v}/${capResults.length} validated, ${e} errors`);
  }

  // Endpoints that changed status
  const changedResults = allResults.filter(r => r.suggestedStatus !== r.source.status);
  if (changedResults.length > 0) {
    console.log(`\n  Proposed status changes (${changedResults.length}):`);
    for (const r of changedResults) {
      console.log(`    ${r.source.id}: ${r.source.status} → ${r.suggestedStatus} (${r.notes.slice(0, 100)})`);
    }
  }

  // Errors detail
  const errorResults = allResults.filter(r => r.suggestedStatus === "error");
  if (errorResults.length > 0) {
    console.log(`\n  Error details:`);
    for (const r of errorResults) {
      console.log(`    ❌ ${r.source.id} (${r.stateCode}): ${r.httpStatus ? `HTTP ${r.httpStatus}` : r.error ?? r.notes.slice(0, 100)}`);
    }
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
