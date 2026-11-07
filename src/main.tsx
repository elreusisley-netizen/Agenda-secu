import './lib/lienAuth' // en premier : lit le lien d'invitation / de réinitialisation avant tout
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
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

// Service worker : rend l'application installable (Android) ; les notifications push viendront à l'étape 13.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* sans service worker, l'application fonctionne normalement */
    })
  })
}
