# Static Deployment

OpenRisk Radar is currently set up as a static Cloudflare Pages app. Keep it static while traffic is small so the project stays inside the free tier without Workers or storage bindings.

Production URL: https://openriskradar.com

## Pages Settings

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `22`

Cloudflare Pages will deploy the generated static files and use the files in `public/` for headers:

- Do not add a catch-all `_redirects` rule for the SPA shell. Cloudflare Pages already serves the root app for unknown paths when there is no top-level `404.html`, and `/* /index.html 200` can fail validation as an infinite loop.
- `_headers` adds browser security headers, allows the current feed/map domains, and marks hashed assets as immutable.

## Current Runtime Shape

The app calls public feeds directly from the browser:

- NWS active weather alerts
- NWS current observations and hourly forecast fallback
- NWS forecast grid cells, forecast zones, fire weather zones, and nearby station observations for the optional map overlay
- USGS earthquake events
- FEMA disaster declarations
- NIFC ArcGIS wildfire incidents
- SPC convective outlook polygons
- NHC active tropical cyclones
- GDACS global disaster events
- NASA EONET Earth observation events
- Open-Meteo weather fallback, air quality, and marine conditions
- Nominatim geocoding, with local ZIP/city fallback
- OpenStreetMap map tiles

Saved locations live in browser IndexedDB. There is no backend database, scheduled job, or Pages Function in the free-tier baseline.

## When To Add Pages Functions

Add a small `/api/feeds` Pages Function only if direct browser calls become unreliable or provider policy requires server-side headers/caching. If that happens, keep the Function as a thin proxy with short cache TTLs because Pages Functions count against Workers free-plan quotas.

NWS and Nominatim both document expectations around identifiable clients, but browser JavaScript cannot set a custom `User-Agent` header. Keep searches user-triggered, avoid autocomplete, cache where practical, prefer local ZIP/city resolution when possible, and add a narrow Pages Function proxy if either provider requires app-specific server-side headers.

## Free-Tier Reliability Functions

The production build routes only the browser-incompatible NOAA Storm Events,
FEMA National Risk Index, and NOAA NWPS calls through `/api/*`. The checked-in
`public/_routes.json` keeps all static navigation and assets outside the Worker
invocation path. Responses use the Cache API and conservative public TTLs to
limit both upstream traffic and Workers Free requests.

Local Vite development continues to call the public providers directly. Use
Wrangler Pages development when testing the production proxy routes locally.


## Free Dashboard Features

- Enable Pages build caching in Workers & Pages → project → Settings → Builds.
- Enable Cloudflare Web Analytics for privacy-first page and Web Vitals data.
  Do not add searched cities, ZIP codes, coordinates, or shared-view query
  strings as analytics dimensions.
- Keep preview deployments enabled for pull requests and test a real location
  search before promoting a deployment.
- Watch Pages Functions request volume after release. The static site remains
  outside that quota because `_routes.json` includes only `/api/*`.

## Offline Shell

The app ships a small web app manifest and service worker. It caches only the
application shell and hashed same-origin assets. Live feed calls are never
cached by the service worker, so offline rendering cannot be mistaken for live
hazard data.

## Required Public Assets

- `public/og-image.png` should be created before launch-quality social sharing.
- `docs/assets/openrisk-radar-hero.png` should be added for the README hero screenshot.
