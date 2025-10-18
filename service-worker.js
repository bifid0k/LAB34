const CACHE_NAME = 'rental-app-v1.0.0';
const urlsToCache = [
    './',
    'https://fonts.googleapis.com/icon?family=Material+Icons',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
    console.log('[SW] Установка Service Worker');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Кэширование файлов');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('[SW] Ошибка кэширования:', err);
            })
    );
    // Активируем новый SW сразу
    self.skipWaiting();
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
    console.log('[SW] Активация Service Worker');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Удаление старого кэша:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Захватываем все клиенты
    return self.clients.claim();
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
    // Игнорируем запросы к Firebase и внешним API
    if (event.request.url.includes('firebase') ||
        event.request.url.includes('googleapis') ||
        event.request.url.includes('firebaseio')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Возвращаем из кэша если есть
                if (response) {
                    return response;
                }

                // Клонируем запрос
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then((response) => {
                    // Проверяем что ответ валиден
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Клонируем ответ
                    const responseToCache = response.clone();

                    caches.open(CACHE_NAME)
                        .then((cache) => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch(() => {
                    // Если офлайн - возвращаем из кэша
                    return caches.match('/');
                });
            })
    );
});

// Обработка синхронизации в фоне
self.addEventListener('sync', (event) => {
    console.log('[SW] Background Sync:', event.tag);

    if (event.tag === 'sync-data') {
        event.waitUntil(syncData());
    }
});

async function syncData() {
    console.log('[SW] Синхронизация данных с сервером');
    // Отправляем сообщение клиенту о необходимости синхронизации
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
        client.postMessage({
            type: 'SYNC_REQUEST'
        });
    });
}
