# Changelog

## Unreleased

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
