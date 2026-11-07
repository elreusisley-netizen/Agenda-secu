import './lib/lienAuth' // en premier : lit le lien d'invitation / de réinitialisation avant tout
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { naviguer } from './lib/routeur'
import { AuthProvider } from './auth/AuthContexte'
import { DemoProvider } from './demo/DemoContexte'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <DemoProvider>
        <App />
      </DemoProvider>
    </AuthProvider>
  </StrictMode>,
)

// Service worker : application installable et notifications sur le téléphone.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((r) => r.update())
      .catch(() => {
        /* sans service worker, l'application fonctionne normalement */
      })
  })
}
// Appui sur une notification alors que l'application est déjà ouverte : on va au bon écran.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (e) => {
    const d = e.data as { type?: string; vers?: string } | null
    if (d?.type === 'ouvrir' && typeof d.vers === 'string' && d.vers.startsWith('/')) naviguer(d.vers)
  })
}
