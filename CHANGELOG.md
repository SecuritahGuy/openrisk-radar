# Changelog

## Unreleased

### Watch audit operations

- Increased scheduled watch-audit capacity, added bounded per-watch concurrency, and isolated individual watch failures so one malformed registration cannot abort the remaining batch.
- Added short audit leases, increased the cron cadence, and aligned registry admission capacity with the worst-case hourly processing budget so due watches keep moving through the queue.
- Persisted audit-run metrics for operational visibility, including selected, processed, degraded, and failed watch counts plus run duration.
- Expanded `/api/status` with current watch backlog and last-run details, and corrected its evaluated-source list to match the shared feed registry.

### Shared feed contracts

- Replaced repeated dashboard query configuration for location event feeds with a single registry-backed React Query hook.
- Derived the public watch-audit source list directly from the shared feed registry, removing a stale parallel constant from the Worker.
- Added registry invariants for unique IDs, cache and retry policies, hazard coverage, supported surfaces, and location-aware activation.

### Incident correlation v2

- Replaced transitive union clustering with deterministic complete-link grouping so a chain of nearby reports cannot merge incidents whose endpoints fall outside the category contract.
- Added a per-contributor correlation explanation to canonical incident metadata and the incident detail panel, including spatial and temporal proximity to the authoritative primary record.

### Dashboard accessibility and responsive behavior

- Added a named main landmark and top-level dashboard heading for screen-reader navigation.
- Added a polite live status announcement for location resolution, source refresh progress, and the resulting signal count.
- Increased mobile touch targets across dashboard controls, saved-location actions, navigation, and Leaflet zoom controls while preserving the existing overflow-free phone layout.
- Added accessible names to event, cluster, supplemental-signal, searched-location, and map-search markers; the decorative radius ring is no longer keyboard-focusable.

### NASA satellite imagery

- Promoted NASA EOSDIS GIBS into the map with optional true-color, VIIRS thermal-anomaly, aerosol/smoke, and snow-cover layers plus a seven-day imagery selector.
- Corrected the experiment scaffold to use GIBS Web Mercator matrices in WMTS row/column order, product-specific native zoom ceilings, and WMS raster rendering for thermal-anomaly vector tiles.
- Added visible imagery date and attribution, loading and tile-error states, CSP coverage, source documentation, and deterministic tile-contract tests.

### Feed orchestration

- Added a shared, location-aware event-feed registry for the dashboard, saved-location summaries, and background watch audits.
- Centralized source eligibility, hazard coverage, query identity, retry policy, and freshness intervals for core live event feeds.
- Made saved-location summaries use the same automatic country and state-aware feed selection as the main dashboard.

### Monitoring reliability

- Expanded background watch audits from NWS, USGS, and NIFC to also use NHC, GDACS, and NASA EONET when their hazard coverage applies.
- Persisted resolved location context with cloud watches so monitoring can choose feeds from the saved country automatically.
- Changed watch evaluation to continue on partial upstream failures, recording a degraded warning while still evaluating successful feeds; an audit now fails only when every applicable source fails.

### Experiment promotion safety

- Added a promotion inventory and per-source live probe for the state and country experiment packs.
- Added static production-readiness checks for validation status, public access, HTTPS, attribution, terms, refresh intervals, and proxy requirements.
- Added payload freshness detection that blocks stale "active" datasets and requires manual review when a feed exposes no usable timestamps.

### Dashboard regression coverage

- Ensured the main dashboard column scrolls when summaries consume the viewport and guaranteed a usable minimum map height on desktop-sized screens.
- Persisted the monitored-place overview's collapsed state across reloads and added stable test hooks for browser regression checks.
- Reverified ZIP `60030` navigation resolves to Grayslake, Illinois, including the URL-driven search path.

### Asia-Pacific tropical coverage

- Added official Japan Meteorological Agency active tropical-cyclone analyses for the western North Pacific.
- Correlates JMA's active-system index with its track data, applies the same 300-mile tropical monitoring floor used for NHC systems, and activates automatically for dashboard, saved-location, and background-watch views.
- Added JMA attribution, source-health reporting, map/filter support, freshness handling, and adapter contract tests.
