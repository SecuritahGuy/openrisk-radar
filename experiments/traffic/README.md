# Traffic Data Experiment (research only)

This directory is a **self-contained research scaffold** for US traffic / road-hazard
data integration. It is **NOT imported by the OpenRiskRadar web app** and is excluded
from the production build (`tsconfig.app.json` only includes `src`).

## Goal

Validate the recommended hybrid approach before any website integration:

1. USDOT **WZDx** (work zones / construction) as the nationwide standardized feed.
2. USDOT **TDx** (incidents / restrictions) as a future-facing format.
3. A **state traffic-source registry** for authoritative local events (WA / WI / IL examples).
4. A **Cloudflare Worker gateway** design (keys server-side, normalized GeoJSON out).

## Layout

| File | Purpose |
|------|---------|
| `types.ts` | `TransportationRiskEvent`, `TrafficFlowSegment`, extended geometry types |
| `transportationDataExchange.ts` | Shared WZDx/TDx parser |
| `wzdxRegistry.ts` | USDOT WZDx registry client (Socrata `69qe-yiui`) |
| `stateTrafficSources.ts` | Registry of state DOT sources (WA/WI/IL examples) |
| `trafficWorker.ts` | Proposed `/api/traffic/*` Worker route (not registered) |
| `validate.ts` | Standalone script that fetches the live registry + sample feeds |
| `tsconfig.json` | Isolated TS config for this experiment only |

## Key design decisions (from research)

- **Discrete hazards** (crashes, closures, work zones, flooded roads, hazmat) normalize
  into `TransportationRiskEvent`. **Continuous congestion** (speed, travel time) stays in a
  separate `TrafficFlowSegment` model — never turned into thousands of RiskEvents.
- **LineString / MultiLineString geometry** is required; WZDx distributes road events as
  GeoJSON segments, not points.
- **Do not hardcode participating states.** Resolve from the WZDx registry at runtime.
- **Worker proxy** keeps state/commercial API keys out of the Vite bundle.

## Run the validation

```bash
node --experimental-strip-types experiments/traffic/validate.ts
```

This fetches the live USDOT WZDx registry, reports feed-type counts, parses the first
five reachable real feeds, and checks registry coverage for WA/WI/IL/CA/TX/NY.

## Status

Research scaffold only. No website, hook, panel, or worker route is wired yet.
