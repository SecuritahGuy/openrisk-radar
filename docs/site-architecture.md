# Public Site Architecture

Last reviewed: 2026-07-16

## Current architecture audit

OpenRisk Radar is a React 18 and TypeScript application built by Vite. The original implementation mounted `src/App.tsx` directly and assumed the dashboard occupied `/`. It did not include React Router or another routing package. Dashboard share state is stored in the `q`, `radius`, `weather`, and `layer` query parameters; view preferences use local storage; saved locations use Dexie/IndexedDB.

The dashboard obtains data through source-specific adapters in `src/services`. Most public APIs are called directly in the browser. Browser-incompatible routes, the watch registry, push configuration, and service status are handled by `worker/index.ts` under `/api/*`. The Worker delegates non-API requests to Cloudflare static assets. `wrangler.jsonc` uses `not_found_handling: "single-page-application"`, so direct requests for content routes return the Vite shell. `public/_routes.json` also limits the legacy Pages Functions surface to `/api/*`; static assets do not invoke Functions.

The original service worker cached `/` as its application shell and used it as the fallback for every offline navigation. The manifest also started at `/`. That behavior would have incorrectly rendered the new homepage as an offline dashboard shell.

The application already had a strict Content Security Policy, a manifest, a small service worker, social metadata, a production smoke test, Vitest logic tests, and ESLint. It did not have a sitemap or robots file.

## New route architecture

`src/RootApp.tsx` is the application entry point. A small History API router in `src/router.tsx` handles internal links, `popstate`, trailing-slash normalization, scroll restoration, and browser back/forward behavior without adding a dependency. `src/routes.ts` is the testable route registry.

- `/` renders a public explanation and lightweight CSS dashboard preview.
- `/app` lazy-loads the existing operational dashboard and its Leaflet dependencies.
- `/learn` and the six `/learn/*` routes use structured article metadata in `src/data/learnArticles.ts`.
- `/data-sources` is generated from `src/data/dataSources.ts`, which was assembled from implemented service adapters and their actual cache settings.
- `/methodology`, `/about`, `/privacy`, `/terms`, and `/contact` use the shared public layout.
- Unknown routes render the no-index 404 view. `/404` intentionally renders the same view.

The project does not duplicate the dashboard at `/`. Old shared URLs are migrated with a client-side replace navigation only when the root URL contains a dashboard-specific `q`, `radius`, `weather`, or `layer` parameter. The original query string and hash are preserved.

## Dashboard migration decisions

The operational component remains `src/App.tsx`; only its route and outer height contract changed. This avoids rewriting feed hooks, map behavior, filters, search, saved locations, local storage, cloud watches, or source adapters. A compact dashboard navigation bar and locally dismissible introduction sit outside it.

The manifest starts at `/app` with root scope. Service worker cache version `openrisk-shell-v3` pre-caches `/app`, not `/`. Navigations use network-first behavior and cache successful pages by exact URL. Offline `/app` falls back only to its own shell. An uncached public content route returns a plain offline response instead of being replaced by the dashboard. Push notifications default to `/app`.

## SEO

`src/components/site/Seo.tsx` updates the title, description, canonical link, robots directive, Open Graph fields, Twitter card fields, and route JSON-LD after navigation. Articles include `Article` and `BreadcrumbList`; the homepage includes `WebSite` and `SoftwareApplication` data. The canonical origin defaults to `https://openriskradar.com` and may be configured with `VITE_SITE_URL`.

Because this remains a client-rendered SPA, crawlers that do not execute JavaScript see the homepage metadata from `index.html` for a direct content request. Cloudflare HTML rewriting or static prerendering would be a future improvement if search indexing shows this to be a limitation.

`public/sitemap.xml` includes indexable public content. `/app` is excluded because its useful content appears only after user interaction and live requests. The 404 route and parameterized dashboard URLs are also excluded.

## Advertising readiness

Advertising is disabled. `src/config/advertising.ts` explicitly marks content routes as eligible and `/app`, `/privacy`, `/terms`, `/contact`, and `/404` as excluded. `AdSlot` renders nothing without a production publisher configuration and currently has no live loader or slot IDs. Consent handling must be implemented before an AdSense loader is introduced. `public/ads.txt.example` is documentation only; there is no published fake record.

The existing CSP was not weakened. AdSense is not currently compatible with its strict `script-src 'self'` policy. A future implementation should use Cloudflare middleware to create a cryptographically random per-response nonce, attach it to approved scripts, keep route-based script exclusion, and add only the exact Google origins required by current AdSense documentation. Do not use `script-src *` or add broad origins to routes that do not load advertising.

## Privacy and analytics

No analytics loader was added. Cloudflare Web Analytics is the recommended privacy-conscious first option if the owner enables analytics. It should not record search text, ZIP codes, coordinates, saved-place labels, or dashboard query strings as custom dimensions. The privacy policy must be updated before any materially different collection begins.

The privacy page documents browser storage, geolocation, third-party requests, Cloudflare hosting, and the opt-in D1-backed cloud-watch and push-notification implementation. It does not claim that the project has no server-side storage.

## Known limitations and owner review

- Route metadata is client-side; static prerendering is not implemented.
- The dashboard has significant existing JavaScript because it includes many source adapters and panels. Route splitting prevents it from loading on public pages.
- Learning content uses authoritative source links but requires editorial review by the project owner.
- Data provider license statements are conservative; provider terms should be reviewed before commercial launch.
- The terms and privacy pages are implementation-informed drafts, not legal advice. Final legal review is required.
- `www` redirect behavior and direct-route behavior must be verified in the deployed Cloudflare zone.
- AdSense account approval, a consent platform, a real publisher ID, and a real `ads.txt` record remain owner actions.

## Build impact

The first production build after routing separated the public entry (`index`, about 36 kB uncompressed JavaScript) from `DashboardPage` (about 240 kB), Leaflet/map vendor code (about 156 kB), map rendering code (about 28 kB), and location data (about 65 kB). Exact hashed sizes vary by build. This keeps map and location modules out of the initial public-page dependency graph.
