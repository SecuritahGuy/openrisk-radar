import { cachedPublicProxy, type PagesContext } from "../../_shared/proxy";

const BASE = "https://api.water.noaa.gov/nwps/v1";

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  const incoming = new URL(request.url);
  const path = incoming.searchParams.get("path") ?? "";
  if (!/^\/gauges(?:\?|\/[A-Za-z0-9_-]+\/stageflow$)/.test(path)) {
    return new Response("Invalid NWPS path", { status: 400 });
  }
  const upstream = new URL(`${BASE}${path}`);
  return cachedPublicProxy(request, upstream, 900, "application/json");
}
