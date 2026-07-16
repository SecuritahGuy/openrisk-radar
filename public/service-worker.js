const CACHE_NAME = "openrisk-shell-v3";
const SHELL = ["/app", "/manifest.webmanifest", "/favicon.svg", "/apple-touch-icon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      }).catch(async () => {
        const exact = await caches.match(request);
        if (exact) return exact;
        if (url.pathname === "/app") return caches.match("/app");
        return new Response(
          "This page is not available offline. Reconnect to view public content, or open a previously cached page.",
          { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
        );
      })
    );
    return;
  }

  if (url.pathname.startsWith("/assets/") || SHELL.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        return response;
      }))
    );
  }
});

async function locationLabel(watchId) {
  if (!watchId || !("indexedDB" in self)) return null;
  return new Promise((resolve) => {
    const request = indexedDB.open("OpenRiskRadar");
    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("locations")) {
        database.close();
        resolve(null);
        return;
      }
      const transaction = database.transaction("locations", "readonly");
      const cursorRequest = transaction.objectStore("locations").openCursor();
      cursorRequest.onerror = () => resolve(null);
      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (!cursor) {
          database.close();
          resolve(null);
          return;
        }
        if (cursor.value?.cloudWatch?.id === watchId) {
          const label = typeof cursor.value.label === "string" ? cursor.value.label : null;
          database.close();
          resolve(label);
          return;
        }
        cursor.continue();
      };
    };
  });
}

self.addEventListener("push", (event) => {
  event.waitUntil((async () => {
    let payload = {};
    try {
      payload = event.data?.json() ?? {};
    } catch {
      payload = { body: event.data?.text() };
    }
    const label = await locationLabel(payload.data?.watchId);
    const body = label && payload.body ? `${label}: ${payload.body}` : payload.body;
    await self.registration.showNotification(payload.title || "OpenRisk Radar", {
      body: body || "A watched-location update is ready.",
      icon: "/apple-touch-icon.png",
      badge: "/apple-touch-icon.png",
      tag: payload.tag || "openrisk-update",
      renotify: true,
      data: payload.data || { url: "/app" },
    });
    if ("setAppBadge" in self.navigator) {
      await self.navigator.setAppBadge(1).catch(() => undefined);
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    if ("clearAppBadge" in self.navigator) {
      await self.navigator.clearAppBadge().catch(() => undefined);
    }
    const destination = new URL(event.notification.data?.url || "/app", self.location.origin).href;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin !== self.location.origin) continue;
      if ("navigate" in client) await client.navigate(destination);
      await client.focus();
      return;
    }
    await self.clients.openWindow(destination);
  })());
});
