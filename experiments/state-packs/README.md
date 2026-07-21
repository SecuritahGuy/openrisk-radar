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
| `stateRegistry.ts` | Pack configurations for all 50 US states + DC (51 packs) with 438 source entries |
| `authorityHierarchy.ts` | Source authority hierarchy (Local > State > Federal > International) and dedup logic |
| `stateResolver.ts` | Activation logic: given a location or assets, which packs fire |
| `validate.ts` | Quick smoke-test: CAL FIRE + CDEC + CAISO + resolver demo |
| `validate-all.ts` | Full endpoint validation across all 331 sources |
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
| GA | 7 | GA511 v2 | GFC ArcGIS | USGS GA | GA Power (portal) | — | NWS alerts | USGS FDSN | — | NWS CWF | — |
| NC | 8 | NCDOT TIMS ArcGIS | NCFS FARS | DEQ + USGS NC | Duke Energy ArcGIS | — | NC beach sampling | USGS FDSN | — | NWS CWF | NHC |
| VA | 7 | VDOT SmarterRoads | VDOF IFRIS | DEQ EDMA ArcGIS | Dominion (portal) | — | DEQ air quality | USGS FDSN | — | NWS CWF | — |
| OH | 7 | OHGO API | NWS alerts | USGS OH | FirstEnergy (portal) | — | BeachGuard HABs | USGS FDSN | — | NWS GLF | — |
| ID | 5 | ITD ArcGIS | IDL FireLayers | USGS ID | ID Power (portal) | — | — | USGS FDSN | — | — | — |
| SC | 7 | SCDOT KML | SCFC FireResponse | USGS SC | Dominion SC (portal) | — | Beach advisories | USGS FDSN | — | NWS CWF | — |
| IN | 6 | INDOT CARS XML | NWS alerts | IDEM AIMS + USGS | FirstEnergy (portal) | — | — | USGS FDSN | — | — | — |
| MD | 7 | CHART ArcGIS | NWS alerts | DNR + MDE ArcGIS | BGE (portal) | — | — | USGS FDSN | — | NWS CBF | — |
| LA | 7 | LA 511 v2 | LDAF (NIFC IRWIN) | USGS LA | Entergy (portal) | — | NWS alerts | USGS FDSN | — | NWS Gulf | NHC |
| MO | 6 | MoDOT ArcGIS | NWS alerts | USGS MO | Ameren (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| AL | 6 | ALGO Traffic | AFC (portal) | USGS AL | Alabama Power (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| IA | 6 | IA 511 ArcGIS | DNR (portal) | USGS IA | MidAmerican (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| KY | 6 | GoKY ArcGIS | KY DoF (portal) | USGS KY | LG&E/KU (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| NJ | 7 | NJ511 RSS | NJFFS (portal) | USGS NJ | PSE&G (portal) | — | NWS alerts | USGS FDSN | — | NWS marine | — |
| TN | 6 | SmartWay ArcGIS | TN DoF (portal) | USGS TN | TVA (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| AK | 8 | AK 511 REST | BLM AFS ArcGIS | USGS AK | Chugach/GVEA (portal) | — | NWS alerts | USGS FDSN | CNFAIC | NWS marine | — |
| AR | 6 | iDriveArkansas ArcGIS | AFC (portal) | USGS AR | Entergy (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| CT | 7 | CTroads REST | DEEP (portal) | USGS CT | Eversource (portal) | — | NWS alerts | USGS FDSN | — | NWS marine | — |
| DE | 7 | DelDOT TMC ArcGIS | DE Forest Svc (portal) | USGS DE | Delmarva (portal) | — | NWS alerts | USGS FDSN | — | NWS marine | — |
| DC | 5 | DDOT ArcGIS | — | USGS DC | PEPCO (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| KS | 6 | KanDrive | KFS (portal) | USGS KS | Evergy (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| MA | 7 | MassDOT data | DCR (portal) | USGS MA | NatGrid/Eversource (portal) | — | NWS alerts | USGS FDSN | — | NWS marine | — |
| MS | 7 | MDOTtraffic RSS | MFC ArcGIS | USGS MS | Entergy (portal) | — | NWS alerts | USGS FDSN | — | NWS marine | — |
| OK | 6 | OKTraffic ArcGIS | OFS (portal) | USGS OK | OG&E (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| HI | 7 | GoAkamai | DLNR DOFAW ArcGIS | USGS HI | HECO (portal) | — | NWS alerts | USGS FDSN | — | NWS marine | CPHC |
| MT | 7 | MDT ArcGIS | DNRC ArcGIS | USGS MT | NorthWestern (portal) | — | NWS alerts | USGS FDSN | GNFAC | — | — |
| ND | 6 | NDDOT RCRS ArcGIS | ND Forest Svc (portal) | USGS ND | OtterTail (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| SD | 6 | SD 511 ArcGIS | SD Wildland Fire (portal) | USGS SD | NorthWestern (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| NE | 6 | NE 511 ArcGIS | NE Forest Svc (portal) | USGS NE | NPPD/OPPD (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| WY | 7 | WYDOT ITSM ArcGIS | WY Forestry (portal) | USGS WY | RMP (portal) | — | NWS alerts | USGS FDSN | BTAC | — | — |
| WV | 6 | WV 511 ArcGIS | WV Forestry (portal) | USGS WV | APCo AEP (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| VT | 6 | VTrans ArcGIS | VT FPR (portal) | USGS VT | GMP (portal) | — | NWS alerts | USGS FDSN | — | — | — |
| NH | 7 | NH 511 ArcGIS | NH DFL (portal) | USGS NH | Eversource (portal) | — | NWS alerts | USGS FDSN | — | NWS marine | — |
| ME | 7 | MaineDOT ArcGIS | ME Forest Svc (portal) | USGS ME | Versant/CMP (portal) | — | NWS alerts | USGS FDSN | — | NWS marine | — |
| RI | 7 | RIDOT 511 (portal) | RI DEM (portal) | USGS RI | NatGrid RI (portal) | — | NWS alerts | USGS FDSN | — | NWS marine | — |

The registry currently contains **438 entries** across all 50 states + DC: **342 marked validated**, **95 discovered**, and **1 research-required**. A validated endpoint has passed the experiment's HTTP/shape probe; production promotion still requires fixture-based normalization tests, attribution review, geographic filtering, and UI integration.

## Status legend

- **validated** — Live-tested endpoint, CORS/shape confirmed
- **discovered** — Known to exist from docs; endpoint noted but not live-tested
- **research-required** — Known to exist but needs deeper probe (ArcGIS layer ID, auth flow, etc.)
- **error** — Endpoint broken or removed

## Run validation

```bash
# Quick smoke test (CAL FIRE + CDEC + CAISO + resolver)
node --experimental-strip-types experiments/state-packs/validate.ts

# Full endpoint validation (all 331 sources)
node --experimental-strip-types experiments/state-packs/validate-all.ts
```

The quick test checks the live CAL FIRE Incidents API, CDEC station metadata,
CAISO outlook page, runs the resolver for a Sacramento search, demonstrates
saved-asset dedup, resolves the authority hierarchy, and logs all 51 state
packs. The full test probes every source endpoint and proposes status changes.

## Relationship to traffic experiment

The traffic experiment (`experiments/traffic/`) provides the shared WZDx parser
and state traffic source registry used by transportation sources in the packs.
When implementing, traffic sources from `STATE_TRAFFIC_SOURCES` should be merged
into the relevant state pack or queried alongside it.
