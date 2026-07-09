export type ImpactLevel = "Low" | "Moderate" | "High" | "Critical";
export type MatchMethod = "within_radius" | "contains_location" | "admin_match";

export interface ImpactResult {
  locationId: string;
  eventId: string;
  distanceMiles: number | null;
  matchMethod: MatchMethod;
  impactLevel: ImpactLevel;
  reason: string;
}
