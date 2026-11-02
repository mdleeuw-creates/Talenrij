// Talenrij service worker: app shell precached, everything served cache-first and refreshed in the background.
// Bump VERSION whenever index.html changes so phones pick up the new version.
const VERSION = "talenrij-v3";
const SHELL = ["./", "index.html", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "icons/apple-touch-icon.png", "icons/favicon-32.png"];
const FONTS = "talenrij-fonts";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// stale-while-revalidate: answer from cache at once, fetch a fresh copy for next time
function swr(req, cacheName, key) {
  return caches.open(cacheName).then(async cache => {
    const hit = await cache.match(key || req);
    const fresh = fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) cache.put(key || req, res.clone());
      return res;
    }).catch(() => hit);
    return hit || fresh;
  });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    e.respondWith(swr(req, FONTS));
  } else if (url.origin === location.origin) {
    // every page navigation gets the one app page
    e.respondWith(swr(req, VERSION, req.mode === "navigate" ? "index.html" : undefined));
  }
});
