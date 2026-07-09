# Weather Data Options

OpenRisk Radar now uses weather.gov/NWS as the primary weather source for the free Cloudflare Pages path.

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

For OpenRisk Radar, its limitation is that it is primarily point/model data. It does not provide the same official NWS alert/zoning/station geometry that can be placed directly on the operational risk map.

## Current Decision

Use NWS for current conditions and the map overlay. Keep Open-Meteo out of the default Cloudflare Pages client until there is a specific non-U.S. coverage or model-variable requirement.
