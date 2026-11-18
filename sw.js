// MAREA · service worker: permite instalar la app y abrirla aunque falle la red.
// Siempre intenta traer la versión más nueva; si no hay internet, usa la guardada.
const CACHE = "marea-v3";
const SHELL = ["./", "index.html", "css/app.css?v=3", "js/app.js?v=3", "js/config.js?v=3", "js/valoracion.js", "js/vendor/supabase-2.118.0.js", "manifest.webmanifest", "icons/icon-192.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // Supabase y fuentes: directo a la red
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
      return res;
    }).catch(() => caches.match(e.request, { ignoreSearch: e.request.mode === "navigate" }).then(r => r || caches.match("index.html")))
  );
});
