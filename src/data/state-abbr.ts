const STATE_MAP: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR",
  california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE",
  "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI",
  idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME",
  maryland: "MD", massachusetts: "MA", michigan: "MI", minnesota: "MN",
  mississippi: "MS", missouri: "MO", montana: "MT", nebraska: "NE",
  nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
  "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
  "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA",
  "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};

export function stateAbbr(name: string): string | null {
  return STATE_MAP[name.trim().toLowerCase()] ?? null;
}

const STATE_NAME_MAP = Object.fromEntries(
  Object.entries(STATE_MAP).map(([name, abbreviation]) => [abbreviation, name])
) as Record<string, string>;

export function stateName(abbreviation: string): string | null {
  const name = STATE_NAME_MAP[abbreviation.trim().toUpperCase()];
  if (!name) return null;
  return name.replace(/\b\w/g, (letter) => letter.toUpperCase());
}
