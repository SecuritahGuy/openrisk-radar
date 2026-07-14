import { useEffect, useState } from "react";
import type { ResolvedLocation } from "../types/location";
import type { RiskEvent } from "../types/riskEvent";
import { activeConcernEvents, buildRiskSummary, severityRank } from "../lib/riskInsights";

const STORAGE_KEY = "openrisk:offline-snapshots:v1";

interface OfflineSnapshot {
  savedAt: string;
  level: ReturnType<typeof buildRiskSummary>["level"];
  activeCount: number;
  headlines: string[];
}

function keyFor(location: ResolvedLocation): string {
  return `${location.latitude.toFixed(3)},${location.longitude.toFixed(3)}`;
}

function readAll(): Record<string, OfflineSnapshot> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, OfflineSnapshot>;
  } catch {
    return {};
  }
}

export function useOfflineSnapshot(
  location: ResolvedLocation | null,
  events: RiskEvent[],
  isFetching: boolean
) {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!online || !location || isFetching) return;
    const concerns = activeConcernEvents(events);
    const risk = buildRiskSummary(concerns);
    const all = readAll();
    all[keyFor(location)] = {
      savedAt: new Date().toISOString(),
      level: risk.level,
      activeCount: concerns.length,
      headlines: [...concerns]
        .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
        .slice(0, 3)
        .map((event) => event.headline),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch {
      // Offline summaries are optional when browser storage is unavailable.
    }
  }, [events, isFetching, location, online]);

  const snapshot = location ? readAll()[keyFor(location)] ?? null : null;
  return { online, snapshot };
}
