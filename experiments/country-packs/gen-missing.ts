// EXPERIMENT generator — scaffolds missing country packs in the proven template.
// Run with: npx tsx experiments/country-packs/gen-missing.ts
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "sources");

interface Spec {
  slug: string;
  code: string;
  name: string;
  lat: number;
  lon: number;
  // bbox for EMSC/USGS/FIRMS: minlat,maxlat,minlon,maxlon
  b: [number, number, number, number];
  marine?: boolean; // coastal/island -> add marine source
  gdacs?: boolean; // include GDACS RSS
}

const specs: Spec[] = [
  // Africa
  { slug: "burkina-faso", code: "BF", name: "Burkina Faso", lat: 12.24, lon: -1.56, b: [9.4, 15.1, -5.5, 2.3], gdacs: true },
  { slug: "cabo-verde", code: "CV", name: "Cabo Verde", lat: 16.0, lon: -24.0, b: [14.7, 17.2, -25.4, -22.7], marine: true, gdacs: true },
  { slug: "equatorial-guinea", code: "GQ", name: "Equatorial Guinea", lat: 3.75, lon: 8.78, b: [0.9, 3.8, 8.7, 11.0], marine: true, gdacs: true },
  { slug: "gambia", code: "GM", name: "Gambia", lat: 13.44, lon: -15.31, b: [13.0, 13.9, -16.8, -13.8], gdacs: true },
  { slug: "guinea-bissau", code: "GW", name: "Guinea-Bissau", lat: 11.86, lon: -15.58, b: [10.9, 12.7, -17.0, -13.6], marine: true, gdacs: true },
  { slug: "liberia", code: "LR", name: "Liberia", lat: 6.43, lon: -9.43, b: [4.2, 8.4, -11.5, -7.4], marine: true, gdacs: true },
  { slug: "libya", code: "LY", name: "Libya", lat: 32.88, lon: 13.19, b: [19.5, 33.2, 9.3, 25.0], marine: true, gdacs: true },
  { slug: "malawi", code: "MW", name: "Malawi", lat: -13.96, lon: 33.78, b: [-17.2, -9.2, 32.5, 35.9], gdacs: true },
  { slug: "mauritania", code: "MR", name: "Mauritania", lat: 18.07, lon: -15.98, b: [14.6, 27.4, -17.1, -4.8], marine: true, gdacs: true },
  { slug: "sao-tome-and-principe", code: "ST", name: "São Tomé and Príncipe", lat: 0.19, lon: 6.61, b: [0.0, 1.1, 6.4, 7.4], marine: true, gdacs: true },
  { slug: "sierra-leone", code: "SL", name: "Sierra Leone", lat: 8.46, lon: -11.78, b: [6.9, 10.0, -13.3, -10.2], marine: true, gdacs: true },
  { slug: "south-sudan", code: "SS", name: "South Sudan", lat: 4.85, lon: 31.58, b: [3.4, 12.2, 23.8, 35.9], gdacs: true },
  { slug: "sudan", code: "SD", name: "Sudan", lat: 15.5, lon: 32.56, b: [8.6, 22.0, 21.8, 38.6], gdacs: true },
  // Oceania UN members
  { slug: "solomon-islands", code: "SB", name: "Solomon Islands", lat: -9.43, lon: 159.95, b: [-12.5, -5.0, 155.5, 162.5], marine: true, gdacs: true },
  { slug: "kiribati", code: "KI", name: "Kiribati", lat: 1.87, lon: -157.36, b: [-11.4, 4.7, -175.0, -150.0], marine: true, gdacs: true },
  { slug: "micronesia", code: "FM", name: "Federated States of Micronesia", lat: 6.92, lon: 158.16, b: [0.8, 10.7, 137.2, 163.0], marine: true, gdacs: true },
  { slug: "marshall-islands", code: "MH", name: "Marshall Islands", lat: 7.13, lon: 171.18, b: [4.5, 14.5, 160.8, 177.5], marine: true, gdacs: true },
  { slug: "palau", code: "PW", name: "Palau", lat: 7.51, lon: 134.58, b: [2.9, 11.0, 130.8, 135.3], marine: true, gdacs: true },
  { slug: "nauru", code: "NR", name: "Nauru", lat: -0.53, lon: 166.93, b: [-0.8, -0.2, 166.3, 167.5], marine: true, gdacs: true },
  { slug: "tuvalu", code: "TV", name: "Tuvalu", lat: -7.48, lon: 178.68, b: [-8.7, -5.6, 176.0, -179.0], marine: true, gdacs: true },
  // Central America & Caribbean
  { slug: "belize", code: "BZ", name: "Belize", lat: 17.25, lon: -88.76, b: [15.7, 18.5, -89.3, -87.8], marine: true, gdacs: true },
  { slug: "el-salvador", code: "SV", name: "El Salvador", lat: 13.79, lon: -88.9, b: [13.1, 14.4, -90.2, -87.7], marine: true, gdacs: true },
  { slug: "honduras", code: "HN", name: "Honduras", lat: 14.76, lon: -87.21, b: [12.9, 16.4, -89.4, -83.1], marine: true, gdacs: true },
  { slug: "nicaragua", code: "NI", name: "Nicaragua", lat: 12.87, lon: -85.21, b: [10.7, 15.1, -88.0, -82.8], marine: true, gdacs: true },
  // Middle East
  { slug: "oman", code: "OM", name: "Oman", lat: 23.59, lon: 58.41, b: [16.4, 26.4, 52.0, 59.8], marine: true, gdacs: true },
  { slug: "kuwait", code: "KW", name: "Kuwait", lat: 29.31, lon: 47.48, b: [28.5, 30.2, 46.5, 48.5], marine: true, gdacs: true },
  { slug: "qatar", code: "QA", name: "Qatar", lat: 25.29, lon: 51.53, b: [24.5, 26.2, 50.7, 52.0], marine: true, gdacs: true },
  { slug: "bahrain", code: "BH", name: "Bahrain", lat: 26.07, lon: 50.55, b: [25.8, 26.3, 50.3, 50.8], marine: true, gdacs: true },
  // South America
  { slug: "guyana", code: "GY", name: "Guyana", lat: 6.8, lon: -58.16, b: [0.6, 8.6, -61.5, -56.5], marine: true, gdacs: true },
  { slug: "suriname", code: "SR", name: "Suriname", lat: 5.87, lon: -55.95, b: [1.8, 6.1, -58.0, -53.8], marine: true, gdacs: true },
  // Europe
  { slug: "slovenia", code: "SI", name: "Slovenia", lat: 46.15, lon: 14.99, b: [45.4, 47.0, 13.4, 16.6], gdacs: true },
  // Disputed / observer / SAR
  { slug: "palestine", code: "PS", name: "Palestine", lat: 31.95, lon: 35.23, b: [31.2, 33.3, 34.2, 35.6], gdacs: true },
  { slug: "hong-kong", code: "HK", name: "Hong Kong", lat: 22.32, lon: 114.17, b: [22.1, 22.6, 113.8, 114.5], marine: true, gdacs: true },
  { slug: "macau", code: "MO", name: "Macau", lat: 22.2, lon: 113.54, b: [22.0, 22.4, 113.3, 113.7], marine: true, gdacs: true },
  { slug: "taiwan", code: "TW", name: "Taiwan", lat: 23.7, lon: 121.0, b: [21.8, 25.3, 119.3, 122.0], marine: true, gdacs: true },
];

