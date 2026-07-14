export interface PagesContext {
  request: Request;
}

interface ProxyErrorOptions {
  code: string;
  message: string;
  provider?: string;
  status: number;
  retryable?: boolean;
  requestId?: string;
}

const UPSTREAM_TIMEOUT_MS = 12_000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const STALE_RETENTION_SECONDS = 24 * 60 * 60;

export function jsonError(options: ProxyErrorOptions): Response {
  return Response.json(
    {
      error: {
        code: options.code,
        message: options.message,
        provider: options.provider ?? null,
        retryable: options.retryable ?? false,
        requestId: options.requestId ?? null,
      },
    },
    {
      status: options.status,
      headers: { "Cache-Control": "no-store" },
    }
  );
}

function staleKey(request: Request): Request {
  const url = new URL(request.url);
  url.searchParams.set("__openrisk_stale", "1");
  return new Request(url, { method: "GET" });
}

function withCacheMetadata(
  response: Response,
  cacheStatus: "hit" | "miss" | "stale",
  requestId: string
): Response {
  const result = new Response(response.body, response);
  result.headers.set("X-OpenRisk-Cache", cacheStatus);
  result.headers.set("X-OpenRisk-Request-Id", requestId);
  if (cacheStatus === "stale") {
    result.headers.set("Warning", '110 - "Response is stale because the provider is unavailable"');
  }
  return result;
}

async function staleOrError(
  cache: Cache,
  request: Request,
  provider: string,
  requestId: string,
  message: string
): Promise<Response> {
  const stale = await cache.match(staleKey(request));
  if (stale) return withCacheMetadata(stale, "stale", requestId);
  return jsonError({
    code: "UPSTREAM_UNAVAILABLE",
    message,
    provider,
    status: 502,
    retryable: true,
    requestId,
  });
}

export async function cachedPublicProxy(
  request: Request,
  upstream: URL,
  maxAgeSeconds: number,
  accept: string,
  provider = upstream.hostname
): Promise<Response> {
  const requestId = crypto.randomUUID();
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return withCacheMetadata(cached, "hit", requestId);

  let response: Response;
  try {
    response = await fetch(upstream.toString(), {
      headers: {
        Accept: accept,
        "User-Agent": "OpenRisk-Radar/1.0 (+https://openriskradar.com)",
      },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return staleOrError(
      cache,
      request,
      provider,
      requestId,
      timedOut ? "The provider timed out" : "The provider could not be reached"
    );
  }

  if (!response.ok) {
    return staleOrError(
      cache,
      request,
      provider,
      requestId,
      `The provider returned HTTP ${response.status}`
    );
  }

  const declaredSize = Number(response.headers.get("content-length") ?? 0);
  if (declaredSize > MAX_RESPONSE_BYTES) {
    return jsonError({
      code: "UPSTREAM_RESPONSE_TOO_LARGE",
      message: "The provider response exceeded the OpenRisk safety limit",
      provider,
      status: 502,
      retryable: true,
      requestId,
    });
  }

  const body = await response.arrayBuffer();
  if (body.byteLength > MAX_RESPONSE_BYTES) {
    return jsonError({
      code: "UPSTREAM_RESPONSE_TOO_LARGE",
      message: "The provider response exceeded the OpenRisk safety limit",
      provider,
      status: 502,
      retryable: true,
      requestId,
    });
  }

  const fetchedAt = new Date().toISOString();
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", `public, max-age=${Math.min(maxAgeSeconds, 300)}, s-maxage=${maxAgeSeconds}`);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-OpenRisk-Fetched-At", fetchedAt);
  headers.set("X-OpenRisk-Provider", provider);
  const proxied = new Response(body, { status: response.status, headers });

  const staleHeaders = new Headers(headers);
  staleHeaders.set("Cache-Control", `public, max-age=0, s-maxage=${STALE_RETENTION_SECONDS}`);
  const staleCopy = new Response(body.slice(0), { status: response.status, headers: staleHeaders });
  await Promise.all([
    cache.put(cacheKey, proxied.clone()),
    cache.put(staleKey(request), staleCopy),
  ]);
  return withCacheMetadata(proxied, "miss", requestId);
}
