import type { ResolvedLocation, WatchHazard } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import { fetchDwdWarnings, supportsDwd } from "./dwd";
import { fetchEmscEvents } from "./emsc";
import { fetchEonetEvents } from "./eonet";
import { fetchGdacsEvents } from "./gdacs";
import { fetchGeoNetQuakes, fetchGeoNetVolcanoAlerts, supportsGeoNet } from "./geonet";
import { fetchMeteoalarmAlerts, supportsMeteoalarm } from "./meteoalarm";
import { fetchJmaCyclones } from "./jmaTyphoon";
import { fetchNhcStorms } from "./nhc";
import { fetchWildfires } from "./nifc";
import { fetchNwsAlertsForPoint } from "./nws";
import { fetchSpcOutlooks } from "./spc";
import { fetchEarthquakes } from "./usgs";
import { fetchWhoOutbreaks } from "./who";

export type LocationEventFeedId =
  | "nws-point"
  | "usgs"
  | "nifc"
  | "spc"
  | "nhc"
  | "jma"
  | "gdacs"
  | "eonet"
  | "emsc"
  | "geonet"
  | "geonet-volcanoes"
  | "dwd"
  | "who"
  | "meteoalarm";

export type LocationFeedSurface = "dashboard" | "saved-summary" | "watch-audit";

export interface LocationFeedContext {
  location: ResolvedLocation;
  radiusMiles: number;
  radiusKm: number;
}

export interface LocationEventFeedDefinition {
  id: LocationEventFeedId;
  label: string;
  hazards: WatchHazard[];
  surfaces: LocationFeedSurface[];
  staleTime: number;
  retry: number;
  enabled: (context: LocationFeedContext) => boolean;
  queryKey: (context: LocationFeedContext) => readonly unknown[];
  fetch: (context: LocationFeedContext) => Promise<RiskEvent[]>;
}

export interface LocationEventFeedResult {
  id: LocationEventFeedId;
  label: string;
  events: RiskEvent[];
  error: string | null;
}

const everywhere: LocationFeedSurface[] = ["dashboard", "saved-summary", "watch-audit"];
const foreground: LocationFeedSurface[] = ["dashboard", "saved-summary"];

