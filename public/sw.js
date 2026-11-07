// Service worker AGENDA SECU (étape 4) : rend l'application installable.
// Il ne garde aucune donnée en cache pour l'instant (le mode hors ligne et les notifications push viendront plus tard).
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // Laisse passer toutes les requêtes vers le réseau.
})
