
const CACHE_NAME = "farm-expense-v4";

const APP_FILES = [
  "./index.html",
  "./index1.html",
  "./index2.html",
  "./index3.html",
  "./index4.html",
  "./index5.html",
  "./index6.html",
  "./index7.html",
  "./index8.html",
  "./index9.html",
  "./styles1.css",
  "./styles2.css",
  "./styles3.css",
  "./styles4.css",
  "./styles5.css",
  "./styles6.css",
  "./styles7.css",
  "./styles8.css",
  "./styles9.css",
  "./finance.js",
  "./summary.js",
  "./ai.js",
  "./pwa.js",
  "./redirect.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      await Promise.allSettled(
        APP_FILES.map(async (file) => {
          try {
            await cache.add(file);
          } catch (error) {
            console.warn("Cannot cache:", file, error);
          }
        })
      );

      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();

      await Promise.all(
        keys
          .filter(
            (key) =>
              key.startsWith("farm-expense-") &&
              key !== CACHE_NAME
          )
          .map((key) => caches.delete(key))
      );

      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(async () => {
        return (
          (await caches.match(request)) ||
          (await caches.match("./index1.html")) ||
          Response.error()
        );
      })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return cached || fetch(request);
    })
  );
});
