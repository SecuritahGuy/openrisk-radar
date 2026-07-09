# OpenRisk Radar — Data Source Roadmap

## Current Sources (US-Focused)

| Source | Service | Hazard | Coverage | API Key | Status |
|--------|---------|--------|----------|---------|--------|
| NWS | `nws.ts` | Weather alerts | US only | No | Active |
| USGS | `usgs.ts` | Earthquakes | Global | No | Active |
| FEMA | `fema.ts` | Disaster declarations | US only | No | Active |
| NIFC | `nifc.ts` | Wildfires | US only | No | Active |
| SPC | `spc.ts` | Convective outlooks | US only | No | Active |
| NHC | `nhc.ts` | Tropical cyclones | Atlantic/E. Pacific | No | Active |
| NWS Weather | `weather.ts` | Current conditions | US only | No | Active |
| NWS Overlay | `nwsWeatherOverlay.ts` | Grid/zones/stations | US only | No | Active |
| Nominatim | `nominatim.ts` | Geocoding | Global | No | Active |

## Planned Sources

### Tier 1 — High Priority (browser-friendly, no key, GeoJSON/JSON)

| Source | What It Adds | Coverage | API Key | CORS | Format | Status |
|--------|-------------|----------|---------|------|--------|--------|
| **GDACS** | Earthquakes, floods, cyclones, volcanoes, wildfires, droughts | Global | No | Yes | GeoJSON | In progress |
| **NASA EONET** | Wildfires, storms, volcanoes, floods, sea ice, landslides, drought | Global | No (optional) | Yes | GeoJSON | Pending |
| **Open-Meteo** | Global weather, marine, air quality, flood forecasts | Global | No | Yes | JSON | Pending |

### Tier 2 — Medium Priority (free key or STAC/CAP complexity)

| Source | What It Adds | Coverage | API | Format | Notes |
|--------|-------------|----------|-----|--------|-------|
| **OpenAQ** | Air quality (PM2.5, PM10, O3, NO2, SO2, CO) | Global | Free key | JSON | Good for air quality overlay |
| **EMSC** | Earthquakes (complements USGS, Euro/Med focus) | Europe-Med + Global | No | GeoJSON | FDSN-compliant, redundant with USGS |
| **ReliefWeb** | Curated humanitarian disasters (all types) | Global | No (appname) | JSON | Verified event reports |
| **GWIS / EFFIS** | Fire danger, burned areas, active fires | Global | No | WMS/Download | Good wildfire complement |

### Tier 3 — Future / Research

| Source | What It Adds | Coverage | API | Notes |
|--------|-------------|----------|-----|-------|
| **Smithsonian GVP** | Volcano locations, eruption history | Global | WFS | Weekly update, pairs with GDACS volcanoes |
| **JTWC** | Active tropical cyclone warnings | 85% of global TC basins | Text/KMZ | Complements NHC for rest of world |
| **IBTrACS** | Historical tropical cyclone tracks | Global | Download | Historical context |
| **GloFAS** (Copernicus) | Global flood forecasts | Global | CDS API | Requires Python/CDS, not browser-friendly |
| **WMO Severe Weather** | Multi-hazard weather warnings | Global (per country) | CAP/XML | Per-country aggregation complex |
| **USGS Water** | River gauges | US only | JSON | Already in types as `USGS_WATER` |
| **NOAA COOPS** | Coastal water levels | US coasts | JSON | Already in types as `COOPS` |
| **EPA AirNow** | Air quality | US | JSON | Already in types as `AIRNOW` |

## Integration Pattern

Each new source follows the existing architecture:

```
src/services/<source>.ts   — Fetch + normalize to RiskEvent[]
src/types/riskEvent.ts      — Update EventSource type union
src/hooks/useRiskFeeds.ts   — Add useQuery call
src/lib/riskInsights.ts     — Add to EVENT_SOURCES, sourceColor
src/components/MapView.tsx  — Filter chips
src/components/UpdatePanel.tsx — Signal display row
src/components/MapLegend.tsx  — Legend entry
src/components/EventDetailPanel.tsx — Source-specific detail fields
public/_headers             — Add to CSP connect-src
```

For non-RiskEvent data (weather, air quality), use `SupplementalRiskSignal` from `src/types/supplementalRisk.ts`.