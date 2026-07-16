# OpenRiskRadar Roadmap

OpenRiskRadar is intentionally split into two product tracks: an open-source anonymous web application, and a separate native Apple-first iOS product track. The web application remains browser-first and independent from the native app.

## Track A — OpenRiskRadar Web

### Web product direction

OpenRiskRadar Web is the current public product. It is designed to remain:

- Free.
- Open source.
- Anonymous.
- Browser-first.
- No-account.
- No dependency on native apps.

The web application is a complete product in its own right and is not a prototype for the native app.

### Active web sources

These sources are part of the current web codebase. "Main dashboard" indicates that the source is fetched through the active feed path and can appear in the map/feed UI.

| Source | Coverage | Signals | Status |
|--------|----------|---------|--------|
| NWS alerts | United States | Active weather alerts | Main dashboard |
| NWS observations | United States | Current conditions, hourly forecast fallback | Current conditions panel |
| NWS overlay | United States | Forecast grid cell, hazards, heat risk, forecast/fire weather zones, stations | Optional map overlay |
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

### Web priorities

- Continue adding authoritative public risk sources.
- Improve canonical incident correlation and provider-aware deduplication.
- Improve global coverage, reliability, and source attribution.
- Improve maps, visualizations, and risk summaries.
- Improve environmental signal integration.
- Improve local-only saved locations and anonymous workflows.
- Improve accessibility, mobile responsiveness, and public documentation.
- Improve tests for deterministic normalization and filtering logic.

### Experimental monitoring research

The current Cloudflare watch/audit implementation is experimental research. It is useful evidence for future continuous monitoring architecture, but it is not required for OpenRiskRadar Web and not the permanent backend architecture for the native iOS product.

### Next web work

| Area | Why It Matters | Notes |
|------|----------------|-------|
| Add provider-aware deduplication | Several sources can describe the same hazard | Prioritize authoritative local source, preserve cross-source references |
| Add focused tests around adapters | Normalization and severity mapping are high-value deterministic logic | Keep tests source-specific and stable |
| Add real project imagery | README hero, Open Graph image, repository social preview | Required for polished public presentation |

### Investigated / Confirmed — Next Integration Candidates

#### Tier 1 — Highest Priority (No API Key, Broad Coverage, Clear Gap)

| Source | Coverage | Data | Why It Matters | Status |
|--------|----------|------|----------------|--------|
| USGS Water Services | United States | Real-time streamflow, gauge height, water temperature from thousands of gauges | **Flood/river monitoring** — the single biggest gap. Instantaneous values API exposes flood conditions. | ✅ Done |
| NOAA CO-OPS | U.S. coasts + Great Lakes | Water levels, tides, coastal flood thresholds, storm surge, meteorological obs | **Coastal flood risk** — complements river flooding. Storm surge and high tide flood data. | ✅ Done |
| NOAA SWPC | Global | Solar flares, geomagnetic Kp index, solar wind, aurora, radio blackout | **Space weather** — GPS disruption, power grid risk, radio blackout. Zero integration cost. | ✅ Done |
| US Drought Monitor | United States | D0-D4 drought severity weekly polygons and county-level stats | **Drought** — widely referenced standard for dry conditions, wildfire fuel assessment. | ✅ Done |
| SPC Storm Reports | United States | Observed tornado/hail/wind reports with lat/lon, size, fatalities | **Confirmed severe weather** — shows *actual* events vs. forecast outlooks already shown. | Ready for service |
| Blitzortung Lightning | Global (community network) | Real-time cloud-to-ground lightning strikes, seconds latency | **Lightning** — entirely new hazard dimension not covered by any current source. | Ready for service (WebSocket) |

#### Tier 2 — High Value (May Need Free Key or More Integration)

