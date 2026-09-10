/* Only Fast QR beta caches and known assets are owned by this worker. */
var CACHE = 'pts-flightapp-fastqr-beta-v122-3';
var PREFIX = 'pts-flightapp-fastqr-beta-';
var ASSETS = [
  './PTS_FlightApp.html', './fast-qr.js', './manifest.webmanifest',
  '../pts-icon.svg', '../pts-icon-180.png', '../pts-icon-192.png',
  '../pts-icon-512.png', '../pts-icon-maskable-512.png',
  '../lz-string.min.js', '../qrcode.min.js', '../jsqr.js'
];
self.addEventListener('install', function(event) {
  event.waitUntil(caches.open(CACHE).then(function(cache) {
    return cache.addAll(ASSETS);
  }).then(function() { return self.skipWaiting(); }));
});
self.addEventListener('activate', function(event) {
  event.waitUntil(caches.keys().then(function(keys) {
    return Promise.all(keys.filter(function(key) {
      return key.indexOf(PREFIX) === 0 && key !== CACHE;
    }).map(function(key) { return caches.delete(key); }));
  }).then(function() { return self.clients.claim(); }));
});
self.addEventListener('fetch', function(event) {
  var request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' && url.href.indexOf(self.registration.scope) !== 0) return;
  var knownAsset = ASSETS.some(function(asset) {
    return new URL(asset, self.location.href).pathname === url.pathname;
  });
  if (!knownAsset) return;
  event.respondWith(caches.open(CACHE).then(function(cache) {
    if (request.mode === 'navigate') {
      return fetch(request).then(function(response) {
        if (response.ok) cache.put(request, response.clone());
        return response;
      }).catch(function() {
        return cache.match(request, { ignoreSearch: true }).then(function(response) {
          return response || Response.error();
        });
      });
    }
    return cache.match(request, { ignoreSearch: true }).then(function(cached) {
      return cached || fetch(request).then(function(response) {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
    });
  }));
});
