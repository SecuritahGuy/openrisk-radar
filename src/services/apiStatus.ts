import { readJsonResponse } from "../lib/http";

export interface ApiStatus {
  service: string;
  version: string;
  status: "operational";
  checkedAt: string;
  sources: Array<{
    id: string;
    label: string;
    route: string;
    cacheSeconds: number;
  }>;
}

export async function fetchApiStatus(): Promise<ApiStatus> {
  const response = await fetch("/api/status", {
    headers: { Accept: "application/json" },
  });
  return readJsonResponse<ApiStatus>(response, "OpenRisk API");
}
