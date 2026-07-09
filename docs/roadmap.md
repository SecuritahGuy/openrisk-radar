# Roadmap

## Data sources — done
- [x] Core risk feeds: NWS, USGS, FEMA, NIFC (wired, on map)
- [x] Current weather sidebar (wired)
- [x] NWS weather overlay (wired, on map)
- [x] Global service layer: GDACS, EONET (service only, no UI)
- [x] Supplemental feed services: SPC, USGS Water, CO-OPS, NHC, AirNow (fetching but invisible)

## Data sources — planned

### Ghost feeds
- [ ] Wire `SupplementalRiskMapLayers` into `MapView.tsx` (SPC, USGS Water, CO-OPS, NHC, AirNow on map)

### Global events
- [ ] Create hook + UI for GDACS / EONET (map markers, feed panel)

### Traffic incidents
- [ ] Build server-side aggregation service fetching state 511 APIs + CHP feed
- [ ] States using common ibi511 platform: CA, NY, CT, GA, UT, and more
- [ ] CHP free public incident feed: `https://media.chp.ca.gov/sa_xml/sa.xml`
- [ ] Normalize into common `TrafficEvent` type, cache results server-side
- [ ] No UI needed until the service layer is solid

### Flights / aircraft tracking
- [x] Researched options — **OpenSky Network** is the best fit
- [x] Service layer built: `src/services/opensky.ts` — `fetchAircraftStates(bbox)`
- [ ] Returns: lat, lng, altitude, velocity, heading, callsign, icao24
- [ ] Free for non-commercial/research, global coverage (volunteer ADS-B network)
- [ ] Uses OAuth2 client-credentials (free account), has credit-based rate limits
- [ ] Client-side polling by bbox around user location (no UI initially)

## Infrastructure
- [ ] Add API proxy layer for API-key-protected sources (AirNow)
- [ ] Create `.env.example` documenting required env vars
- [ ] Add `User-Agent` header to NWS API calls
- [ ] Fix FEMA events missing geometry (currently at [0,0])
