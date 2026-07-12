// Both values are injected at build time by the sw-precache-manifest plugin in
// vite.config.ts: the full list of built asset URLs and a content hash used to
// version the cache. The fallbacks only apply when serving the raw public/ file.
self.__PRECACHE_MANIFEST = ["/guide/assets/BackupPanel-CTw8nKHU.js","/guide/assets/BookmarkModal-B3C0hvUd.css","/guide/assets/BookmarkModal-DN6jPpot.js","/guide/assets/CategoryManager-CTt9mQz9.js","/guide/assets/CleanupPanel-DINe4rpC.js","/guide/assets/CommandPalette-DkyiLaWh.js","/guide/assets/KeyboardHelp-B-Zp6Pe3.js","/guide/assets/SettingsPanel-DmtAa-Ax.css","/guide/assets/SettingsPanel-fjm_L9Vw.js","/guide/assets/descriptions--p7kNY5b.js","/guide/assets/descriptions-BSFw1E27.css","/guide/assets/dialog-DySwO_9O.css","/guide/assets/dialog-U4wh9lP3.js","/guide/assets/index-4aswaq5O.css","/guide/assets/index-C67HWQaz.js","/guide/assets/inter-cyrillic-ext-wght-normal-BOeWTOD4.woff2","/guide/assets/inter-cyrillic-wght-normal-DqGufNeO.woff2","/guide/assets/inter-greek-ext-wght-normal-DlzME5K_.woff2","/guide/assets/inter-greek-wght-normal-CkhJZR-_.woff2","/guide/assets/inter-latin-ext-wght-normal-DO1Apj_S.woff2","/guide/assets/inter-latin-wght-normal-Dx4kXJAl.woff2","/guide/assets/inter-vietnamese-wght-normal-CBcvBZtf.woff2","/guide/assets/jetbrains-mono-cyrillic-wght-normal-D73BlboJ.woff2","/guide/assets/jetbrains-mono-greek-wght-normal-Bw9x6K1M.woff2","/guide/assets/jetbrains-mono-latin-ext-wght-normal-DBQx-q_a.woff2","/guide/assets/jetbrains-mono-latin-wght-normal-B9CIFXIH.woff2","/guide/assets/jetbrains-mono-vietnamese-wght-normal-Bt-aOZkq.woff2","/guide/assets/table-column-BxyjJ4gl.js","/guide/assets/table-column-zKW9_6Tf.css","/guide/favicon.png","/guide/","/guide/manifest.webmanifest"]
self.__CACHE_VERSION = "1a7fb87bf097"

const APP_BASE = new URL(self.registration.scope).pathname
const APP_ORIGIN = self.location.origin
const CACHE_NAME = `navhub-guide-${self.__CACHE_VERSION ?? 'dev'}`
const APP_SHELL = self.__PRECACHE_MANIFEST ?? [
  APP_BASE,
  `${APP_BASE}favicon.png`,
  `${APP_BASE}manifest.webmanifest`,
]

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const requestUrl = new URL(event.request.url)

  if (requestUrl.origin !== APP_ORIGIN || !requestUrl.pathname.startsWith(APP_BASE)) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(APP_BASE, copy))
          return response
        })
        .catch(() => caches.match(APP_BASE)),
    )
    return
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached
      return fetch(event.request).then((response) => {
        if (!response || !response.ok) return response
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy))
        return response
      })
    }),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
