# State Intelligence Packs Experiment (research only)

This directory is a **self-contained research scaffold** for building per-US-state
intelligence packs that bundle transportation, wildfire, water, grid, evacuation,
and environmental sources together. It is **NOT imported by the OpenRiskRadar web
app** and is excluded from the production build.

## Motivation

Rather than adding isolated feeds one at a time, a **state pack** activates when:

- A searched location is within that state.
- A saved asset is located in that state.
- A search radius overlaps the state.
- A future iOS user follows one or more locations in that state.

Each pack combines official state sources and complements OpenRiskRadar's
national feeds rather than duplicating them.

## Layout

| File | Purpose |
|------|---------|
| `types.ts` | `StateIntelligencePack`, `StateSourceDefinition`, capability/output/access enums, authority ranking |
| `stateRegistry.ts` | Pack configurations for all 11 states with 48 sources |
| `authorityHierarchy.ts` | Source authority hierarchy (Local > State > Federal > International) and dedup logic |
| `stateResolver.ts` | Activation logic: given a location or assets, which packs fire |
| `validate.ts` | Quick smoke-test: CAL FIRE + CDEC + CAISO + resolver demo |
| `validate-all.ts` | Full endpoint validation across all 48 sources |
| `tsconfig.json` | Isolated TS config for this experiment only |

## Pack definitions

Each source in a pack records:

- **capability**: transportation-events, road-weather, wildfire, evacuation, water, grid, environmental-health, avalanche, marine
- **outputModel**: risk-event (discrete incident), supplemental-signal (continuous condition), map-overlay (visual layer)
- **access**: public, api-key, authenticated, research-required
- **format**: json, geojson, xml, csv, arcgis, wzdx, cap
- **status**: validated, discovered, research-required, error
- **endpoint**: known URL or portal
- **proxyRequired**: whether a Cloudflare Worker proxy is needed for CORS/auth

## Authority hierarchy (dedup)

Research spec: `Local > State > Federal > International`

When multiple sources describe the same hazard (e.g., CAL FIRE + NIFC + NASA FIRMS
for one wildfire), the highest-authority source is displayed as primary and others
are retained as corroborating.

## States

| State | Sources | Transportation | Wildfire | Water | Grid | Evacuation | Enviro Health |
|-------|---------|----------------|----------|-------|------|------------|---------------|
| OR | 3 | TripCheck | — | — | — | ODEM (ArcGIS) | — |
| CA | 4 | — | CAL FIRE | CDEC | CAISO | — | — |
| WA | 3 | WSDOT + WZDx | — | — | — | — | — |
| FL | 4 | — | FDACS + burn bans | — | — | — | HABs |
| TX | 3 | — | TFS (ArcGIS) | — | ERCOT | — | — |
| WI | 2 | 511WI | — | — | — | — | DNR beaches |
| NY | 6 | 511NY + WZDx | NYSDEC | GLERL + USGS | NYISO | — | HABs |
| PA | 5 | PennDOT RCRS | DCNR ArcGIS | USGS PA | PJM | — | BEACON |
| MI | 6 | MDOT ArcGIS | DNR Wildfire | EGLE + GLERL | MISO | — | BeachGuard |
| MN | 6 | MnDOT 511 | DNR Services | DNR LakeFinder | MISO | — | PCA Air |
| IL | 6 | IDOT ArcGIS | DNR ArcGIS | DNR Inundation | PJM | — | BeachGuard |

After live endpoint probing (Jul 2026), **9 sources are validated**, **13 discovered**, **23 research-required**, and **3 error** (WA WZDx, MI EGLE water, MN 511 old host decommissioned). Validated sources include CAL FIRE (13 incidents), CAISO (grid CSV), PA DCNR wildfire (ArcGIS), PA PJM grid, PA USGS water, MI DNR wildfire (ArcGIS), IL DNR water (ArcGIS), and IL PJM grid.

## Status legend

- **validated** — Live-tested endpoint, CORS/shape confirmed
- **discovered** — Known to exist from docs; endpoint noted but not live-tested
- **research-required** — Known to exist but needs deeper probe (ArcGIS layer ID, auth flow, etc.)
- **error** — Endpoint broken or removed

## Run validation

```bash
# Quick smoke test (CAL FIRE + CDEC + CAISO + resolver)
node --experimental-strip-types experiments/state-packs/validate.ts

# Full endpoint validation (all 48 sources)
node --experimental-strip-types experiments/state-packs/validate-all.ts
```

The quick test checks the live CAL FIRE Incidents API, CDEC station metadata,
CAISO outlook page, runs the resolver for a Sacramento search, demonstrates
saved-asset dedup, resolves the authority hierarchy, and logs all 11 state
packs. The full test probes every source endpoint and proposes status changes.

## Relationship to traffic experiment

The traffic experiment (`experiments/traffic/`) provides the shared WZDx parser
and state traffic source registry used by transportation sources in the packs.
When implementing, traffic sources from `STATE_TRAFFIC_SOURCES` should be merged
into the relevant state pack or queried alongside it.
