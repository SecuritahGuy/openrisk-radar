import { cachedPublicProxy, type PagesContext } from "../../_shared/proxy";

const UPSTREAM = "https://incidents.fire.ca.gov/umbraco/api/incidentapi/List";

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  return cachedPublicProxy(
    request,
    new URL(UPSTREAM),
    120,
    "application/json",
    "CAL FIRE"
  );
}
