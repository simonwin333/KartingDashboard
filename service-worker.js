// Service Worker - Karting Dashboard v4.0
const CACHE_NAME = 'karting-v4.29';

// Ne pas mettre de chemins absolus - utiliser des chemins relatifs
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Installation - mise en cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Charger les assets en relatif depuis le répertoire de l'app
      return cache.addAll(ASSETS).catch(err => {
        console.log('Erreur cache (normal en local):', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation - nettoyage anciens caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch - réseau d'abord, cache ensuite
self.addEventListener('fetch', event => {
  // Ignorer les requêtes Firebase (toujours réseau)
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic') ||
      event.request.url.includes('cdn.jsdelivr.net')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Mettre en cache la réponse
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Si pas de réseau, utiliser le cache
        return caches.match(event.request);
      })
  );
});
