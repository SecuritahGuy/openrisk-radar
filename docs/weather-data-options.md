# Weather and Environmental Data Options

OpenRisk Radar uses weather.gov/NWS as the primary U.S. weather source in the main dashboard path. Open-Meteo provides global current-weather fallback plus air quality and marine supplemental signals in the side panel.

## Weather.gov/NWS

Best fit for this project because it provides official U.S. risk-oriented data with GeoJSON and linked endpoints:

- Active alerts by state through `/alerts/active`.
- Current observations through nearby stations discovered from `/points/{lat},{lon}`.
- Hourly forecast fallback through the point response `forecastHourly` link.
- Forecast grid cell geometry from hourly forecast GeoJSON.
- Raw grid fields through `forecastGridData`, including hazards, heat risk, sky cover, probability of thunder, precipitation probability, wind, temperature, humidity, and other risk-relevant fields.
- Forecast zones and fire weather zones as polygons.
- Nearby observation stations as point markers with temperature, humidity, wind, provider, and distance metadata.

The current client-only implementation calls NWS directly from the browser. Browsers provide their own user agent, but they cannot set a custom `User-Agent` header. If NWS requires app-specific contact identification later, add a small Cloudflare Pages Function proxy for NWS calls only.

## Open-Meteo

Open-Meteo is excellent for compact model/weather values and broad variable coverage, including hourly temperature, humidity, apparent temperature, precipitation probability, weather code, cloud cover, visibility, UV, wind speed, wind direction, and gusts.

The current codebase includes Open-Meteo adapters for weather observations, air quality, and marine conditions in `src/services/openMeteo.ts`. These are useful for global environmental context, but they are modeled as current or supplemental signals rather than authoritative alert polygons.

## Current Decision

Use NWS for U.S. current conditions and map overlays. Use Open-Meteo as a global fallback and as supplemental air-quality/marine context.
