export interface LearnArticleSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface LearnArticle {
  slug: string;
  title: string;
  description: string;
  category: string;
  readingTime: string;
  reviewedAt: string;
  featured: boolean;
  sections: LearnArticleSection[];
  sources: { label: string; url: string }[];
  cta: string;
}

export const learnArticles: LearnArticle[] = [
  {
    slug: "weather-alerts",
    title: "How to Read Weather Alerts",
    description: "Understand watches, warnings, advisories, timing, geographic scope, and the alert fields that help put a weather hazard in context.",
    category: "Understand alerts",
    readingTime: "6 min read",
    reviewedAt: "2026-07-16",
    featured: true,
    sections: [
      { heading: "Watch, warning, and advisory", paragraphs: ["A watch generally means a hazardous weather or hydrologic event is possible and there is time to prepare. A warning means the event is occurring, imminent, or highly likely and may threaten life or property. An advisory describes less serious conditions that can still cause significant inconvenience or become dangerous without caution.", "Product names and recommended actions vary by hazard and issuing office. Read the full alert rather than relying on its label alone."] },
      { heading: "Read the decision fields together", paragraphs: ["Common Alerting Protocol fields such as severity, certainty, and urgency describe different dimensions. Severity estimates potential impact. Certainty expresses how likely the event is. Urgency indicates how soon responsive action may be needed."], bullets: ["Check the effective, onset, and expiration times.", "Confirm whether your location falls inside the described area or polygon.", "Read the instruction and description fields for hazard-specific guidance.", "Open the original alert to see revisions or cancellations."] },
      { heading: "Geography and timing have limits", paragraphs: ["Alert areas may follow counties, forecast zones, marine zones, or hazard polygons. A mapped boundary is a communication aid, not a guarantee that conditions stop at the line. Alerts can also be extended, replaced, or canceled as conditions change."] },
      { heading: "Official local guidance comes first", paragraphs: ["OpenRisk Radar summarizes public feeds for situational awareness. Its optional browser notifications are not official or guaranteed emergency alerts. During dangerous weather, use official alert channels and follow instructions from local authorities and the issuing weather service."] },
    ],
    sources: [
      { label: "National Weather Service alert terminology", url: "https://www.weather.gov/safety/" },
      { label: "NWS API alert documentation", url: "https://www.weather.gov/documentation/services-web-api#/default/alerts_active_area" },
      { label: "OASIS Common Alerting Protocol 1.2", url: "https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html" },
    ],
    cta: "View current weather alerts in OpenRisk Radar",
  },
  {
    slug: "earthquakes",
    title: "Earthquake Magnitude and Intensity",
    description: "Learn why magnitude, shaking intensity, depth, distance, and revisions all matter when interpreting an earthquake report.",
    category: "Natural hazards",
    readingTime: "7 min read",
    reviewedAt: "2026-07-16",
    featured: true,
    sections: [
      { heading: "Magnitude is not local impact", paragraphs: ["Magnitude measures earthquake size at its source. Intensity describes shaking and effects at a particular place, so one earthquake can produce many different intensity values. Local geology, building characteristics, and distance all influence what people experience."] },
      { heading: "A logarithmic scale", paragraphs: ["Earthquake magnitude is logarithmic. For commonly used scales, a one-unit increase corresponds to about ten times the measured wave amplitude and roughly 32 times the energy. This does not translate into a fixed amount of damage."] },
      { heading: "Depth and distance", paragraphs: ["The epicenter is the point on Earth’s surface above the earthquake source. Depth describes how far below the surface rupture began. Shaking at a location depends on its distance from the source, depth, wave path, and local ground conditions, not magnitude alone."] },
      { heading: "Preliminary readings and aftershocks", paragraphs: ["Early locations and magnitudes can be revised as more station data and analyst review become available. Aftershocks are additional earthquakes in the same general area after a larger event; their rate usually decreases with time, but significant aftershocks remain possible."], bullets: ["Treat early measurements as estimates.", "Check the source record for updates.", "Use official local impact and tsunami information where relevant."] },
    ],
    sources: [
      { label: "USGS: magnitude versus intensity", url: "https://www.usgs.gov/faqs/what-difference-between-earthquake-magnitude-and-earthquake-intensity-what-modified-mercalli" },
      { label: "USGS ComCat documentation", url: "https://earthquake.usgs.gov/data/comcat/index.php" },
      { label: "USGS: why magnitudes are updated", url: "https://www.usgs.gov/faqs/whywhen-does-usgs-update-magnitude-earthquake" },
      { label: "USGS aftershock forecast overview", url: "https://earthquake.usgs.gov/data/oaf/overview.php" },
    ],
    cta: "View recent earthquakes in OpenRisk Radar",
  },
  {
    slug: "wildfires",
    title: "Understanding Wildfire Information",
    description: "Distinguish active-fire detections, incident points, perimeters, smoke information, weather warnings, and evacuation notices.",
    category: "Natural hazards",
    readingTime: "6 min read",
    reviewedAt: "2026-07-16",
    featured: true,
    sections: [
      { heading: "Different layers answer different questions", paragraphs: ["An incident point identifies a reported fire but does not show its full extent. A fire perimeter estimates an outer boundary at a particular time. Satellite active-fire detections identify thermal anomalies and can include uncertainty, cloud obstruction, timing gaps, or non-wildfire heat sources."] },
      { heading: "Weather and smoke are separate signals", paragraphs: ["A Red Flag Warning describes weather and fuel conditions that can support extreme fire behavior; it does not mean a fire is present. Smoke forecasts and air-quality observations describe conditions downwind and should not be treated as fire perimeters."] },
      { heading: "Evacuation information is local", paragraphs: ["Evacuation warnings and orders are issued by local authorities and can change quickly. A national incident feed may not include them, or may update later than a local channel."], bullets: ["Use local emergency-management and fire-agency channels.", "Do not infer safety from the absence of a marker.", "Check timestamps and the original source.", "Follow road closures and evacuation instructions from authorities."] },
    ],
    sources: [
      { label: "NIFC incident information", url: "https://www.nifc.gov/fire-information" },
      { label: "NASA FIRMS active-fire information", url: "https://www.earthdata.nasa.gov/data/tools/firms" },
      { label: "National Weather Service fire weather", url: "https://www.weather.gov/safety/wildfire-ww" },
      { label: "AirNow Fire and Smoke Map", url: "https://fire.airnow.gov/" },
    ],
    cta: "View current wildfire signals in OpenRisk Radar",
  },
  {
    slug: "floods",
    title: "Understanding Flood Alerts",
    description: "Learn the differences among flood watches, warnings, flash floods, river flooding, coastal flooding, and rainfall estimates.",
    category: "Natural hazards",
    readingTime: "6 min read",
    reviewedAt: "2026-07-16",
    featured: true,
    sections: [
      { heading: "Watch and warning", paragraphs: ["A flood watch means flooding is possible. A flood warning means flooding is occurring or expected soon. A flash flood warning concerns rapidly developing or ongoing flooding and calls for prompt attention to official instructions."] },
      { heading: "Flood hazards differ", paragraphs: ["River flooding develops as waterways rise and may be described with gauge forecasts. Flash flooding can develop quickly after intense rain, dam or levee failure, or debris blockage. Coastal flooding is driven by water levels along coasts and may involve tides, surge, waves, and wind."] },
      { heading: "Rainfall is not inundation depth", paragraphs: ["Radar and model rainfall estimates help describe precipitation but do not directly show water depth on every road or property. Terrain, drainage, soil, infrastructure, and earlier rainfall all affect flooding."] },
      { heading: "Map limits", paragraphs: ["Points, polygons, and gauge readings are incomplete representations of a changing hazard. A missing marker does not establish that a route is passable or a property is safe."], bullets: ["Never rely on OpenRisk Radar for evacuation routing.", "Use official road-closure and local emergency information.", "Avoid entering floodwater and follow local instructions."] },
    ],
    sources: [
      { label: "National Weather Service flood safety", url: "https://www.weather.gov/safety/flood" },
      { label: "NOAA National Water Prediction Service", url: "https://water.noaa.gov/" },
      { label: "FEMA flood information", url: "https://www.ready.gov/floods" },
      { label: "NOAA coastal flooding", url: "https://oceanservice.noaa.gov/facts/coastal-flooding.html" },
    ],
    cta: "View current flood and river signals in OpenRisk Radar",
  },
  {
    slug: "alert-severity",
    title: "How to Interpret Alert Severity",
    description: "Use severity alongside certainty, urgency, scope, recency, source authority, and your location.",
    category: "Understand alerts",
    readingTime: "5 min read",
    reviewedAt: "2026-07-16",
    featured: true,
    sections: [
      { heading: "Severity is one dimension", paragraphs: ["Severity estimates the potential consequences of an event. It does not by itself say whether the event will occur, how soon it may occur, or whether your location is affected."] },
      { heading: "Build context", paragraphs: ["Read certainty, urgency, geographic scope, recency, and source authority together. Check whether the record is an observation, forecast, outlook, advisory, or historical report."], bullets: ["Severity: how serious the potential impact may be.", "Certainty: how likely or observed the event is.", "Urgency: how soon action may be needed.", "Scope: which places and populations the source identifies.", "Recency: when the record was issued or updated.", "Authority: which organization issued the information."] },
      { heading: "High severity may still be distant", paragraphs: ["A severe event can be outside your search radius, moving away, expired, or relevant only to part of a broad alert area. Conversely, a lower-severity condition can matter greatly to a vulnerable person or operation. Open the original record and apply local context."] },
    ],
    sources: [
      { label: "OASIS Common Alerting Protocol 1.2", url: "https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html" },
      { label: "National Weather Service API alerts", url: "https://www.weather.gov/documentation/services-web-api#/default/alerts_active_area" },
    ],
    cta: "Explore alerts and their source details",
  },
  {
    slug: "using-openriskradar",
    title: "Using OpenRisk Radar",
    description: "A practical guide to searching, filtering, reading event details, saving locations, refreshing feeds, and understanding limitations.",
    category: "Using OpenRisk Radar",
    readingTime: "7 min read",
    reviewedAt: "2026-07-16",
    featured: true,
    sections: [
      { heading: "Start with a location", paragraphs: ["Search for a city or U.S. ZIP code, use browser location with permission, or select a map area. Choose a radius to define the nearby context used by many feeds. Some records use polygons or administrative areas and do not behave like simple points."] },
      { heading: "Filter and inspect", paragraphs: ["Source and severity controls reduce what is shown in the map and feed. Select an event to read its description, timestamps, source, confidence label, and original link. Filters change presentation; they do not alter upstream data."] },
      { heading: "Saved locations and browser storage", paragraphs: ["Saved locations are stored in IndexedDB in your browser. View preferences and offline snapshots use local storage. Clearing site data or using another browser or device may remove or omit those records. Optional cloud watch registration sends configured watch details to the project Worker when you explicitly enable it."] },
      { heading: "Refresh and data limitations", paragraphs: ["Feeds have different publication schedules and cache periods. Refresh requests updated data but cannot force an upstream provider to publish a new record. Records may be delayed, incomplete, duplicated, revised, or unavailable."], bullets: ["Check the displayed update time.", "Open the original source before making a consequential decision.", "Keep official alerts enabled on your phone or weather radio.", "Call the appropriate emergency service when immediate help is needed."] },
    ],
    sources: [
      { label: "OpenRisk Radar source code", url: "https://github.com/SecuritahGuy/openrisk-radar" },
      { label: "OpenRisk Radar data sources", url: "/data-sources" },
      { label: "OpenRisk Radar methodology", url: "/methodology" },
    ],
    cta: "Open the live radar",
  },
];

export const learnArticleByPath = new Map(learnArticles.map((article) => [`/learn/${article.slug}`, article]));
