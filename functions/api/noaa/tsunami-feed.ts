import { cachedPublicProxy, jsonError, type PagesContext } from "../../_shared/proxy";

const FEEDS = {
  ntwc: "https://www.tsunami.gov/events/xml/PAAQAtom.xml",
  ptwc: "https://www.tsunami.gov/events/xml/PHEBAtom.xml",
} as const;

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  const requestUrl = new URL(request.url);
  const center = requestUrl.searchParams.get("center");
  if (center !== "ntwc" && center !== "ptwc") {
    return jsonError({
      code: "INVALID_CENTER",
      message: "center must be ntwc or ptwc",
      provider: "NOAA Tsunami",
      status: 400,
    });
  }

  return cachedPublicProxy(
    request,
    new URL(FEEDS[center]),
    60,
    "application/atom+xml, application/xml, text/xml",
    `NOAA ${center.toUpperCase()} Atom`
  );
}
