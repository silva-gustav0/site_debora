// Guarda no aparelho só arquivos imutáveis (código com hash, fontes, ícones); páginas e dados sempre vêm da rede.
const CACHE = "debora-arquivos-v1";
const LIMIT = 300;
const cacheable = (url) => url.origin === self.location.origin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/app/icon") || url.pathname.startsWith("/images/"));

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || !cacheable(url)) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(e.request);
    if (hit) return hit;
    const res = await fetch(e.request);
    if (res.ok && res.type === "basic") {
      await cache.put(e.request, res.clone());
      const keys = await cache.keys();
      for (const k of keys.slice(0, Math.max(0, keys.length - LIMIT))) await cache.delete(k);
    }
    return res;
  })());
});
