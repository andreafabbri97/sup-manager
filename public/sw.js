const CACHE_NAME = 'sup-manager-v2'
const urlsToCache = [
  '/sup-manager/',
  '/sup-manager/index.html'
]

self.addEventListener('install', (event) => {
  // Activate new SW immediately
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache)
    })
  )
})

self.addEventListener('activate', (event) => {
  // Take control of uncontrolled clients immediately
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.map(k => { if (k !== CACHE_NAME) return caches.delete(k) }))
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', (event) => {
  // For navigation requests (app shell) use network-first with fallback to cached index.html
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then((res) => {
        // update cache with latest index.html or navigation response
        const resClone = res.clone()
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone))
        return res
      }).catch(() => caches.match('/sup-manager/index.html'))
    )
    return
  }

  // For other requests try cache first, then network and update cache
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((res) => {
        // Don't cache opaque requests from cross-origin
        try {
          const shouldCache = event.request.url.startsWith(self.location.origin)
          if (shouldCache) {
            const resClone = res.clone()
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone))
          }
        } catch (e) {}
        return res
      })
    }).catch(() => {
      // As a final fallback, serve cached index for navigations already handled above; for other requests we just let it fail
      return caches.match('/sup-manager/index.html')
    })
  )
})