const locationEventFeedDefinitions: LocationEventFeedDefinition[] = [
  {
    id: "nws-point",
    label: "NWS",
    hazards: ["weather", "flood"],
    surfaces: everywhere,
    staleTime: 60_000,
    retry: 2,
    enabled: ({ location }) => location.country === "USA",
    queryKey: ({ location }) => ["nws-alerts-point", location.latitude, location.longitude],
    fetch: ({ location }) => fetchNwsAlertsForPoint(location.latitude, location.longitude),
  },
  {
    id: "usgs",
    label: "USGS",
    hazards: ["earthquake"],
    surfaces: everywhere,
    staleTime: 60_000,
    retry: 2,
    enabled: () => true,
    queryKey: ({ location, radiusKm }) => ["usgs-quakes", location.latitude, location.longitude, radiusKm],
    fetch: ({ location, radiusKm }) => fetchEarthquakes(location.latitude, location.longitude, radiusKm),
  },
  {
    id: "nifc",
    label: "NIFC",
    hazards: ["wildfire"],
    surfaces: everywhere,
    staleTime: 120_000,
    retry: 2,
    enabled: ({ location }) => location.country === "USA",
    queryKey: ({ location, radiusKm }) => ["nifc-wildfires", location.latitude, location.longitude, radiusKm],
    fetch: ({ location, radiusKm }) => fetchWildfires(location.latitude, location.longitude, radiusKm),
  },
  {
    id: "spc",
    label: "SPC",
    hazards: ["weather"],
    surfaces: foreground,
    staleTime: 300_000,
    retry: 1,
    enabled: ({ location }) => location.country === "USA",
    queryKey: ({ location, radiusMiles }) => ["spc-outlooks", location.latitude, location.longitude, radiusMiles],
    fetch: ({ location, radiusMiles }) => fetchSpcOutlooks(location.latitude, location.longitude, radiusMiles),
  },
  {
    id: "nhc",
    label: "NHC",
    hazards: ["tropical"],
    surfaces: everywhere,
    staleTime: 300_000,
    retry: 1,
    enabled: () => true,
    queryKey: ({ location, radiusMiles }) => ["nhc-storms", location.latitude, location.longitude, radiusMiles],
    fetch: ({ location, radiusMiles }) => fetchNhcStorms(location.latitude, location.longitude, radiusMiles),
  },
  {
    id: "jma",
    label: "JMA",
    hazards: ["tropical"],
    surfaces: everywhere,
    staleTime: 300_000,
    retry: 1,
    enabled: () => true,
    queryKey: ({ location, radiusMiles }) => ["jma-cyclones", location.latitude, location.longitude, radiusMiles],
    fetch: ({ location, radiusMiles }) => fetchJmaCyclones(location.latitude, location.longitude, radiusMiles),
  },
  {
    id: "gdacs",
    label: "GDACS",
    hazards: ["earthquake", "flood", "tropical", "wildfire", "other"],
    surfaces: everywhere,
    staleTime: 300_000,
    retry: 1,
    enabled: () => true,
    queryKey: ({ location, radiusKm }) => ["gdacs-events", location.latitude, location.longitude, radiusKm],
    fetch: ({ location, radiusKm }) => fetchGdacsEvents(location.latitude, location.longitude, radiusKm),
  },
  {
    id: "eonet",
    label: "NASA EONET",
    hazards: ["wildfire", "tropical", "other"],
    surfaces: everywhere,
    staleTime: 300_000,
    retry: 1,
    enabled: () => true,
    queryKey: ({ location, radiusKm }) => ["eonet-events", location.latitude, location.longitude, radiusKm],
    fetch: ({ location, radiusKm }) => fetchEonetEvents(location.latitude, location.longitude, radiusKm),
  },
  {
    id: "emsc",
    label: "EMSC",
    hazards: ["earthquake"],
    surfaces: foreground,
    staleTime: 60_000,
    retry: 1,
    enabled: () => true,
    queryKey: ({ location, radiusKm }) => ["emsc-events", location.latitude, location.longitude, radiusKm],
    fetch: ({ location, radiusKm }) => fetchEmscEvents(location.latitude, location.longitude, radiusKm),
  },
  {
    id: "geonet",
    label: "GeoNet",
    hazards: ["earthquake"],
    surfaces: foreground,
    staleTime: 60_000,
    retry: 1,
    enabled: ({ location }) => supportsGeoNet(location),
    queryKey: ({ location, radiusKm }) => ["geonet-quakes", location.latitude, location.longitude, radiusKm],
    fetch: ({ location, radiusKm }) => fetchGeoNetQuakes(location.latitude, location.longitude, radiusKm),
  },
  {
    id: "geonet-volcanoes",
    label: "GeoNet volcanoes",
    hazards: ["other"],
    surfaces: foreground,
    staleTime: 300_000,
    retry: 1,
    enabled: ({ location }) => supportsGeoNet(location),
    queryKey: ({ location, radiusKm }) => ["geonet-volcanoes", location.latitude, location.longitude, radiusKm],
    fetch: ({ location, radiusKm }) => fetchGeoNetVolcanoAlerts(location.latitude, location.longitude, radiusKm),
  },
  {
    id: "dwd",
    label: "DWD",
    hazards: ["weather", "flood"],
    surfaces: foreground,
    staleTime: 300_000,
    retry: 1,
    enabled: ({ location }) => supportsDwd(location),
    queryKey: ({ location, radiusKm }) => ["dwd-warnings", location.latitude, location.longitude, radiusKm],
    fetch: ({ location, radiusKm }) => fetchDwdWarnings(location.latitude, location.longitude, radiusKm),
  },
  {
    id: "who",
    label: "WHO",
    hazards: ["other"],
    surfaces: foreground,
    staleTime: 15 * 60_000,
    retry: 1,
    enabled: () => true,
    queryKey: ({ location }) => ["who-outbreaks", location.country, location.state, location.county, location.city],
    fetch: ({ location }) => fetchWhoOutbreaks(location),
  },
  {
    id: "meteoalarm",
    label: "Meteoalarm",
    hazards: ["weather", "flood", "wildfire"],
    surfaces: foreground,
    staleTime: 300_000,
    retry: 1,
    enabled: ({ location }) => supportsMeteoalarm(location),
    queryKey: ({ location }) => ["meteoalarm", location.country, location.city, location.county, location.state],
    fetch: ({ location }) => fetchMeteoalarmAlerts(location),
  },
];

export function createLocationFeedContext(
  location: ResolvedLocation,
  radiusMiles: number
): LocationFeedContext {
  return { location, radiusMiles, radiusKm: radiusMiles * 1.60934 };
}

export function getLocationEventFeed(id: LocationEventFeedId): LocationEventFeedDefinition {
  const definition = locationEventFeedDefinitions.find((feed) => feed.id === id);
  if (!definition) throw new Error(`Unknown location event feed: ${id}`);
  return definition;
}

export function eligibleLocationEventFeeds(
  context: LocationFeedContext,
  surface: LocationFeedSurface,
  hazards?: WatchHazard[]
): LocationEventFeedDefinition[] {
  return locationEventFeedDefinitions.filter((feed) =>
    feed.surfaces.includes(surface) &&
    feed.enabled(context) &&
    (!hazards || feed.hazards.some((hazard) => hazards.includes(hazard)))
  );
}

export async function fetchLocationEventFeeds(
  context: LocationFeedContext,
  surface: LocationFeedSurface,
  hazards?: WatchHazard[]
): Promise<LocationEventFeedResult[]> {
  return Promise.all(eligibleLocationEventFeeds(context, surface, hazards).map(async (feed) => {
    try {
      return { id: feed.id, label: feed.label, events: await feed.fetch(context), error: null };
    } catch (error) {
      return {
        id: feed.id,
        label: feed.label,
        events: [],
        error: error instanceof Error ? error.message : `${feed.label} failed`,
      };
    }
  }));
}
