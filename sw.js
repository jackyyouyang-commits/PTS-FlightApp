/* PTS Flight App service worker - offline cache */
var CACHE = 'pts-flightapp-v9';
var ASSETS = [
  './',
  './PTS_FlightApp.html',
  './manifest.webmanifest',
  './pts-icon.svg',
  './pts-icon-180.png',
  './pts-icon-192.png',
  './pts-icon-512.png',
  './pts-icon-maskable-512.png',
  './lz-string.min.js',
  './qrcode.min.js',
  './jsqr.js'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(ASSETS); }).then(function() { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) { if (k !== CACHE) return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  var isAppDocument = e.request.mode === 'navigate' || url.pathname.endsWith('/PTS_FlightApp.html');

  if (isAppDocument) {
    e.respondWith(
      fetch(e.request).then(function(resp) {
        if (resp && resp.status === 200 && e.request.url.indexOf(self.location.origin) === 0) {
          var copy = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function() {
        return caches.match(e.request, { ignoreSearch: true });
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function(cached) {
      return cached || fetch(e.request).then(function(resp) {
        // cache a copy for offline
        if (resp && resp.status === 200 && e.request.url.indexOf(self.location.origin) === 0) {
          var copy = resp.clone();
          caches.open(CACHE).then(function(c) { c.put(e.request, copy); });
        }
        return resp;
      }).catch(function() { return cached; });
    })
  );
});