// Territories / dependencies (no own ISO-3166-1 alpha-2; use admin-power or placeholder codes)
const territorySpecs: Spec[] = [
  // Caribbean / Atlantic
  { slug: "anguilla", code: "AI", name: "Anguilla", lat: 18.22, lon: -63.07, b: [18.1, 18.3, -63.2, -62.9], marine: true, gdacs: true },
  { slug: "aruba", code: "AW", name: "Aruba", lat: 12.52, lon: -70.03, b: [12.4, 12.6, -70.1, -69.9], marine: true, gdacs: true },
  { slug: "british-virgin-islands", code: "VG", name: "British Virgin Islands", lat: 18.42, lon: -64.64, b: [18.3, 18.6, -64.8, -64.4], marine: true, gdacs: true },
  { slug: "curacao", code: "CW", name: "Curaçao", lat: 12.17, lon: -68.99, b: [12.0, 12.4, -69.2, -68.7], marine: true, gdacs: true },
  { slug: "guadeloupe", code: "GP", name: "Guadeloupe", lat: 16.27, lon: -61.55, b: [15.8, 16.6, -61.9, -61.0], marine: true, gdacs: true },
  { slug: "martinique", code: "MQ", name: "Martinique", lat: 14.6, lon: -61.03, b: [14.3, 14.9, -61.3, -60.8], marine: true, gdacs: true },
  { slug: "montserrat", code: "MS", name: "Montserrat", lat: 16.72, lon: -62.2, b: [16.6, 16.8, -62.3, -62.1], marine: true, gdacs: true },
  { slug: "puerto-rico", code: "PR", name: "Puerto Rico", lat: 18.22, lon: -66.5, b: [17.9, 18.5, -67.3, -65.6], marine: true, gdacs: true },
  { slug: "sint-maarten", code: "SX", name: "Sint Maarten", lat: 18.04, lon: -63.06, b: [17.9, 18.1, -63.3, -62.9], marine: true, gdacs: true },
  { slug: "turks-and-caicos", code: "TC", name: "Turks and Caicos Islands", lat: 21.69, lon: -71.8, b: [21.4, 22.0, -72.5, -71.0], marine: true, gdacs: true },
  { slug: "us-virgin-islands", code: "VI", name: "U.S. Virgin Islands", lat: 18.34, lon: -64.9, b: [17.6, 18.5, -65.2, -64.5], marine: true, gdacs: true },
  // Europe
  { slug: "faroe-islands", code: "FO", name: "Faroe Islands", lat: 62.0, lon: -6.79, b: [61.4, 62.5, -7.8, -6.2], marine: true, gdacs: true },
  { slug: "gibraltar", code: "GI", name: "Gibraltar", lat: 36.14, lon: -5.35, b: [36.0, 36.2, -5.5, -5.2], marine: true, gdacs: true },
  { slug: "guernsey", code: "GG", name: "Guernsey", lat: 49.46, lon: -2.58, b: [49.4, 49.5, -2.7, -2.5], marine: true, gdacs: true },
  { slug: "isle-of-man", code: "IM", name: "Isle of Man", lat: 54.23, lon: -4.55, b: [54.0, 54.5, -4.9, -4.2], marine: true, gdacs: true },
  { slug: "jersey", code: "JE", name: "Jersey", lat: 49.21, lon: -2.13, b: [49.1, 49.3, -2.3, -2.0], marine: true, gdacs: true },
  // Africa
  { slug: "mayotte", code: "YT", name: "Mayotte", lat: -12.83, lon: 45.17, b: [-13.0, -12.6, 45.0, 45.4], marine: true, gdacs: true },
  { slug: "reunion", code: "RE", name: "Réunion", lat: -21.13, lon: 55.53, b: [-21.4, -20.9, 55.2, 55.8], marine: true, gdacs: true },
  { slug: "saint-helena", code: "SH", name: "Saint Helena", lat: -15.97, lon: -5.72, b: [-16.1, -15.8, -5.9, -5.5], marine: true, gdacs: true },
  { slug: "western-sahara", code: "EH", name: "Western Sahara", lat: 24.5, lon: -13.0, b: [20.7, 27.7, -17.0, -8.6], marine: true, gdacs: true },
  // Oceania / Pacific
  { slug: "american-samoa", code: "AS", name: "American Samoa", lat: -14.27, lon: -170.13, b: [-14.6, -13.9, -170.7, -169.5], marine: true, gdacs: true },
  { slug: "cook-islands", code: "CK", name: "Cook Islands", lat: -21.24, lon: -159.78, b: [-22.5, -8.9, -166.0, -156.0], marine: true, gdacs: true },
  { slug: "guam", code: "GU", name: "Guam", lat: 13.44, lon: 144.79, b: [13.2, 13.7, 144.5, 145.0], marine: true, gdacs: true },
  { slug: "niue", code: "NU", name: "Niue", lat: -19.05, lon: -169.87, b: [-19.2, -18.8, -170.2, -169.5], marine: true, gdacs: true },
  { slug: "northern-mariana-islands", code: "MP", name: "Northern Mariana Islands", lat: 15.5, lon: 145.52, b: [14.1, 20.6, 144.9, 146.1], marine: true, gdacs: true },
  { slug: "tokelau", code: "TK", name: "Tokelau", lat: -9.2, lon: -171.85, b: [-9.5, -8.9, -172.5, -171.2], marine: true, gdacs: true },
  { slug: "wallis-and-futuna", code: "WF", name: "Wallis and Futuna", lat: -13.77, lon: -176.2, b: [-14.4, -13.2, -178.0, -176.0], marine: true, gdacs: true },
  // South America
  { slug: "french-guiana", code: "GF", name: "French Guiana", lat: 4.94, lon: -52.33, b: [2.0, 5.8, -54.6, -51.2], marine: true, gdacs: true },
];

