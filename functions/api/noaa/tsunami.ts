import { cachedPublicProxy, type PagesContext } from "../../_shared/proxy";

const UPSTREAM = "https://www.tsunami.gov/php/esri.php?a=t&format=json";

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  const upstreamResponse = await cachedPublicProxy(
    request,
    new URL(UPSTREAM),
    60,
    "text/plain"
  );
  if (!upstreamResponse.ok) return upstreamResponse;

  try {
    const text = (await upstreamResponse.text()).trim()
      .replace(/^\(/, "")
      .replace(/\);?$/, "")
      .replace(/,\s*([}\]])/g, "$1");
    const data = JSON.parse(text);
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=30, s-maxage=60" },
    });
  } catch {
    return new Response("Unable to parse NOAA tsunami response", { status: 502 });
  }
}