| Source | Coverage | Data | Why It Matters | Key | Status |
|--------|----------|------|----------------|-----|--------|
| NASA FIRMS | Global | VIIRS 375m satellite fire hotspots | Global wildfire visibility beyond US-only NIFC | Free key needed | Pending |
| EPA AirNow / OpenAQ | U.S. / Global | Air quality AQI by ZIP/latlon, multi-pollutant | More granular than Open-Meteo for US; OpenAQ adds 200+ countries | Free key / No key | Pending |
| EMSC | Europe-Mediterranean + global | Earthquake data, felt reports, community-sourced | Complements USGS with European focus and felt intensity reports | No | ✅ Done |
| Smithsonian GVP | Global | Volcanic activity reports, weekly updates | Authoritative volcano data beyond GDACS alerts | No | ✅ Done |
| ReliefWeb | Global | Curated humanitarian disaster reports, situation reports | Adds humanitarian context to natural hazard data | No | Pending |
| JTWC | Indian Ocean + West Pacific | Tropical cyclone warnings beyond NHC basins | Covers basins NHC doesn't (Asia-Pacific) | No | Pending |

#### Tier 3 — Niche But Valuable

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

### Candidate research backlog

Researched open data sources not yet active are tracked in [docs/new-data-sources-roadmap.md](docs/new-data-sources-roadmap.md). It covers global fire, lightning, drought, flood forecasting, tsunami/sea-level, epidemic, conflict/humanitarian, air quality, and national feeds (Europe, Asia-Pacific, Latin America) with access methods, licences, and why each is included.

### Integration Pattern

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

## Track B — OpenRiskRadar for iOS

### Strategic direction

OpenRiskRadar for iOS is a separate native Apple-first product track. It should be designed as a privacy-focused commercial app that may eventually offer native private sync, sharing, widgets, notifications, and App Store monetization. It should not depend on web user accounts.

### Phase 0 — Product and architecture definition

- Define native iOS product requirements.
- Identify which current web concepts should be ported.
- Define CloudKit record model.
- Define private versus shared data ownership.
- Define family/small-team sharing model.
- Define StoreKit product structure.
- Define notification limitations and guarantees.
- Define native map and feed experience.
- Define offline behavior.
- Define privacy model.
- Define how authoritative source attribution is preserved.

### Phase 1 — Native MVP

- SwiftUI application shell.
- MapKit map and place search.
- Current risk summary and feed experience.
- Core hazard feed integration.
- Canonical incident model and severity classification.
- Local saved locations.
- CloudKit private sync.
- Clean native incident detail views.
- No traditional OpenRiskRadar account.

### Phase 2 — Apple-native differentiation

- Push notifications where architecture supports them.
- Home Screen widgets.
- Lock Screen widgets.
- Live Activities for suitable high-priority incidents.
- App Intents.
- Siri integration.
- Deep linking.
- Share sheets.
- Native accessibility support.

### Phase 3 — CloudKit sharing

- Family sharing.
- Shared locations and watches.
- Shared trips and properties.
- Shared notes.
- Incident acknowledgements.
- CKShare architecture.
- Ownership and participant permission behavior.
- Clear handling when owners revoke or delete shares.

### Phase 4 — Monetization

- StoreKit 2.
- Free tier.
- Pro tier.
- Family tier.
- Small Team tier if justified.
- Subscription entitlements.
- App Store launch preparation.
- Privacy disclosures.
- Purchase restoration.
- Family Sharing evaluation where appropriate.

### Phase 5 — Continuous monitoring decision

The product must decide whether it can satisfy expectations using:

- Foreground refresh.
- Local processing.
- Best-effort iOS background tasks.
- CloudKit synchronization.

Or whether it requires a separate backend for:

- minimal always-on risk ingestion.
- remote notification infrastructure.
- server-side change detection.

CloudKit does not alone guarantee 24/7 continuous monitoring of external risk feeds.

### Phase 6 — Future Android evaluation

- Android is a future native product track only.
- Reuse product concepts, risk models, incident correlation, and UX learnings as appropriate.
- Do not make Android the current implementation priority.

## Architecture principles

- The public website remains anonymous by design.
- Native apps do not require web accounts.
- Each platform may have its own native implementation.
- Domain concepts should remain consistent across platforms.
- CloudKit is the preferred starting point for Apple-native private data, synchronization, and sharing.
- CloudKit is not equivalent to an always-running external-feed monitoring engine.
- Avoid premature backend complexity.
- Preserve privacy and minimize centralized user data.
- Preserve authoritative source attribution.
- The open-source website remains valuable independently of commercial native apps.
