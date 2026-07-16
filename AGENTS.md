# Agent guidance for OpenRiskRadar

## Build & verify

CI order: `lint → test → build → worker:check`

```sh
npm run lint          # eslint .
npm test              # vitest run (no config file — uses defaults)
npm run build         # tsc -b && vite build
npm run worker:check  # wrangler deploy --dry-run
```

`npm run build` uses two tsconfigs via project references: `tsconfig.app.json` (src/) and `tsconfig.node.json` (vite.config.ts). The experiment directories (`experiments/`) are **not** in either — `tsc -b` ignores them. Use `npx tsx experiments/.../validate.ts` directly for experiment scripts.

Dev: `npm run dev` (Vite), `npm run worker:dev` (needs `npm run build` first).

Deploy: `npm run deploy` (build + `wrangler deploy`).

## Architecture

```
src/          — React 18 SPA (Vite)
  main.tsx      — entry point
  RootApp.tsx   — custom History API router (no react-router)
  routes.ts     — route registry (testable)
  App.tsx       — operational dashboard component
  services/     — 41 source adapters (NWS, USGS, FEMA, etc.)
  data/         — dataSources.ts, learnArticles.ts, location tables
  hooks/        — React data-fetching hooks
  lib/          — utility modules
worker/       — Cloudflare Workers entry point
  index.ts      — fetch handler, API routes, cron, queue consumer
  watch*.ts     — saved-location watch / push subsystems
functions/    — Pages Functions (imported by worker)
migrations/   — D1 (SQLite on Cloudflare) schema migrations
experiments/  — research scaffolds, NOT part of the web app
  state-packs/  — 51 US state packs (331 sources, JSON files in sources/)
  country-packs/ — 28 country packs (199 sources, JSON files in sources/)
  traffic/      — traffic incident research
```

Key packages: `react`, `leaflet`, `dexie` (IndexedDB), `@tanstack/react-query`, `papaparse`, `web-push`.

## Experiments (state-packs & country-packs)

These are **research scaffolds** — not imported by the web app. Each has its own tsconfig.

```sh
# validate state packs
npx tsx experiments/state-packs/validate.ts       # quick smoke test
npx tsx experiments/state-packs/validate-all.ts   # probes every endpoint (5 min timeout)

# validate country packs
npx tsx experiments/country-packs/validate.ts
npx tsx experiments/country-packs/validate-all.ts
```

State and country source files are JSON: `experiments/{state-packs,country-packs}/sources/{code}.json`. Each registry auto-loads all `.json` files from its `sources/` directory. Add a new state or country by creating a new JSON file there.

## Testing

`vitest run` with no config file — uses default test pattern. Tests live alongside source in `__tests__/` dirs:
- `src/__tests__/` — route/site tests
- `src/services/__tests__/` — service adapter tests
- `worker/__tests__/` — worker subsystem tests

## Worker & Cloudflare

`wrangler.jsonc` configures D1 DB (`DB` binding), Queues (`PUSH_QUEUE`), and cron (`*/30 * * * *`). The Worker proxies 5 API routes (`/api/fema/risk-index`, `/api/noaa/nwps`, `/api/noaa/storm-events`, `/api/noaa/tsunami`, `/api/meteoalarm/alerts`). Static assets are served by Cloudflare with SPA fallback.

## Lint rules

`eslint.config.js` uses `typescript-eslint` recommended rules plus `react-hooks` and `react-refresh`. Notable: `noUnusedLocals: true`, `noUnusedParameters: true` in tsconfig.app.json — unused imports/vars will error during build.
