export interface PagesContext {
  request: Request;
}

export async function cachedPublicProxy(
  request: Request,
  upstream: URL,
  maxAgeSeconds: number,
  accept: string
): Promise<Response> {
  const cache = caches.default;
  const cacheKey = new Request(request.url, { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const response = await fetch(upstream.toString(), {
    headers: {
      Accept: accept,
      "User-Agent": "OpenRisk-Radar/1.0 (+https://openriskradar.com)",
    },
  });

  if (!response.ok) {
    return new Response(`Upstream service returned ${response.status}`, {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const proxied = new Response(response.body, response);
  proxied.headers.set(
    "Cache-Control",
    `public, max-age=${Math.min(maxAgeSeconds, 300)}, s-maxage=${maxAgeSeconds}`
  );
  proxied.headers.set("X-Content-Type-Options", "nosniff");
  await cache.put(cacheKey, proxied.clone());
  return proxied;
}
