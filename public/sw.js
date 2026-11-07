// Service worker AGENDA SECU (version 2) : application installable + notifications sur le téléphone.
// Aucune donnée n'est gardée en cache : l'application affiche toujours les informations à jour.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // Laisse passer toutes les requêtes vers le réseau.
})

// Réception d'une notification envoyée par le serveur.
self.addEventListener('push', (e) => {
  let d = {}
  try {
    d = e.data ? e.data.json() : {}
  } catch {
    d = { message: e.data ? e.data.text() : '' }
  }
  e.waitUntil(
    self.registration.showNotification(d.titre || 'AGENDA SECU', {
      body: d.message || '',
      icon: '/icone-192.png',
      badge: '/icone-192.png',
      data: { lien: d.lien || null },
      tag: d.lien || undefined,
      renotify: Boolean(d.lien),
    }),
  )
})

// Appui sur la notification : ouvre l'application au bon écran.
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  const lien = (e.notification.data && e.notification.data.lien) || ''
  e.waitUntil(
    (async () => {
      const fenetres = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const f of fenetres) {
        if (new URL(f.url).origin === self.location.origin) {
          await f.focus()
          if (lien) f.postMessage({ type: 'ouvrir', vers: lien })
          return
        }
      }
      await self.clients.openWindow(lien ? '/#' + lien : '/')
    })(),
  )
})
