import type { ResolvedLocation, RadiusOption } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import { isCurrentImpact } from "./impactInsights";

export function scopedNwsAlerts({
  pointAlerts,
  statewideAlerts,
  location,
  radius,
}: {
  pointAlerts: RiskEvent[];
  statewideAlerts: RiskEvent[];
  location: ResolvedLocation | null;
  radius: RadiusOption;
}): RiskEvent[] {
  const scoped = new Map<string, RiskEvent>();

  for (const event of pointAlerts) {
    scoped.set(event.sourceEventId, event);
  }

  for (const event of statewideAlerts) {
    if (isCurrentImpact(event, location, radius) && !scoped.has(event.sourceEventId)) {
      scoped.set(event.sourceEventId, event);
    }
  }

  return [...scoped.values()];
}
