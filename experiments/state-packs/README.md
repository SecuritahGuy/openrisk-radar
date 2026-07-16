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
| `stateRegistry.ts` | Pack configurations for all 16 states with 102 sources |
| `authorityHierarchy.ts` | Source authority hierarchy (Local > State > Federal > International) and dedup logic |
| `stateResolver.ts` | Activation logic: given a location or assets, which packs fire |
| `validate.ts` | Quick smoke-test: CAL FIRE + CDEC + CAISO + resolver demo |
| `validate-all.ts` | Full endpoint validation across all 102 sources |
| `tsconfig.json` | Isolated TS config for this experiment only |

## Pack definitions

Each source in a pack records:

- **capability**: transportation-events, road-weather, wildfire, evacuation, water, grid, environmental-health, earthquake, avalanche, marine, hurricane
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

| State | Sources | Transportation | Wildfire | Water | Grid | Evacuation | Enviro Health | Earthquake | Avalanche | Marine | Hurricane |
|-------|---------|---------------|----------|-------|------|------------|---------------|------------|-----------|--------|-----------|
| OR | 6 | TripCheck | OEM ArcGIS | USGS OR | — | OEM (ArcGIS) | — | USGS FDSN | NWAC | NWS CWF | — |
| CA | 6 | — | CAL FIRE | CDEC | CAISO | — | — | USGS FDSN | — | NWS CWF | — |
| WA | 6 | WSDOT + WZDx | — | USGS WA | — | — | — | USGS FDSN | NWAC | NWS CWF | — |
| FL | 7 | — | FDACS + burn bans | USGS FL | — | — | HABs (FDOH) | USGS FDSN | — | NWS CWF | NHC |
| TX | 5 | — | TFS (ArcGIS) | USGS TX | ERCOT | — | — | USGS FDSN | — | NWS CWF | — |
| WI | 3 | 511WI | — | — | — | — | DNR beaches | — | — | NWS GLF | — |
| NY | 8 | 511NY + WZDx | NYSDEC | GLERL + USGS | NYISO | — | HABs (DEC) | USGS FDSN | — | NWS GLF | — |
| PA | 7 | PennDOT RCRS | DCNR ArcGIS | USGS PA | PJM | — | BEACON | USGS FDSN | — | NWS GLF | — |
| MI | 8 | MDOT ArcGIS | DNR Wildfire | EGLE + GLERL | MISO | — | BeachGuard | USGS FDSN | — | NWS GLF | — |
| MN | 8 | MnDOT 511 | DNR Services | DNR LakeFinder | MISO | — | PCA Air | USGS FDSN | — | — | — |
| IL | 8 | IDOT ArcGIS | DNR ArcGIS | DNR Inundation | PJM | — | BeachGuard | USGS FDSN | — | NWS GLF | — |
| AZ | 6 | AZ511 WZDx + v2 | — | USGS AZ | — | — | NWS alerts | USGS FDSN | — | — | — |
| CO | 7 | CDOT ArcGIS | NWS alerts | CDSS v2 | Xcel (portal) | — | CO data portal | USGS FDSN | CAIC | — | — |
| NV | 5 | NV 511 v2 | NIFC ArcGIS | USGS NV | — | — | NWS alerts | USGS FDSN | — | — | — |
| UT | 7 | UDOT Traffic v2 | UT Fire Info | UT Open Water | RMP (portal) | — | UT air quality | USGS FDSN | UAC | — | — |
| NM | 5 | NMRoads v5 | NWS alerts | USGS NM | PNM (portal) | — | — | USGS FDSN | — | — | — |

All endpoints live-probed and validated, **74 validated** and **28 discovered** across 16 states (102 sources). Every state pack is ready to build — no research-required or error statuses remain.

## Status legend

- **validated** — Live-tested endpoint, CORS/shape confirmed
- **discovered** — Known to exist from docs; endpoint noted but not live-tested
- **research-required** — Known to exist but needs deeper probe (ArcGIS layer ID, auth flow, etc.)
- **error** — Endpoint broken or removed

## Run validation

```bash
# Quick smoke test (CAL FIRE + CDEC + CAISO + resolver)
node --experimental-strip-types experiments/state-packs/validate.ts

# Full endpoint validation (all 102 sources)
node --experimental-strip-types experiments/state-packs/validate-all.ts
```

The quick test checks the live CAL FIRE Incidents API, CDEC station metadata,
CAISO outlook page, runs the resolver for a Sacramento search, demonstrates
saved-asset dedup, resolves the authority hierarchy, and logs all 16 state
packs. The full test probes every source endpoint and proposes status changes.

## Relationship to traffic experiment

The traffic experiment (`experiments/traffic/`) provides the shared WZDx parser
and state traffic source registry used by transportation sources in the packs.
When implementing, traffic sources from `STATE_TRAFFIC_SOURCES` should be merged
into the relevant state pack or queried alongside it.
