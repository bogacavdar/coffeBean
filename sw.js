// sw.js – §12 uygulama olarak yükleme (PWA): çevrimdışı yedek; HER ZAMAN önce ağdan en yeni sürüm (eski sürüm takılı kalmaz)
const CACHE = "coffebean-runtime";
self.addEventListener("install", e => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req, { cache: "no-store" }).then(res => {
    if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match("./index.html"))));
});
