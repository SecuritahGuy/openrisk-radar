// EXPERIMENT ONLY — not imported by the OpenRiskRadar web app.
// Registry of US state traffic sources. Entries are intentionally sparse and
// research-grade; they describe what each state exposes and how to reach it.
// This is NOT the source of truth for participating states — WZDx registry is.

export type TrafficSourceFormat =
  | "wzdx"
  | "tdx"
  | "json"
  | "xml"
  | "geojson"
  | "arcgis-feature-service"
  | "rss"
  | "kml";

export type TrafficCapability =
  | "incidents"
  | "closures"
  | "construction"
  | "road-weather"
  | "travel-times"
  | "traffic-flow"
  | "cameras"
  | "truck-restrictions";

export interface StateTrafficSource {
  id: string;
  state: string;
  authority: string;
  format: TrafficSourceFormat;
  capabilities: TrafficCapability[];
  endpoint: string;
  authentication: "none" | "api-key" | "registration";
  proxyRequired: boolean;
  attribution: string;
  refreshSeconds: number;
}

export const STATE_TRAFFIC_SOURCES: Record<string, StateTrafficSource[]> = {
  WA: [
    {
      id: "wsdot-highway-alerts",
      state: "WA",
      authority: "Washington State Department of Transportation",
      format: "json",
      capabilities: ["incidents", "closures", "construction", "road-weather", "travel-times", "traffic-flow", "cameras", "truck-restrictions"],
      endpoint: "https://wsdot.wa.gov/traffic/api/TravelerInfoREST.svc/GETAlertsAsJson",
      authentication: "api-key",
      proxyRequired: true,
      attribution: "Washington State Department of Transportation",
      refreshSeconds: 90,
    },
  ],
  WI: [
    {
      id: "wisconsin-511",
      state: "WI",
      authority: "Wisconsin Department of Transportation",
      format: "xml",
      capabilities: ["incidents", "closures", "construction", "cameras"],
      endpoint: "https://511wi.gov/api/events",
      authentication: "registration",
      proxyRequired: true,
      attribution: "Wisconsin Department of Transportation",
      refreshSeconds: 90,
    },
  ],
  IL: [
    {
      id: "illinois-arcgis",
      state: "IL",
      authority: "Illinois Department of Transportation",
      format: "arcgis-feature-service",
      capabilities: ["incidents", "closures", "construction", "road-weather"],
      endpoint: "https://idot.illinois.gov/arcgis/rest/services",
      authentication: "none",
      proxyRequired: false,
      attribution: "Illinois Department of Transportation",
      refreshSeconds: 120,
    },
  ],
};

export function getStateTrafficSources(state: string): StateTrafficSource[] {
  return STATE_TRAFFIC_SOURCES[state.toUpperCase()] ?? [];
}
