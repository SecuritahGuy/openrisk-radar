import { cachedPublicProxy, jsonError, type PagesContext } from "../_shared/proxy";

const UPSTREAM = "https://www.seismicportal.eu/fdsnws/event/1/query";
const PARAMS = [
  "format",
  "minlatitude",
  "maxlatitude",
  "minlongitude",
  "maxlongitude",
  "minmagnitude",
  "limit",
] as const;

function finiteParam(params: URLSearchParams, name: string): number | null {
  const value = Number(params.get(name));
  return Number.isFinite(value) ? value : null;
}

export function buildEmscUpstreamUrl(requestUrl: string): URL | null {
  const requested = new URL(requestUrl);
  const minLatitude = finiteParam(requested.searchParams, "minlatitude");
  const maxLatitude = finiteParam(requested.searchParams, "maxlatitude");
  const minLongitude = finiteParam(requested.searchParams, "minlongitude");
  const maxLongitude = finiteParam(requested.searchParams, "maxlongitude");
  const minMagnitude = finiteParam(requested.searchParams, "minmagnitude");
  const limit = finiteParam(requested.searchParams, "limit");

  if (
    minLatitude === null || maxLatitude === null || minLatitude < -90 || maxLatitude > 90 || minLatitude > maxLatitude ||
    minLongitude === null || maxLongitude === null || minLongitude < -180 || maxLongitude > 180 || minLongitude > maxLongitude ||
    minMagnitude === null || minMagnitude < 0 || minMagnitude > 10 ||
    limit === null || !Number.isInteger(limit) || limit < 1 || limit > 200
  ) return null;

  const upstream = new URL(UPSTREAM);
  for (const param of PARAMS) {
    const value = requested.searchParams.get(param);
    if (value !== null) upstream.searchParams.set(param, value);
  }
  upstream.searchParams.set("format", "json");
  return upstream;
}

export async function onRequestGet({ request }: PagesContext): Promise<Response> {
  const upstream = buildEmscUpstreamUrl(request.url);
  if (!upstream) {
    return jsonError({
      code: "INVALID_QUERY",
      message: "Valid EMSC bounds, magnitude, and limit parameters are required",
      provider: "EMSC",
      status: 400,
    });
  }
  return cachedPublicProxy(request, upstream, 60, "application/json", "EMSC");
}
