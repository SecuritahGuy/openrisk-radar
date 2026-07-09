export interface CityEntry {
  city: string;
  state: string;
  lat: number;
  lng: number;
  county: string;
  stateFips: string;
  countyFips: string;
}

const CITIES: CityEntry[] = [
  { city: "New York", state: "NY", lat: 40.7128, lng: -74.006, county: "New York County", stateFips: "36", countyFips: "061" },
  { city: "Los Angeles", state: "CA", lat: 34.0522, lng: -118.2437, county: "Los Angeles County", stateFips: "06", countyFips: "037" },
  { city: "Chicago", state: "IL", lat: 41.8781, lng: -87.6298, county: "Cook County", stateFips: "17", countyFips: "031" },
  { city: "Oswego", state: "IL", lat: 41.7054, lng: -88.3212, county: "Kendall County", stateFips: "17", countyFips: "093" },
  { city: "Houston", state: "TX", lat: 29.7604, lng: -95.3698, county: "Harris County", stateFips: "48", countyFips: "201" },
  { city: "Phoenix", state: "AZ", lat: 33.4484, lng: -112.074, county: "Maricopa County", stateFips: "04", countyFips: "013" },
  { city: "San Antonio", state: "TX", lat: 29.4241, lng: -98.4936, county: "Bexar County", stateFips: "48", countyFips: "029" },
  { city: "Philadelphia", state: "PA", lat: 39.9526, lng: -75.1652, county: "Philadelphia County", stateFips: "42", countyFips: "101" },
  { city: "San Diego", state: "CA", lat: 32.7157, lng: -117.1611, county: "San Diego County", stateFips: "06", countyFips: "073" },
  { city: "Dallas", state: "TX", lat: 32.7767, lng: -96.797, county: "Dallas County", stateFips: "48", countyFips: "113" },
  { city: "San Jose", state: "CA", lat: 37.3382, lng: -121.8863, county: "Santa Clara County", stateFips: "06", countyFips: "085" },
  { city: "Austin", state: "TX", lat: 30.2672, lng: -97.7431, county: "Travis County", stateFips: "48", countyFips: "453" },
  { city: "Jacksonville", state: "FL", lat: 30.3322, lng: -81.6557, county: "Duval County", stateFips: "12", countyFips: "031" },
  { city: "Fort Worth", state: "TX", lat: 32.7555, lng: -97.3308, county: "Tarrant County", stateFips: "48", countyFips: "439" },
  { city: "Columbus", state: "OH", lat: 39.9612, lng: -82.9988, county: "Franklin County", stateFips: "39", countyFips: "049" },
  { city: "Charlotte", state: "NC", lat: 35.2271, lng: -80.8431, county: "Mecklenburg County", stateFips: "37", countyFips: "119" },
  { city: "Indianapolis", state: "IN", lat: 39.7684, lng: -86.1581, county: "Marion County", stateFips: "18", countyFips: "097" },
  { city: "San Francisco", state: "CA", lat: 37.7749, lng: -122.4194, county: "San Francisco County", stateFips: "06", countyFips: "075" },
  { city: "Seattle", state: "WA", lat: 47.6062, lng: -122.3321, county: "King County", stateFips: "53", countyFips: "033" },
  { city: "Denver", state: "CO", lat: 39.7392, lng: -104.9903, county: "Denver County", stateFips: "08", countyFips: "031" },
  { city: "Nashville", state: "TN", lat: 36.1627, lng: -86.7816, county: "Davidson County", stateFips: "47", countyFips: "037" },
  { city: "Oklahoma City", state: "OK", lat: 35.4676, lng: -97.5164, county: "Oklahoma County", stateFips: "40", countyFips: "109" },
  { city: "El Paso", state: "TX", lat: 31.7619, lng: -106.485, county: "El Paso County", stateFips: "48", countyFips: "141" },
  { city: "Washington", state: "DC", lat: 38.9072, lng: -77.0369, county: "District of Columbia", stateFips: "11", countyFips: "001" },
  { city: "Boston", state: "MA", lat: 42.3601, lng: -71.0589, county: "Suffolk County", stateFips: "25", countyFips: "025" },
  { city: "Las Vegas", state: "NV", lat: 36.1699, lng: -115.1398, county: "Clark County", stateFips: "32", countyFips: "003" },
  { city: "Portland", state: "OR", lat: 45.5152, lng: -122.6784, county: "Multnomah County", stateFips: "41", countyFips: "051" },
  { city: "Memphis", state: "TN", lat: 35.1495, lng: -90.049, county: "Shelby County", stateFips: "47", countyFips: "157" },
  { city: "Louisville", state: "KY", lat: 38.2527, lng: -85.7585, county: "Jefferson County", stateFips: "21", countyFips: "111" },
  { city: "Baltimore", state: "MD", lat: 39.2904, lng: -76.6122, county: "Baltimore City", stateFips: "24", countyFips: "510" },
  { city: "Milwaukee", state: "WI", lat: 43.0389, lng: -87.9065, county: "Milwaukee County", stateFips: "55", countyFips: "079" },
  { city: "Albuquerque", state: "NM", lat: 35.0844, lng: -106.6504, county: "Bernalillo County", stateFips: "35", countyFips: "001" },
  { city: "Tucson", state: "AZ", lat: 32.2226, lng: -110.9747, county: "Pima County", stateFips: "04", countyFips: "019" },
  { city: "Fresno", state: "CA", lat: 36.7378, lng: -119.7871, county: "Fresno County", stateFips: "06", countyFips: "019" },
  { city: "Sacramento", state: "CA", lat: 38.5816, lng: -121.4944, county: "Sacramento County", stateFips: "06", countyFips: "067" },
  { city: "Kansas City", state: "MO", lat: 39.0997, lng: -94.5786, county: "Jackson County", stateFips: "29", countyFips: "095" },
  { city: "Atlanta", state: "GA", lat: 33.749, lng: -84.388, county: "Fulton County", stateFips: "13", countyFips: "121" },
  { city: "Omaha", state: "NE", lat: 41.2565, lng: -95.9345, county: "Douglas County", stateFips: "31", countyFips: "055" },
  { city: "Raleigh", state: "NC", lat: 35.7796, lng: -78.6382, county: "Wake County", stateFips: "37", countyFips: "183" },
  { city: "Miami", state: "FL", lat: 25.7617, lng: -80.1918, county: "Miami-Dade County", stateFips: "12", countyFips: "086" },
  { city: "Long Beach", state: "CA", lat: 33.7701, lng: -118.1937, county: "Los Angeles County", stateFips: "06", countyFips: "037" },
  { city: "Virginia Beach", state: "VA", lat: 36.8529, lng: -75.978, county: "Virginia Beach City", stateFips: "51", countyFips: "810" },
  { city: "Oakland", state: "CA", lat: 37.8044, lng: -122.2712, county: "Alameda County", stateFips: "06", countyFips: "001" },
  { city: "Minneapolis", state: "MN", lat: 44.9778, lng: -93.265, county: "Hennepin County", stateFips: "27", countyFips: "053" },
  { city: "Tampa", state: "FL", lat: 27.9506, lng: -82.4572, county: "Hillsborough County", stateFips: "12", countyFips: "057" },
  { city: "Tulsa", state: "OK", lat: 36.154, lng: -95.9928, county: "Tulsa County", stateFips: "40", countyFips: "143" },
  { city: "Arlington", state: "TX", lat: 32.7357, lng: -97.1081, county: "Tarrant County", stateFips: "48", countyFips: "439" },
  { city: "New Orleans", state: "LA", lat: 29.9511, lng: -90.0715, county: "Orleans Parish", stateFips: "22", countyFips: "071" },
  { city: "Cleveland", state: "OH", lat: 41.4993, lng: -81.6944, county: "Cuyahoga County", stateFips: "39", countyFips: "035" },
  { city: "Bakersfield", state: "CA", lat: 35.3733, lng: -119.0187, county: "Kern County", stateFips: "06", countyFips: "029" },
  { city: "Honolulu", state: "HI", lat: 21.3069, lng: -157.8583, county: "Honolulu County", stateFips: "15", countyFips: "003" },
  { city: "Anaheim", state: "CA", lat: 33.8366, lng: -117.9143, county: "Orange County", stateFips: "06", countyFips: "059" },
  { city: "Santa Ana", state: "CA", lat: 33.7455, lng: -117.8677, county: "Orange County", stateFips: "06", countyFips: "059" },
  { city: "Corpus Christi", state: "TX", lat: 27.8006, lng: -97.3964, county: "Nueces County", stateFips: "48", countyFips: "355" },
  { city: "Riverside", state: "CA", lat: 33.9533, lng: -117.3961, county: "Riverside County", stateFips: "06", countyFips: "065" },
  { city: "St. Louis", state: "MO", lat: 38.627, lng: -90.1994, county: "St. Louis City", stateFips: "29", countyFips: "510" },
  { city: "Lexington", state: "KY", lat: 38.0406, lng: -84.5037, county: "Fayette County", stateFips: "21", countyFips: "067" },
  { city: "Pittsburgh", state: "PA", lat: 40.4406, lng: -79.9959, county: "Allegheny County", stateFips: "42", countyFips: "003" },
  { city: "Anchorage", state: "AK", lat: 61.2181, lng: -149.9003, county: "Anchorage Municipality", stateFips: "02", countyFips: "020" },
  { city: "Cincinnati", state: "OH", lat: 39.1031, lng: -84.512, county: "Hamilton County", stateFips: "39", countyFips: "061" },
  { city: "Stockton", state: "CA", lat: 37.9577, lng: -121.2908, county: "San Joaquin County", stateFips: "06", countyFips: "077" },
  { city: "Toledo", state: "OH", lat: 41.6528, lng: -83.5379, county: "Lucas County", stateFips: "39", countyFips: "095" },
  { city: "Newark", state: "NJ", lat: 40.7357, lng: -74.1724, county: "Essex County", stateFips: "34", countyFips: "013" },
  { city: "Buffalo", state: "NY", lat: 42.8864, lng: -78.8784, county: "Erie County", stateFips: "36", countyFips: "029" },
  { city: "St. Paul", state: "MN", lat: 44.9537, lng: -93.09, county: "Ramsey County", stateFips: "27", countyFips: "123" },
  { city: "Plano", state: "TX", lat: 33.0198, lng: -96.6989, county: "Collin County", stateFips: "48", countyFips: "085" },
  { city: "Henderson", state: "NV", lat: 36.0395, lng: -114.9817, county: "Clark County", stateFips: "32", countyFips: "003" },
  { city: "Lincoln", state: "NE", lat: 40.8136, lng: -96.7026, county: "Lancaster County", stateFips: "31", countyFips: "109" },
  { city: "Greensboro", state: "NC", lat: 36.0726, lng: -79.792, county: "Guilford County", stateFips: "37", countyFips: "081" },
  { city: "Jersey City", state: "NJ", lat: 40.7179, lng: -74.0431, county: "Hudson County", stateFips: "34", countyFips: "017" },
  { city: "Chula Vista", state: "CA", lat: 32.6401, lng: -117.0842, county: "San Diego County", stateFips: "06", countyFips: "073" },
  { city: "Orlando", state: "FL", lat: 28.5383, lng: -81.3792, county: "Orange County", stateFips: "12", countyFips: "095" },
  { city: "Fort Wayne", state: "IN", lat: 41.0793, lng: -85.1394, county: "Allen County", stateFips: "18", countyFips: "003" },
  { city: "St. Petersburg", state: "FL", lat: 27.7676, lng: -82.6403, county: "Pinellas County", stateFips: "12", countyFips: "103" },
  { city: "Laredo", state: "TX", lat: 27.5306, lng: -99.4803, county: "Webb County", stateFips: "48", countyFips: "479" },
  { city: "Norfolk", state: "VA", lat: 36.8508, lng: -76.2859, county: "Norfolk City", stateFips: "51", countyFips: "710" },
  { city: "Durham", state: "NC", lat: 35.994, lng: -78.8986, county: "Durham County", stateFips: "37", countyFips: "063" },
  { city: "Madison", state: "WI", lat: 43.0731, lng: -89.4012, county: "Dane County", stateFips: "55", countyFips: "025" },
  { city: "Lubbock", state: "TX", lat: 33.5779, lng: -101.8552, county: "Lubbock County", stateFips: "48", countyFips: "303" },
  { city: "Winston-Salem", state: "NC", lat: 36.0999, lng: -80.2442, county: "Forsyth County", stateFips: "37", countyFips: "067" },
  { city: "Garland", state: "TX", lat: 32.9126, lng: -96.6389, county: "Dallas County", stateFips: "48", countyFips: "113" },
  { city: "Glendale", state: "AZ", lat: 33.5387, lng: -112.186, county: "Maricopa County", stateFips: "04", countyFips: "013" },
  { city: "Hialeah", state: "FL", lat: 25.8576, lng: -80.2781, county: "Miami-Dade County", stateFips: "12", countyFips: "086" },
  { city: "Reno", state: "NV", lat: 39.5296, lng: -119.8138, county: "Washoe County", stateFips: "32", countyFips: "031" },
  { city: "Chesapeake", state: "VA", lat: 36.7682, lng: -76.2875, county: "Chesapeake City", stateFips: "51", countyFips: "550" },
  { city: "Irving", state: "TX", lat: 32.814, lng: -96.9489, county: "Dallas County", stateFips: "48", countyFips: "113" },
  { city: "Birmingham", state: "AL", lat: 33.5207, lng: -86.8025, county: "Jefferson County", stateFips: "01", countyFips: "073" },
  { city: "Scottsdale", state: "AZ", lat: 33.4942, lng: -111.9261, county: "Maricopa County", stateFips: "04", countyFips: "013" },
  { city: "Boise", state: "ID", lat: 43.615, lng: -116.2023, county: "Ada County", stateFips: "16", countyFips: "001" },
  { city: "Baton Rouge", state: "LA", lat: 30.4515, lng: -91.1871, county: "East Baton Rouge Parish", stateFips: "22", countyFips: "033" },
  { city: "Richmond", state: "VA", lat: 37.5407, lng: -77.436, county: "Richmond City", stateFips: "51", countyFips: "760" },
  { city: "Des Moines", state: "IA", lat: 41.587, lng: -93.624, county: "Polk County", stateFips: "19", countyFips: "153" },
  { city: "Charleston", state: "SC", lat: 32.7765, lng: -79.9311, county: "Charleston County", stateFips: "45", countyFips: "019" },
  { city: "Providence", state: "RI", lat: 41.824, lng: -71.4128, county: "Providence County", stateFips: "44", countyFips: "007" },
  { city: "Augusta", state: "GA", lat: 33.4735, lng: -82.0105, county: "Richmond County", stateFips: "13", countyFips: "245" },
  { city: "Grand Rapids", state: "MI", lat: 42.9634, lng: -85.6681, county: "Kent County", stateFips: "26", countyFips: "081" },
  { city: "Knoxville", state: "TN", lat: 35.9606, lng: -83.9207, county: "Knox County", stateFips: "47", countyFips: "093" },
  { city: "Springfield", state: "MO", lat: 37.2089, lng: -93.2923, county: "Greene County", stateFips: "29", countyFips: "077" },
  { city: "Huntsville", state: "AL", lat: 34.7304, lng: -86.5861, county: "Madison County", stateFips: "01", countyFips: "089" },
  { city: "Santa Clarita", state: "CA", lat: 34.3917, lng: -118.5426, county: "Los Angeles County", stateFips: "06", countyFips: "037" },
  { city: "Syracuse", state: "NY", lat: 43.0481, lng: -76.1474, county: "Onondaga County", stateFips: "36", countyFips: "067" },
  { city: "Dayton", state: "OH", lat: 39.7589, lng: -84.1916, county: "Montgomery County", stateFips: "39", countyFips: "113" },
  { city: "Worcester", state: "MA", lat: 42.2626, lng: -71.8023, county: "Worcester County", stateFips: "25", countyFips: "027" },
  { city: "Spokane", state: "WA", lat: 47.6588, lng: -117.426, county: "Spokane County", stateFips: "53", countyFips: "063" },
  { city: "Chattanooga", state: "TN", lat: 35.0456, lng: -85.3097, county: "Hamilton County", stateFips: "47", countyFips: "065" },
  { city: "Tallahassee", state: "FL", lat: 30.4383, lng: -84.2807, county: "Leon County", stateFips: "12", countyFips: "073" },
  { city: "Rockford", state: "IL", lat: 42.2711, lng: -89.094, county: "Winnebago County", stateFips: "17", countyFips: "201" },
  { city: "Pasadena", state: "TX", lat: 29.6911, lng: -95.2091, county: "Harris County", stateFips: "48", countyFips: "201" },
  { city: "Bridgeport", state: "CT", lat: 41.1865, lng: -73.1952, county: "Fairfield County", stateFips: "09", countyFips: "001" },
  { city: "Overland Park", state: "KS", lat: 38.9822, lng: -94.6708, county: "Johnson County", stateFips: "20", countyFips: "091" },
  { city: "Sioux Falls", state: "SD", lat: 43.546, lng: -96.7313, county: "Minnehaha County", stateFips: "46", countyFips: "099" },
  { city: "Amarillo", state: "TX", lat: 35.2214, lng: -101.8313, county: "Potter County", stateFips: "48", countyFips: "375" },
  { city: "Ogden", state: "UT", lat: 41.223, lng: -111.9738, county: "Weber County", stateFips: "49", countyFips: "057" },
  { city: "Grand Prairie", state: "TX", lat: 32.7459, lng: -96.9978, county: "Dallas County", stateFips: "48", countyFips: "113" },
  { city: "Cape Coral", state: "FL", lat: 26.5629, lng: -81.9495, county: "Lee County", stateFips: "12", countyFips: "071" },
  { city: "Akron", state: "OH", lat: 41.0814, lng: -81.519, county: "Summit County", stateFips: "39", countyFips: "153" },
  { city: "Murfreesboro", state: "TN", lat: 35.8456, lng: -86.3903, county: "Rutherford County", stateFips: "47", countyFips: "149" },
  { city: "Peoria", state: "AZ", lat: 33.5806, lng: -112.2374, county: "Maricopa County", stateFips: "04", countyFips: "013" },
  { city: "North Las Vegas", state: "NV", lat: 36.1989, lng: -115.1175, county: "Clark County", stateFips: "32", countyFips: "003" },
  { city: "Columbus", state: "GA", lat: 32.461, lng: -84.9877, county: "Muscogee County", stateFips: "13", countyFips: "215" },
  { city: "Port St. Lucie", state: "FL", lat: 27.273, lng: -80.3582, county: "St. Lucie County", stateFips: "12", countyFips: "111" },
  { city: "Gilbert", state: "AZ", lat: 33.3528, lng: -111.789, county: "Maricopa County", stateFips: "04", countyFips: "013" },
  { city: "Rochester", state: "NY", lat: 43.1566, lng: -77.6088, county: "Monroe County", stateFips: "36", countyFips: "055" },
];

const stateAbbr = new Set(CITIES.map(c => c.state));
const cityIndex = new Map<string, CityEntry>();

for (const c of CITIES) {
  const key = `${c.city.toLowerCase()}, ${c.state.toLowerCase()}`;
  cityIndex.set(key, c);
}

export function findCity(city: string, state: string): CityEntry | undefined {
  return cityIndex.get(`${city.toLowerCase()}, ${state.toLowerCase()}`);
}

export function listStates(): string[] {
  return [...stateAbbr].sort();
}

export function searchCities(query: string): { city: string; state: string }[] {
  const q = query.toLowerCase();
  const results: { city: string; state: string }[] = [];
  for (const c of CITIES) {
    if (c.city.toLowerCase().startsWith(q)) {
      results.push({ city: c.city, state: c.state });
    }
    if (results.length >= 10) break;
  }
  return results;
}
