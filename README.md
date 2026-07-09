# OpenRisk Radar

A real-time risk aggregation dashboard that pulls natural hazard and disaster data from US government APIs and displays it on an interactive map.

## Data Sources

| Source | Agency | Events |
|--------|--------|--------|
| **NWS** | National Weather Service | Weather alerts (active by state) |
| **USGS** | U.S. Geological Survey | Earthquakes (proximity search) |
| **FEMA** | Federal Emergency Management Agency | Disaster declarations (by state/county) |
| **NIFC** | National Interagency Fire Center | Wildfires & prescribed burns (proximity search) |

Also fetches current weather conditions from NWS observation stations (with hourly forecast fallback) and optional weather overlay grids (temperature, dewpoint, wind speed).

## Stack

- **React 18** + **TypeScript** (strict)
- **Vite** for build/dev
- **Leaflet** + **react-leaflet** for maps
- **TanStack React Query** for data fetching & caching
- **Dexie** (IndexedDB) for local persistence
- **Turf.js** for geospatial calculations

## Getting Started

Requires Node 22.

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Usage

1. Enter a **zip code** or **city, state** in the search bar.
2. The map centers on the resolved location with a configurable radius ring.
3. Risk events from all four sources appear on the map colored by severity.
4. Filter events by source (NWS/USGS/FEMA/NIFC) or severity (Minor/Moderate/Severe/Extreme).
5. Click an event on the map or in the feed explorer for details.
6. Save frequently monitored locations with custom labels and criticality tags.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Type-check + Vite build |
| `npm run lint` | ESLint check |
| `npm run preview` | Preview production build |

## Architecture

- `src/services/` — API clients for each data source (NWS, USGS, FEMA, NIFC, weather)
- `src/hooks/` — React Query hooks wrapping each service
- `src/components/` — UI components (map, search bar, feed explorer, detail panels)
- `src/types/` — Shared TypeScript types
- `src/lib/` — Utility functions (risk scoring, filters, formatting, ID generation)
- `src/data/` — Static lookup data (US cities, ZIP codes, state abbreviations)
