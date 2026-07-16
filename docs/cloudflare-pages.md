# Cloudflare Worker Deployment

OpenRisk Radar uses Cloudflare Worker static assets plus narrowly routed Worker handlers for browser-incompatible public feeds. It requires no paid storage, API keys, or long-running services.

Production URL: https://openriskradar.com

## Build Settings

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `22`
- Deploy command: `npx wrangler deploy`

The checked-in `wrangler.jsonc` is the source of truth for the Worker name, entry point, static asset directory, and compatibility date. Deploy from the repository root with `npm run deploy`.

Cloudflare deploys the generated static files with the API Worker in one operation.

- Do not add a catch-all `_redirects` rule for the SPA shell. `wrangler.jsonc` sets static asset `not_found_handling` to `single-page-application`, which serves the Vite shell for `/app` and public content routes without routing assets through the Worker.
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

Saved locations live in browser IndexedDB. There is no backend database, scheduled job, user account system, or paid binding in the free-tier baseline.

## Free-Tier Reliability Functions

The production build routes only the browser-incompatible NOAA Storm Events,
FEMA National Risk Index, NOAA NWPS, and tsunami calls through `/api/*`.
`assets.run_worker_first` is limited to `/api/*`, so static assets remain free
and do not invoke Worker code. Responses use the Cache API and conservative
public TTLs to limit upstream traffic and Workers Free requests.

Local Vite development continues to call the public providers directly. Use
`npm run worker:dev` when testing production proxy routes locally.

Before publishing, run `npm run worker:check`. After publishing, run
`npm run smoke:production` to ensure the static shell and every `/api/*` route
return the expected content type instead of falling through to `index.html`.


## Free Dashboard Features

- Enable Pages build caching in Workers & Pages → project → Settings → Builds.
- Enable Cloudflare Web Analytics for privacy-first page and Web Vitals data.
  Do not add searched cities, ZIP codes, coordinates, or shared-view query
  strings as analytics dimensions.
- Keep preview deployments enabled for pull requests and test a real location
  search before promoting a deployment.
- Watch Pages Functions request volume after release. The static site remains
  outside that quota because `_routes.json` includes only `/api/*`.

## Public Routes and Offline Shell

The public landing page is `/`; the operational dashboard is `/app`. Direct
refreshes work through the static asset SPA fallback. `_routes.json` and
`assets.run_worker_first` remain limited to `/api/*`, so public HTML and static
assets do not consume API Worker invocations.

The manifest starts at `/app`. The service worker pre-caches that exact shell
and hashed same-origin assets. Successful public page navigations are cached by
their exact URL, but an uncached content route receives a plain offline response
instead of the dashboard shell. Live feed calls are never cached by the service
worker, so offline rendering cannot be mistaken for current hazard data.

## Required Public Assets

- `public/og-image.png` should be created before launch-quality social sharing.
- `docs/assets/openrisk-radar-hero.png` should be added for the README hero screenshot.
