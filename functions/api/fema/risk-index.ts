import { cachedPublicProxy, type PagesContext } from "../../_shared/proxy";

const UPSTREAM = "https://services.arcgis.com/XG15cJAlne2vxtgt/arcgis/rest/services/National_Risk_Index_Counties/FeatureServer/0/query";

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  const incoming = new URL(request.url);
  const where = incoming.searchParams.get("where") ?? "";
  if (!/^STCOFIPS='\d{5}'$/.test(where)) {
    return new Response("Invalid county FIPS", { status: 400 });
  }
  const upstream = new URL(UPSTREAM);
  upstream.searchParams.set("where", where);
  upstream.searchParams.set("outFields", "*");
  upstream.searchParams.set("resultRecordCount", "1");
  upstream.searchParams.set("f", "json");
  return cachedPublicProxy(request, upstream, 86_400, "application/json");
}
