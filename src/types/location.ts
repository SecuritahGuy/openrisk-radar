export type InputType = "zip" | "city_state";

export type Criticality = "Low" | "Medium" | "High";

export type LocationType = "Office" | "Supplier" | "Data Center" | "Travel" | "Facility" | "Custom";

export interface Location {
  id: string;
  label: string;
  input: string;
  inputType: InputType;
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  latitude: number;
  longitude: number;
  county: string | null;
  stateFips: string | null;
  countyFips: string | null;
  radiusMiles: number;
  criticality: Criticality;
  locationType: LocationType;
  tags: string[];
  createdAt: string;
  lastCheckedAt: string;
}

export interface LocationInput {
  raw: string;
  parsed: {
    type: InputType;
    city?: string;
    state?: string;
    zip?: string;
    display: string;
  };
}

export interface ResolvedLocation {
  city: string;
  state: string;
  postalCode: string | null;
  country: string;
  latitude: number;
  longitude: number;
  county: string | null;
  stateFips: string | null;
  countyFips: string | null;
}

export type RadiusOption = 10 | 25 | 50 | 100;