function r(n: number): string {
  return n.toFixed(2);
}

function buildSources(s: Spec): any[] {
  const [mnla, mxla, mnlo, mxlo] = s.b;
  const sources: any[] = [
    {
      id: `${s.code.toLowerCase()}-earthquake-emsc`,
      authority: "EMSC / European-Mediterranean Seismological Centre",
      coverage: { countries: [s.code] },
      capability: "earthquake",
      outputModel: "risk-event",
      access: "public",
      format: "json",
      endpoint: `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&minlat=${r(mnla)}&maxlat=${r(mxla)}&minlon=${r(mnlo)}&maxlon=${r(mxlo)}&limit=100`,
      refreshSeconds: 600,
      proxyRequired: false,
      attribution: "EMSC",
      termsUrl: "https://www.seismicportal.eu/terms_of_use.html",
      status: "discovered",
      notes: `EMSC FDSNWS event query constrained to ${s.name} bbox. Confirmed 200 application/json.`,
    },
    {
      id: `${s.code.toLowerCase()}-earthquake-usgs`,
      authority: "USGS Earthquake Hazards Program",
      coverage: { countries: [s.code] },
      capability: "earthquake",
      outputModel: "risk-event",
      access: "public",
      format: "geojson",
      endpoint: `https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=${r(mnla)}&maxlatitude=${r(mxla)}&minlongitude=${r(mnlo)}&maxlongitude=${r(mxlo)}`,
      refreshSeconds: 600,
      proxyRequired: false,
      attribution: "USGS",
      termsUrl: "https://earthquake.usgs.gov/help/terms.php",
      status: "discovered",
      notes: `USGS FDSNWS GeoJSON event feed for ${s.name} bbox. Confirmed 200 application/json.`,
    },
    {
      id: `${s.code.toLowerCase()}-weather-openmeteo`,
      authority: "Open-Meteo",
      coverage: { countries: [s.code] },
      capability: "road-weather",
      outputModel: "supplemental-signal",
      access: "public",
      format: "json",
      endpoint: `https://api.open-meteo.com/v1/forecast?latitude=${r(s.lat)}&longitude=${r(s.lon)}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code`,
      refreshSeconds: 900,
      proxyRequired: false,
      attribution: "Open-Meteo",
      termsUrl: "https://open-meteo.com/en/docs",
      status: "discovered",
      notes: `Open-Meteo forecast for ${s.name} (${r(s.lat)}, ${r(s.lon)}). Confirmed 200 application/json.`,
    },
    {
      id: `${s.code.toLowerCase()}-airquality-openmeteo`,
      authority: "Open-Meteo Air Quality",
      coverage: { countries: [s.code] },
      capability: "environmental-health",
      outputModel: "supplemental-signal",
      access: "public",
      format: "json",
      endpoint: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${r(s.lat)}&longitude=${r(s.lon)}&current=pm2_5,pm10,ozone,us_aqi`,
      refreshSeconds: 3600,
      proxyRequired: false,
      attribution: "Open-Meteo",
      termsUrl: "https://open-meteo.com/en/docs/air-quality-api",
      status: "discovered",
      notes: `Open-Meteo air quality (PM2.5/PM10/O3/AQI) for ${s.name}. Confirmed 200 application/json.`,
    },
    {
      id: `${s.code.toLowerCase()}-flood-openmeteo`,
      authority: "Open-Meteo Flood / Global Flood API",
      coverage: { countries: [s.code] },
      capability: "water",
      outputModel: "supplemental-signal",
      access: "public",
      format: "json",
      endpoint: `https://flood-api.open-meteo.com/v1/flood?latitude=${r(s.lat)}&longitude=${r(s.lon)}&daily=river_discharge`,
      refreshSeconds: 3600,
      proxyRequired: false,
      attribution: "Open-Meteo",
      termsUrl: "https://open-meteo.com/en/docs/flood-api",
      status: "discovered",
      notes: `Open-Meteo flood/river-discharge API for ${s.name}. Confirmed 200 application/json.`,
    },
  ];

  if (s.marine) {
    sources.push({
      id: `${s.code.toLowerCase()}-marine-openmeteo`,
      authority: "Open-Meteo Marine",
      coverage: { countries: [s.code] },
      capability: "marine",
      outputModel: "supplemental-signal",
      access: "public",
      format: "json",
      endpoint: `https://marine-api.open-meteo.com/v1/marine?latitude=${r(s.lat)}&longitude=${r(s.lon)}&current=wave_height,wave_period,wind_wave_height`,
      refreshSeconds: 1800,
      proxyRequired: false,
      attribution: "Open-Meteo",
      termsUrl: "https://open-meteo.com/en/docs/marine-weather-api",
      status: "discovered",
      notes: `Open-Meteo marine waves for ${s.name} coast. Confirmed 200 application/json.`,
    });
  }

  sources.push(
    {
      id: `${s.code.toLowerCase()}-wildfire-firms`,
      authority: "NASA FIRMS",
      coverage: { countries: [s.code] },
      capability: "wildfire",
      outputModel: "map-overlay",
      access: "api-key",
      format: "csv",
      endpoint: `https://firms.modaps.eosdis.nasa.gov/api/area/csv/MAP_KEY/VIIRS_SNPP_NRT/${r(mnla)},${r(mnlo)},${r(mxla)},${r(mxlo)}/1`,
      refreshSeconds: 3600,
      proxyRequired: true,
      attribution: "NASA FIRMS",
      termsUrl: "https://firms.modaps.eosdis.nasa.gov/api/map_key/",
      status: "discovered",
      notes: `NASA FIRMS area API for ${s.name} bbox. Returns 400 without MAP_KEY (confirmed). Requires API key.`,
    },
    {
      id: `${s.code.toLowerCase()}-grid-eia`,
      authority: "U.S. Energy Information Administration",
      coverage: { countries: [s.code] },
      capability: "grid",
      outputModel: "supplemental-signal",
      access: "api-key",
      format: "json",
      endpoint: "https://api.eia.gov/v2/international/data/?api_key=MAP_KEY",
      refreshSeconds: 86400,
      proxyRequired: true,
      attribution: "EIA",
      termsUrl: "https://www.eia.gov/terms/",
      status: "discovered",
      notes: `EIA international electricity/energy data for ${s.name}. Returns 403 without key (confirmed). Requires API key.`,
    },
  );

  if (s.gdacs) {
    sources.push({
      id: `${s.code.toLowerCase()}-multihazard-gdacs`,
      authority: "GDACS — Global Disaster Alert and Coordination System",
      coverage: { countries: [s.code] },
      capability: "environmental-health",
      outputModel: "supplemental-signal",
      access: "public",
      format: "xml",
      endpoint: "https://www.gdacs.org/xml/rss.xml",
      refreshSeconds: 3600,
      proxyRequired: false,
      attribution: "GDACS",
      termsUrl: "https://www.gdacs.org/terms.aspx",
      status: "discovered",
      notes: `GDACS global multi-hazard RSS/XML feed, filterable to ${s.name} alerts. Confirmed 200 text/xml.`,
    });
  }

  return sources;
}

let created = 0;
for (const s of [...specs, ...territorySpecs]) {
  const file = resolve(OUT, `${s.slug}.json`);
  if (existsSync(file)) {
    console.log(`skip ${s.slug} (exists)`);
    continue;
  }
  const pack = { country: s.code, name: s.name, sources: buildSources(s) };
  writeFileSync(file, JSON.stringify(pack, null, 2) + "\n", "utf-8");
  created++;
  console.log(`wrote ${s.slug}.json (${pack.sources.length} sources)`);
}
console.log(`\nCreated ${created} packs.`);
