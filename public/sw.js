// GlowAI Service Worker
//
// Estrategia:
//   - Documentos/HTML: network-first → si la red falla, caché.
//     Asegura que el usuario siempre vea la última versión cuando hay conexión.
//   - Assets estáticos (JS/CSS/imágenes/fuentes): stale-while-revalidate →
//     responde del caché inmediato (rápido) pero refresca en background.
//     Como Vite emite filenames hasheados (index-abc123.js), los nombres
//     nuevos no chocan con los viejos y eventualmente expiran solos.
//   - API: network-only con fallback a caché si no hay red.
//
// IMPORTANTE: bumpear CACHE_VERSION en cada release importante para forzar
// purga del caché viejo. Vite genera hashes propios para los assets, pero el
// caché del HTML/manifest necesita esta señal manual.
const CACHE_VERSION = 'v3-2026-05-17'
const CACHE_NAME    = `glowai-${CACHE_VERSION}`

const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
]

// ── INSTALL: precarga shell, toma control inmediato ───────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll falla si CUALQUIER recurso 404ea — usamos addAll con tolerancia.
      Promise.all(PRECACHE_URLS.map(u => cache.add(u).catch(() => null)))
    )
  )
  self.skipWaiting()
})

// ── ACTIVATE: borra caches viejos, reclama clientes ──────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// ── FETCH ────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // No interceptamos no-GET ni cross-origin (excepto Google Fonts).
  if (request.method !== 'GET') return
  const sameOrigin = url.origin === self.location.origin
  const isGoogleFonts = url.hostname.includes('fonts.g')
  if (!sameOrigin && !isGoogleFonts) return

  // API → network-only con fallback a caché si no hay red.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request).catch(() => caches.match(request))
    )
    return
  }

  // Documentos/navegación → network-first.
  // Si la red falla (offline), servimos el shell cacheado.
  if (request.destination === 'document' || request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
          return response
        })
        .catch(() => caches.match(request).then(c => c || caches.match('/index.html')))
    )
    return
  }

  // Assets estáticos → stale-while-revalidate.
  // Devolvemos el caché si existe (rápido), pero siempre refrescamos en background.
  if (
    isGoogleFonts ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'image' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {})
          }
          return response
        }).catch(() => cached)
        return cached || fetchPromise
      })
    )
    return
  }
})

// ── MENSAJE para forzar update inmediato desde la página ─────────────────
// La página puede llamar reg.active.postMessage({ type: 'SKIP_WAITING' })
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
