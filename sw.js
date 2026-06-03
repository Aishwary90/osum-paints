const CACHE_NAME = "osum-paints-cache-v9";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./about.html",
  "./services.html",
  "./projects.html",
  "./contact.html",
  "./privacy.html",
  "./terms.html",
  "./warranty.html",
  "./styles.css",
  "./script.js",
  "./assest/osum-paints-jaipur-logo.jpg",
  "./assest/hero-residence.svg",
  "./assest/project-commercial.svg",
  "./assest/project-living-after.svg",
  "./assest/project-living-before.svg",
  "./assest/project-polishing.svg",
  "./assest/project-texture.svg",
  "./assest/project-waterproofing.svg"
];

// Install Event - Pre-cache Shell Assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching shell assets...");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean Up Old Caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Stale-While-Revalidate / Cache-First strategy
self.addEventListener("fetch", (event) => {
  // Only handle GET requests and local/Unsplash/Pexels domains
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      }).catch(() => caches.match(event.request).then((cachedResponse) => cachedResponse || caches.match("./index.html")))
    );
    return;
  }

  // If local assets or external CDN images
  const isCacheableHost =
    url.origin === self.location.origin ||
    url.hostname.includes("images.unsplash.com") ||
    url.hostname.includes("images.pexels.com") ||
    url.hostname.includes("unpkg.com");

  if (isCacheableHost) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Serve from cache, but fetch fresh in background for update
          fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          }).catch(() => { /* Ignore offline fetch errors in background */ });

          return cachedResponse;
        }

        // Fetch from network and cache
        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        }).catch(() => {
          // If offline and request is an HTML page, fallback to index
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
      })
    );
  }
});
