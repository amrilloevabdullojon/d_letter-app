// Service Worker для DMED Letters
const CACHE_NAME = 'dmed-letters-v1'
const STATIC_ASSETS = [
  '/',
  '/letters',
  '/reports',
  '/login',
]

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Активация
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    })
  )
  self.clients.claim()
})

// Стратегия: Network First с fallback на кэш
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Пропускаем не-GET запросы
  if (request.method !== 'GET') return

  // Пропускаем API запросы кроме статистики
  if (request.url.includes('/api/') && !request.url.includes('/api/stats')) {
    return
  }

  // Пропускаем chrome-extension и другие схемы
  if (!request.url.startsWith('http')) return

  event.respondWith(
    fetch(request)
      .then((response) => {
        // Кэшируем успешные ответы
        if (response.ok) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // При ошибке сети пробуем кэш
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse
          }
          // Возвращаем оффлайн страницу для навигации
          if (request.mode === 'navigate') {
            return caches.match('/')
          }
          return new Response('Offline', { status: 503 })
        })
      })
  )
})

// Обновление кэша в фоне
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
