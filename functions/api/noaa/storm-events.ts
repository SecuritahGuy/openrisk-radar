import { cachedPublicProxy, type PagesContext } from "../../_shared/proxy";

const UPSTREAM = "https://www.ncei.noaa.gov/stormevents/csv";
const ALLOWED = new Set([
  "eventType", "beginDate_mm", "beginDate_dd", "beginDate_yyyy",
  "endDate_mm", "endDate_dd", "endDate_yyyy", "hailfilter", "tornfilter",
  "windfilter", "sort", "submitbutton", "statefips", "county",
]);

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  const incoming = new URL(request.url);
  const upstream = new URL(UPSTREAM);
  for (const [key, value] of incoming.searchParams) {
    if (ALLOWED.has(key)) upstream.searchParams.append(key, value);
  }
  if (!upstream.searchParams.has("statefips") || !upstream.searchParams.has("county")) {
    return new Response("Missing state or county", { status: 400 });
  }
  return cachedPublicProxy(request, upstream, 86_400, "text/csv");
}
