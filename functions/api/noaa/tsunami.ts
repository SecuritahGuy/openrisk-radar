import { cachedPublicProxy, jsonError, type PagesContext } from "../../_shared/proxy";
import { parseNoaaTsunamiJson } from "../../../src/lib/noaaTsunamiJson";

const UPSTREAM = "https://www.tsunami.gov/php/esri.php?a=t&format=json";

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  const upstreamResponse = await cachedPublicProxy(
    request,
    new URL(UPSTREAM),
    60,
    "text/plain",
    "NOAA Tsunami"
  );
  if (!upstreamResponse.ok) return upstreamResponse;

  try {
    const data = parseNoaaTsunamiJson(await upstreamResponse.text());
    const headers = new Headers(upstreamResponse.headers);
    headers.set("Content-Type", "application/json; charset=utf-8");
    headers.set("Cache-Control", "public, max-age=30, s-maxage=60");
    return Response.json(data, { headers });
  } catch {
    return jsonError({
      code: "INVALID_UPSTREAM_RESPONSE",
      message: "Unable to parse the NOAA tsunami response",
      provider: "NOAA Tsunami",
      status: 502,
      retryable: true,
    });
  }
}
