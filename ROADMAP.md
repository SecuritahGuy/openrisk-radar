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

## Next Up

| Area | Why It Matters | Notes |
|------|----------------|-------|
| Add provider-aware deduplication | Several sources can describe the same hazard | Prioritize authoritative local source, preserve cross-source references |
| Add focused tests around adapters | Normalization and severity mapping are high-value deterministic logic | Keep tests source-specific and stable |
| Add real project imagery | README hero, Open Graph image, repository social preview | Required for polished public presentation |

## Future / Research

| Source / Capability | Coverage | Notes |
|---------------------|----------|-------|
| USGS Water Services | United States | River gauges and hydrologic observations |
| NOAA CO-OPS | U.S. coasts | Water levels, tides, coastal observations |
| EPA AirNow / OpenAQ | U.S. / Global | Air quality observations; check keys, CORS, terms |
| EMSC | Europe-Mediterranean + global | Earthquake complement to USGS |
| ReliefWeb | Global | Curated humanitarian disaster reports |
| GWIS / EFFIS | Global / Europe | Fire danger, burned areas, active fires |
| Smithsonian GVP | Global | Volcano locations and eruption history |
| JTWC | Global tropical cyclone basins outside NHC emphasis | Complements NHC but data formats are more complex |
| IBTrACS | Global historical tropical cyclones | Historical context, not live risk feed |
| GloFAS / Copernicus | Global flood forecasts | Likely not browser-only; may require backend workflow |
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
