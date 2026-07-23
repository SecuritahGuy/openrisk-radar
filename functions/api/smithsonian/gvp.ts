import { cachedPublicProxy, jsonError, type PagesContext } from "../../_shared/proxy";

const UPSTREAM = "https://webservices.volcano.si.edu/geoserver/GVP-VOTW/wfs";
const TYPE_NAME = "GVP-VOTW:Smithsonian_VOTW_Holocene_Volcanoes";
const MAX_SPAN_DEGREES = 10;

export function buildGvpUpstreamUrl(requestUrl: string): URL | null {
  const requested = new URL(requestUrl);
  const bbox = requested.searchParams.get("bbox")?.split(",").map(Number);
  if (!bbox || bbox.length !== 4 || bbox.some((value) => !Number.isFinite(value))) {
    return null;
  }
  const [minLatitude, minLongitude, maxLatitude, maxLongitude] = bbox;
  if (
    minLatitude < -90 ||
    maxLatitude > 90 ||
    minLatitude >= maxLatitude ||
    minLongitude < -180 ||
    maxLongitude > 180 ||
    minLongitude >= maxLongitude ||
    maxLatitude - minLatitude > MAX_SPAN_DEGREES ||
    maxLongitude - minLongitude > MAX_SPAN_DEGREES
  ) {
    return null;
  }

  const upstream = new URL(UPSTREAM);
  upstream.searchParams.set("service", "WFS");
  upstream.searchParams.set("version", "2.0.0");
  upstream.searchParams.set("request", "GetFeature");
  upstream.searchParams.set("typeNames", TYPE_NAME);
  upstream.searchParams.set("outputFormat", "application/json");
  // WFS 2.0 uses EPSG:4326 axis order (latitude, longitude).
  upstream.searchParams.set("bbox", bbox.join(","));
  return upstream;
}

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  const upstream = buildGvpUpstreamUrl(request.url);
  if (!upstream) {
    return jsonError({
      code: "INVALID_QUERY",
      message: "A valid Smithsonian GVP latitude/longitude bounding box is required",
      provider: "Smithsonian GVP",
      status: 400,
    });
  }
  return cachedPublicProxy(
    request,
    upstream,
    86_400,
    "application/json",
    "Smithsonian GVP"
  );
}
