import type { RiskEvent, Severity } from "../types/riskEvent";
import { severityRank } from "./riskInsights";

export interface EventCluster {
  id: string;
  latitude: number;
  longitude: number;
  events: RiskEvent[];
}

export type EventPointLayer = RiskEvent | EventCluster;

export function clusterCellDegrees(zoom: number): number | null {
  if (zoom >= 11) return null;
  if (zoom >= 9) return 0.55;
  if (zoom >= 7) return 1.1;
  if (zoom >= 5) return 2.4;
  return 5.2;
}

export function clusterPointEvents(
  events: RiskEvent[],
  zoom: number
): EventPointLayer[] {
  const cell = clusterCellDegrees(zoom);
  if (!cell) return events;

  const groups = new Map<string, RiskEvent[]>();
  for (const event of events) {
    if (event.latitude == null || event.longitude == null) continue;
    const key = `${Math.round(event.latitude / cell)}:${Math.round(event.longitude / cell)}`;
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }

  const layers: EventPointLayer[] = [];
  for (const [key, group] of groups.entries()) {
    if (group.length < 2) {
      layers.push(...group);
      continue;
    }

    const latitude =
      group.reduce((sum, event) => sum + (event.latitude ?? 0), 0) / group.length;
    const longitude =
      group.reduce((sum, event) => sum + (event.longitude ?? 0), 0) / group.length;
    layers.push({ id: key, latitude, longitude, events: group });
  }

  return layers;
}

export function topClusterSeverity(events: RiskEvent[]): Severity {
  return events.reduce(
    (top, event) =>
      severityRank(event.severity) > severityRank(top) ? event.severity : top,
    events[0]?.severity ?? "Minor"
  );
}

export function isEventCluster(item: EventPointLayer): item is EventCluster {
  return "events" in item;
}
