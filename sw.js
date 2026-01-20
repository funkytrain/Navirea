const CACHE_NAME = 'plantillatren-v6.3';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/css/variables.css',
    '/css/base.css',
    '/script.js',
    '/manifest.json',
    '/icon-192.png',
    '/icon-512.png',
    // ---- assets Navirea ----
    '/icons/navirea-192.png',
    '/icons/navirea-512.png',
    '/icons/navirea-maskable.png',
    '/splash.png',
    '/css/splash.css',
    '/js/splash.js',
    // ---- new data files ----
    '/data/stops.json',
    '/data/train-numbers.json',
    '/data/train-routes.json',
    '/data/station-screens.json',
    '/data/trains/train-463.json',
    '/data/trains/train-464.json',
    '/data/trains/train-465.json',
    '/data/trains/train-449.json',
    '/data/trains/train-470.json',
    // ---- new config/utils ----
    '/src/config/constants.js',
    '/src/config/ui-constants.js',
    '/src/utils/data-loader.js',
    '/src/utils/dom.js',
    '/src/utils/modal-helpers.js',
    // ---- services ----
    '/src/services/StorageService.js'
];

// Instalación del Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache abierto');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
    );
});

// Activación - Limpieza de cachés antiguas
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Borrando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Interceptar peticiones de red
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si está en caché, devolverlo
                if (response) {
                    return response;
                }

                // Si no, hacer petición a la red
                return fetch(event.request).then(response => {
                    // Verificar si es una respuesta válida
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clonar la respuesta
                    const responseToCache = response.clone();

                    // Guardar en caché
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                });
            })
            .catch(() => {
                // Si falla todo, devolver página offline (opcional)
                return caches.match('index.html');
            })
    );
});