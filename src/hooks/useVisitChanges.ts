import { useEffect, useRef, useState } from "react";
import type { ResolvedLocation } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import {
  compareVisitSnapshots,
  createVisitSnapshot,
  type VisitChangeSummary,
  type VisitSnapshot,
} from "../lib/visitChanges";

const STORAGE_KEY = "openrisk:visit-snapshots:v1";

export interface VisitChangesResult extends VisitChangeSummary {
  ready: boolean;
  firstVisit: boolean;
}

const EMPTY_RESULT: VisitChangesResult = {
  ready: false,
  firstVisit: false,
  newCount: 0,
  escalatedCount: 0,
  updatedCount: 0,
  resolvedCount: 0,
};

function locationKey(location: ResolvedLocation): string {
  return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
}

function readSnapshots(): Record<string, VisitSnapshot> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, VisitSnapshot>;
  } catch {
    return {};
  }
}

export function useVisitChanges(
  location: ResolvedLocation | null,
  events: RiskEvent[],
  isFetching: boolean
): VisitChangesResult {
  const [result, setResult] = useState<VisitChangesResult>(EMPTY_RESULT);
  const [resultKey, setResultKey] = useState<string | null>(null);
  const processedLocation = useRef<string | null>(null);

  useEffect(() => {
    if (!location || isFetching) return;
    const key = locationKey(location);
    if (processedLocation.current === key) return;

    const snapshots = readSnapshots();
    const previous = snapshots[key];
    const current = createVisitSnapshot(events);
    setResult({
      ready: true,
      firstVisit: previous == null,
      ...(previous
        ? compareVisitSnapshots(previous, current)
        : { newCount: 0, escalatedCount: 0, updatedCount: 0, resolvedCount: 0 }),
    });
    setResultKey(key);
    snapshots[key] = current;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
    } catch {
      // Change tracking is optional when browser storage is unavailable.
    }
    processedLocation.current = key;
  }, [events, isFetching, location]);

  return location && resultKey === locationKey(location) ? result : EMPTY_RESULT;
}
