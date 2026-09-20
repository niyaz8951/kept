/* Offline-first service worker: the whole app shell is cached, so it opens like a native app. */
const V = "mw-v1";
const SHELL = [
 "./","./index.html","./css/app.css","./manifest.webmanifest","./config.js",
 "./vendor/xlsx.full.min.js","./vendor/chart.umd.js","./vendor/supabase.js",
 "./js/store.js","./js/core.js","./js/render.js","./js/render2.js","./js/deck.js",
 "./js/quickadd.js","./js/life.js","./js/analysis.js","./js/sync.js","./js/app.js",
 "./icons/icon-192.png","./icons/icon-512.png"
];
self.addEventListener("install", e => {
 e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
 e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
 if (e.request.method !== "GET") return;
 const url = new URL(e.request.url);
 if (url.origin !== location.origin) return;          // never cache Supabase API calls
 e.respondWith(
  caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
   const copy = res.clone();
   caches.open(V).then(c => c.put(e.request, copy));
   return res;
  }).catch(() => caches.match("./index.html")))
 );
});
