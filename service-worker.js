const CACHE_VERSION = "omp-v20260305v1-1";
const HTML_CACHE = CACHE_VERSION + "-html";
const STATIC_CACHE = CACHE_VERSION + "-static";

const PRECACHE_URLS = [
  "/",
  "/tools/",
  "/tools/password-checker/",
  "/tools/passphrase-generator/",
  "/tools/breach-response-planner/",
  "/tools/recovery-hardening/",
  "/tools/passkey-readiness/",
  "/tools/phishing-reset-safety/",
  "/tools/account-priority-matrix/",
  "/tools/mfa-method-selector/",
  "/tools/phishing-message-triage/",
  "/tools/public-wifi-safety-planner/",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/favicon-48x48.png",
  "/apple-touch-icon.png",
  "/assets/css/tokens.css?v=20260228v4",
  "/assets/css/layout.css?v=20260228v4",
  "/assets/css/tools.css?v=20260228v4",
  "/assets/css/app.css?v=20260228v4",
  "/assets/css/content.css?v=20260228v4",
  "/assets/js/app.js?v=20260220v3",
  "/assets/js/tools/hub.js?v=20260305v1",
  "/assets/js/tools/password-checker.js?v=20260228v3",
  "/assets/js/tools/passphrase-generator.js?v=20260228v3",
  "/assets/js/tools/breach-response-planner.js?v=20260228v3",
  "/assets/js/tools/recovery-hardening.js?v=20260228v3",
  "/assets/js/tools/passkey-readiness.js?v=20260228v3",
  "/assets/js/tools/phishing-reset-safety.js?v=20260228v3",
  "/assets/js/tools/account-priority-matrix.js?v=20260228v3",
  "/assets/js/tools/mfa-method-selector.js?v=20260305v1",
  "/assets/js/tools/phishing-message-triage.js?v=20260305v1",
  "/assets/js/tools/public-wifi-safety-planner.js?v=20260305v1",
  "/assets/js/theme.js?v=20260228v4",
  "/assets/js/tools/core/contracts.js",
  "/assets/js/tools/core/util.js",
  "/assets/js/tools/core/export.js",
  "/assets/js/tools/core/password-adapter.js",
  "/assets/js/password-core.js?v=20260220v3",
  "/assets/js/firebase-init.js?v=20260220v3",
  "/assets/js/pwa-install.js?v=20260220v3",
  "/assets/fonts/source-sans-3-latin.woff2",
  "/assets/fonts/space-grotesk-latin.woff2",
  "/assets/img/og-cover.svg",
  "/assets/img/icons/icon-192.png",
  "/assets/img/icons/icon-512.png",
  "/assets/img/icons/icon-16.png",
  "/assets/img/icons/icon-32.png",
  "/assets/img/icons/icon-192-maskable.png",
  "/assets/img/icons/icon-512-maskable.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(function (cache) {
      return cache.addAll(PRECACHE_URLS);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys.map(function (key) {
          if (!key.startsWith(CACHE_VERSION)) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);

  const networkFetch = fetch(request).then(function (response) {
    if (response && response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }).catch(function () {
    return undefined;
  });

  return cached || networkFetch || Response.error();
}

async function networkFirstNavigation(request) {
  const htmlCache = await caches.open(HTML_CACHE);

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      htmlCache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cachedResponse = await htmlCache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const cachedHome = await caches.match("/");
    if (cachedHome) {
      return cachedHome;
    }

    const offlineFallback = await caches.match("/offline.html");
    if (offlineFallback) {
      return offlineFallback;
    }

    return Response.error();
  }
}

self.addEventListener("fetch", function (event) {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(event.request));
    return;
  }

  if (requestUrl.pathname.startsWith("/assets/") || requestUrl.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(event.request));
  }
});


