// Service Worker — App Educativa 2º Primaria
// IMPORTANTE: cambiar el número de versión fuerza recarga en todos los dispositivos
const CACHE = 'edu-app-v3';

// Al instalar: cachea el shell básico
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      cache.addAll([
        './',
        './index.html',
        './manifest.json',
        './ejercicios.json',
      ]).catch(() => {}) // Si falla alguno, continúa igual
    )
  );
});

// Al activar: borra caches viejas
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Estrategia fetch
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // index.html, raíz y datos JSON → network-first
  // index.html NUNCA debe servirse desde caché: referencia hashes de JS/CSS que cambian en cada build
  if (
    url.pathname.endsWith('manifest.json') ||
    url.pathname.endsWith('ejercicios.json') ||
    url.pathname.endsWith('index.html') ||
    url.pathname.endsWith('/app-studio/') ||
    url.pathname === '/app-studio'
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE).then(c => c.put(event.request, response.clone()));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Todo lo demás → cache-first (JS, CSS, assets, HTML)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        if (response.ok) {
          caches.open(CACHE).then(c => c.put(event.request, response.clone()));
        }
        return response;
      }).catch(() => {
        // Si es navegación y no hay cache, devuelve index.html
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
