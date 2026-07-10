# OpenRisk Radar Roadmap

OpenRisk Radar prioritizes authoritative, browser-compatible public data sources that improve real-time situational awareness without requiring a backend service or secret API keys.

## Active Sources

These sources are part of the current codebase. "Main dashboard" indicates that the source is fetched through the active feed path and can appear in the map/feed UI.

| Source | Coverage | Signals | Status |
|--------|----------|---------|--------|
| NWS alerts | United States | Active weather alerts | Main dashboard |
| NWS observations | United States | Current conditions, hourly forecast fallback | Current conditions panel |
| NWS overlay | United States | Grid cell, hazards, heat risk, forecast/fire weather zones, stations | Optional map overlay |
| USGS earthquakes | Global | Earthquakes by proximity | Main dashboard |
| FEMA declarations | United States | Disaster declarations by state/county | Main dashboard, no geometry |
| NIFC wildfires | United States | Wildfires and prescribed burns | Main dashboard |
| SPC outlooks | United States | Day 1-3 convective outlook polygons | Main dashboard |
| NHC storms | Atlantic and Eastern/Central Pacific | Active tropical cyclones | Main dashboard when active/in range |
| GDACS | Global | Earthquakes, cyclones, floods, volcanoes, wildfires, droughts | Main dashboard |
| NASA EONET | Global | Earth observation natural events | Main dashboard |
| Open-Meteo | Global | Weather fallback, air quality, marine conditions | Current conditions fallback and environmental signals panel |
| Nominatim | Global | Geocoding/reverse geocoding | Location resolution fallback |
| USGS Water Services | United States | River conditions — discharge, gauge height, water temperature | Environmental signals panel |
| NOAA CO-OPS | U.S. coasts + Great Lakes | Coastal water levels, flood thresholds | Environmental signals panel |
| NOAA SWPC | Global | Kp index, DST, X-ray flares, solar flux | Environmental signals panel |
| US Drought Monitor | United States | D0-D4 drought severity polygons | Environmental signals panel |
| EMSC | Global | Earthquakes by proximity (European complement) | Service ready, not yet in UI |
| USGS Volcanoes | United States | Volcano alert levels (WATCH/ADVISORY/NORMAL) | Service ready, not yet in UI |
| Smithsonian GVP | Global | Holocene volcano reference database | Service ready, not yet in UI |

## Next Up

| Area | Why It Matters | Notes |
|------|----------------|-------|
| Add provider-aware deduplication | Several sources can describe the same hazard | Prioritize authoritative local source, preserve cross-source references |
| Add focused tests around adapters | Normalization and severity mapping are high-value deterministic logic | Keep tests source-specific and stable |
| Add real project imagery | README hero, Open Graph image, repository social preview | Required for polished public presentation |

## Investigated / Confirmed — Next Integration Candidates

These sources have been researched and confirmed as viable additions. They are organized by priority based on coverage breadth, integration effort, and the gap they fill.

### Tier 1 — Highest Priority (No API Key, Broad Coverage, Clear Gap)

| Source | Coverage | Data | Why It Matters | Status |
|--------|----------|------|----------------|--------|
| USGS Water Services | United States | Real-time streamflow, gauge height, water temperature from thousands of gauges | **Flood/river monitoring** — the single biggest gap. Instantaneous values API exposes flood conditions. | ✅ Done |
| NOAA CO-OPS | U.S. coasts + Great Lakes | Water levels, tides, coastal flood thresholds, storm surge, meteorological obs | **Coastal flood risk** — complements river flooding. Storm surge and high tide flood data. | ✅ Done |
| NOAA SWPC | Global | Solar flares, geomagnetic Kp index, solar wind, aurora, radio blackouts | **Space weather** — GPS disruption, power grid risk, radio blackout. Zero integration cost. | ✅ Done |
| US Drought Monitor | United States | D0-D4 drought severity weekly polygons and county-level stats | **Drought** — widely referenced standard for dry conditions, wildfire fuel assessment. | ✅ Done |
| SPC Storm Reports | United States | Observed tornado/hail/wind reports with lat/lon, size, fatalities | **Confirmed severe weather** — shows *actual* events vs. forecast outlooks already shown. | Ready for service |
| Blitzortung Lightning | Global (community network) | Real-time cloud-to-ground lightning strikes, seconds latency | **Lightning** — entirely new hazard dimension not covered by any current source. | Ready for service (WebSocket) |

### Tier 2 — High Value (May Need Free Key or More Integration)

| Source | Coverage | Data | Why It Matters | Key | Status |
|--------|----------|------|----------------|-----|--------|
| NASA FIRMS | Global | VIIRS 375m satellite fire hotspots | Global wildfire visibility beyond US-only NIFC | Free key needed | Pending |
| EPA AirNow / OpenAQ | U.S. / Global | Air quality AQI by ZIP/latlon, multi-pollutant | More granular than Open-Meteo for US; OpenAQ adds 200+ countries | Free key / No key | Pending |
| EMSC | Europe-Mediterranean + global | Earthquake data, felt reports, community-sourced | Complements USGS with European focus and felt intensity reports | No | ✅ Done |
| Smithsonian GVP | Global | Volcanic activity reports, weekly updates | Authoritative volcano data beyond GDACS alerts | No | ✅ Done |
| ReliefWeb | Global | Curated humanitarian disaster reports, situation reports | Adds humanitarian context to natural hazard data | No | Pending |
| JTWC | Indian Ocean + West Pacific | Tropical cyclone warnings beyond NHC basins | Covers basins NHC doesn't (Asia-Pacific) | No | Pending |

### Tier 3 — Niche But Valuable

| Source / Capability | Coverage | Notes |
|---------------------|----------|-------|
| NOAA NDFD | United States | National Digital Forecast Database — gridded 2.5km forecasts (temp, precip, wind, heat risk, visibility) |
| NOAA Tsunami Warning (PTWC/NTWC) | Pacific/Atlantic/Caribbean | CAP/ATOM feeds for tsunami warnings |
| GWIS / EFFIS | Global / Europe | Fire danger indices, burned area, active fires |
| GloFAS / Copernicus | Global / Europe | Global flood awareness forecasts |
| NOAA NCEI Climate Data | United States | Historical climate normals, severe weather data inventory |
| HIFLD | United States | Critical infrastructure locations (hospitals, schools, power plants, etc.) |
| GlobalBuildingAtlas | Global | Building footprint counts, heights, density — for impact exposure analysis |
| IBTrACS | Global historical tropical cyclones | Historical context, not live risk feed |
| WMO CAP warning aggregation | Global by country | Valuable but source discovery and normalization are complex |

## Integration Pattern

New event sources should follow the existing architecture:

```text
src/services/<source>.ts             Fetch and normalize source data
src/types/riskEvent.ts               Extend EventSource/EventCategory only when needed
src/hooks/useRiskFeeds.ts            Add React Query integration
src/lib/riskInsights.ts              Add filters, colors, ranking behavior
src/components/UpdatePanel.tsx       Add source summary row when useful
src/components/MapLegend.tsx         Add legend entry
src/components/EventDetailPanel.tsx  Add source-specific detail fields
public/_headers                      Add CSP connect-src host
```

Supplemental environmental signals that do not fit the main `RiskEvent` model should use `SupplementalRiskSignal` and receive a deliberate UI path instead of being forced into the event feed.
