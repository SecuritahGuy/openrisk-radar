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
    slug: "tsunami-alerts-readiness",
    title: "Tsunami Alerts: What They Mean and How to Prepare",
    description: "Learn what tsunami warnings, advisories, watches, and information statements mean, how natural warning signs matter, and where to find local evacuation guidance.",
    category: "Natural hazards",
    readingTime: "6 min read",
    reviewedAt: "2026-09-30",
    featured: true,
    sections: [
      { heading: "Know the four U.S. alert levels", paragraphs: ["For U.S. and Canadian coastlines, the U.S. Tsunami Warning Centers use four domestic message types. A Warning means dangerous coastal flooding and powerful currents are possible or occurring; move to high ground or inland and follow local evacuation instructions. An Advisory means strong currents and waves may be dangerous in or near the water; stay out of the water and away from beaches and waterways. A Watch means a tsunami may later affect the area; stay informed and be ready to act. An Information Statement usually means there is no threat of a destructive tsunami for the covered area, though a distant event may still be under evaluation.", "The situation and alert area can change as new earthquake and sea-level information arrives. Read the latest message and any local instructions, rather than relying on an earlier screenshot or headline."] },
      { heading: "Do not wait for an alert if you notice natural warning signs", paragraphs: ["If you are near the coast and feel a strong or long earthquake, see the ocean suddenly withdraw or rise, or hear an unusual roar from the sea, move immediately to high ground or inland. Do not wait for an official message or an evacuation order. If shaking is happening, protect yourself from the earthquake first; when it stops, evacuate on foot if you can do so safely, following posted routes and local plans."] },
      { heading: "Use local evacuation maps and instructions", paragraphs: ["Tsunami.gov messages describe broad forecast areas. The colored areas on its map use forecast zones and are not exact inundation boundaries; local emergency managers determine evacuation areas and routes. Before an event, learn whether your home, work, school, or travel routes are in a tsunami hazard zone and identify signed routes to high ground or inland. During an event, follow local authorities and do not go to the shore to watch."], bullets: ["A tsunami can arrive as a series of waves; the first may not be the largest.", "Stay away from beaches, harbors, and waterways until officials say the danger has passed.", "Do not treat a missing marker or an OpenRisk Radar summary as proof that a place is safe."] },
      { heading: "Use official channels for decisions", paragraphs: ["Check the U.S. Tsunami Warning Centers for current messages and your local emergency-management agency for evacuation areas and routes. For locations outside the U.S. and Canada, follow the national and local authorities responsible for that coast. OpenRisk Radar is a public-feed situational-awareness tool; it is not an emergency notification service, may be delayed or incomplete, and cannot determine whether you should evacuate. Call emergency services for immediate assistance."] },
    ],
    sources: [
      { label: "NOAA / U.S. Tsunami Warning Centers: message definitions", url: "https://www.tsunami.gov/php/message_definitions.php" },
      { label: "NOAA / U.S. Tsunami Warning Centers: map FAQ and forecast-zone limits", url: "https://www.tsunami.gov/?page=help" },
      { label: "FEMA / Ready.gov: tsunami preparedness", url: "https://www.ready.gov/sites/default/files/2024-03/ready.gov_tsunami_hazard-info-sheet.pdf" },
      { label: "NOAA Tsunami Program: forecast and warning system", url: "https://www.tsunami.noaa.gov/pmel-theme/forecast-warning" },
    ],
    cta: "Explore tsunami signals in OpenRisk Radar",
  },
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
    slug: "air-quality",
    title: "How to Read Air Quality and AQI",
    description: "Understand AQI categories, pollutant readings, model estimates, and what an air-quality signal can—and cannot—tell you about conditions where you are.",
    category: "Health and environment",
    readingTime: "6 min read",
    reviewedAt: "2026-09-30",
    featured: true,
    sections: [
      { heading: "AQI is a communication scale", paragraphs: ["The U.S. Air Quality Index (AQI) turns pollutant concentrations into a scale for communicating outdoor air quality and health concern. Its categories run from Good (0–50) through Moderate (51–100), Unhealthy for Sensitive Groups (101–150), Unhealthy (151–200), Very Unhealthy (201–300), and Hazardous (301 and above). Higher values mean greater concern; above 100, some groups may be affected before the general public." ] },
      { heading: "Find out which pollutant and index you are seeing", paragraphs: ["AQI is calculated separately for pollutants such as ground-level ozone and particulate matter (PM2.5 and PM10). A single headline number can hide which pollutant is driving it. Open the record and inspect available metrics and units. The U.S. and European AQI use different scales and category definitions, so their numbers are not directly interchangeable. OpenRisk Radar's headline uses the European AQI when present; the details can show both European and U.S. AQI values."], bullets: ["PM2.5 means fine particles 2.5 micrometers or smaller; smoke is one possible source.", "A pollutant concentration, such as PM2.5 in µg/m³, is not itself an AQI value.", "Check whether a value is observed, forecast, modeled, or sensor-reported before comparing it with another source."] },
      { heading: "A map estimate is not a nearby monitor", paragraphs: ["OpenRisk Radar's air-quality signal is generated from Open-Meteo's air-quality API, which provides gridded model data. A location result is therefore an estimate for an area, not necessarily a measurement from a monitoring station at that point. Local conditions can vary between grid cells and may change faster than a model or feed refreshes. Compare it with current observations and forecasts from AirNow or your local air agency, especially when conditions are unhealthy." ] },
      { heading: "Use the signal as context, then follow health guidance", paragraphs: ["AQI categories help people understand general health concern; they do not diagnose an individual or account for every person's sensitivity. EPA's activity guidance describes steps for reducing exposure, with more caution as AQI rises. Follow your clinician's advice and local public-health guidance. OpenRisk Radar is a situational-awareness tool, not an official alerting or medical service."], bullets: ["For current U.S. AQI observations and forecasts, check AirNow.", "During wildfire smoke, consult AirNow's Fire and Smoke Map and local health authorities.", "If you have a health condition, use your care plan and seek professional advice for concerning symptoms."] },
    ],
    sources: [
      { label: "U.S. EPA / AirNow: AQI basics and categories", url: "https://www.airnow.gov/aqi/aqi-basics/" },
      { label: "U.S. EPA / AirNow: particle pollution activity guidance", url: "https://www.airnow.gov/publications/air-quality-index/air-quality-guide-for-particle-pollution/" },
      { label: "Open-Meteo Air Quality API documentation", url: "https://open-meteo.com/en/docs/air-quality-api" },
      { label: "U.S. EPA / AirNow Fire and Smoke Map guide", url: "https://www.airnow.gov/fasm-v4/how-to-use/" },
    ],
    cta: "Explore air-quality signals for a location",
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
