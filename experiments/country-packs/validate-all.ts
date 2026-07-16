// EXPERIMENT ONLY — comprehensive country pack endpoint validation.
// npx tsx experiments/country-packs/validate-all.ts

import { getAllPacks } from "./countryRegistry.ts";
import type { CountrySourceDefinition } from "./types.ts";

interface ValidationResult {
  source: CountrySourceDefinition;
  countryCode: string;
  countryName: string;
  httpStatus: number | null;
  error: string | null;
  contentType: string | null;
  bodySample: string | null;
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

async function validateSource(
  source: CountrySourceDefinition,
  countryCode: string,
  countryName: string
): Promise<ValidationResult> {
  const result: ValidationResult = {
    source,
    countryCode,
    countryName,
    httpStatus: null,
    error: null,
    contentType: null,
    bodySample: null,
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
      result.notes = `Redirected (${res.status}) → ${location}`;
      return result;
    }

    if (cat === "client-error") {
      if (res.status === 401 || res.status === 403) {
        result.notes = `HTTP ${res.status} — endpoint exists but requires authentication/API key`;
      } else if (res.status === 429) {
        result.notes = `HTTP 429 — rate limited`;
      } else {
        result.notes = `HTTP ${res.status} — unexpected client error`;
      }
      return result;
    }

    if (cat === "server-error") {
      result.notes = `HTTP ${res.status} — server error`;
      return result;
    }

    const body = await res.text();
    result.bodySample = body.slice(0, 300);

    const ct = (result.contentType ?? "").toLowerCase();

    if (source.format === "arcgis" || ct.includes("arcgis")) {
      try {
        const json = JSON.parse(body);
        if (json.currentVersion || json.layers || json.serviceDescription) {
          result.notes = "ArcGIS REST service metadata received — service exists";
        } else {
          result.notes = "ArcGIS endpoint responded";
        }
      } catch {
        result.notes = "Expected ArcGIS JSON but got non-JSON response";
      }
    } else if (source.format === "json" || source.format === "geojson" || ct.includes("json")) {
      try {
        const json = JSON.parse(body);
        if (Array.isArray(json)) {
          result.notes = `JSON array with ${json.length} records`;
        } else {
          const keys = Object.keys(json).slice(0, 8);
          result.notes = `JSON object with keys: [${keys.join(", ")}]`;
        }
      } catch {
        result.notes = `Invalid JSON (starts with: ${body.slice(0, 120).replace(/\n/g, " ")})`;
      }
    } else if (ct.includes("xml") || source.format === "xml") {
      result.notes = `XML response (${body.length} bytes)`;
    } else if (ct.includes("html") || source.format === "html") {
      const titleMatch = body.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : "(no title)";
      result.notes = `HTML page: "${title}" (${body.length} bytes)`;
    } else {
      result.notes = `HTTP 200, content-type: ${result.contentType}, ${body.length} bytes`;
    }

    return result;
  } catch (err: unknown) {
    result.httpStatus = null;
    const error = err as { name?: string; message?: string; cause?: { code?: string } };
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      result.error = "TIMEOUT";
      result.notes = `Request timed out after ${TIMEOUT}ms`;
    } else if (error.cause?.code === "ENOTFOUND" || error.cause?.code === "EAI_AGAIN") {
      result.error = "DNS_FAILURE";
      result.notes = `DNS resolution failed for ${new URL(source.endpoint).hostname}`;
    } else if (error.cause?.code === "ECONNREFUSED") {
      result.error = "CONNECTION_REFUSED";
      result.notes = "Connection refused";
    } else if (error.cause?.code === "ECONNRESET") {
      result.error = "CONNECTION_RESET";
      result.notes = "Connection reset";
    } else {
      result.error = error.message ?? String(err);
      result.notes = `Fetch error: ${result.error}`;
    }
    return result;
  }
}

async function main() {
  const packs = getAllPacks();
  console.log(`Validating ${packs.reduce((a, p) => a + p.sources.length, 0)} sources across ${packs.length} countries\n`);

  const allResults: ValidationResult[] = [];

  for (const pack of packs) {
    console.log(`\n=== ${pack.country} — ${pack.name} ===`);
    const results = await Promise.all(
      pack.sources.map(s => validateSource(s, pack.country, pack.name))
    );
    await new Promise(r => setTimeout(r, 200));
    allResults.push(...results);

    for (const r of results) {
      const statusIcon =
        r.httpStatus && r.httpStatus >= 200 && r.httpStatus < 300 ? "✅" :
        r.httpStatus && r.httpStatus >= 300 && r.httpStatus < 400 ? "🔶" :
        r.httpStatus ? "❌" : "❌";
      const httpStr = r.httpStatus ? `HTTP ${r.httpStatus}` : r.error ?? "no-conn";

      console.log(`  ${statusIcon} ${r.source.id}`);
      console.log(`      ${httpStr} | ${r.source.format}`);
      console.log(`      ${r.notes.slice(0, 200)}`);
    }
  }

  const total = allResults.length;
  const alive = allResults.filter(r => r.httpStatus && r.httpStatus >= 200 && r.httpStatus < 400).length;
  const dead = allResults.filter(r => !r.httpStatus || r.httpStatus >= 400).length;

  console.log(`\n\n=== SUMMARY ===`);
  console.log(`  Total:  ${total}`);
  console.log(`  Alive:  ${alive}`);
  console.log(`  Dead:   ${dead}`);

  const deadResults = allResults.filter(r => !r.httpStatus || r.httpStatus >= 400);
  if (deadResults.length > 0) {
    console.log(`\n  Dead endpoints:`);
    for (const r of deadResults) {
      const reason = r.httpStatus ? `HTTP ${r.httpStatus}` : r.error ?? r.notes.slice(0, 80);
      console.log(`    ❌ ${r.source.id} (${r.countryCode}): ${reason}`);
    }
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
