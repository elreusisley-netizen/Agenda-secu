import { useEffect, useState } from 'react'
import { LuDownload, LuShare, LuSquarePlus, LuX } from 'react-icons/lu'

interface InvitationInstallation extends Event {
  prompt: () => Promise<void>
}

let invitationAndroid: InvitationInstallation | null = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  invitationAndroid = e as InvitationInstallation
})

export function estInstallee(): boolean {
  try {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
  } catch {
    return false
  }
}

const estIphone = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

/** Fenêtre qui explique comment installer l'application selon le téléphone. */
export function GuideInstallation({ fermer }: { fermer: () => void }) {
  const iphone = estIphone()
  const [android, setAndroid] = useState(Boolean(invitationAndroid))
  useEffect(() => {
    const f = () => setAndroid(true)
    window.addEventListener('beforeinstallprompt', f)
    return () => window.removeEventListener('beforeinstallprompt', f)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={fermer} role="dialog" aria-modal="true">
      <div className="pb-securite w-full max-w-[430px] rounded-t-[1.75rem] bg-white px-5 pt-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-nuit-900">Installer AGENDA SECU</h2>
          <button onClick={fermer} aria-label="Fermer" className="p-1">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-nuit-700">L'application s'ouvrira depuis l'écran d'accueil, comme une application classique, et pourra recevoir les notifications.</p>
        {iphone ? (
          <ol className="mb-5 space-y-3 text-[15px] text-nuit-900">
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-or-500 text-sm font-bold">1</span>
              <span>
                Ouvrez cette page dans <b>Safari</b>, puis touchez <LuShare className="inline h-4 w-4" /> <b>Partager</b>.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-or-500 text-sm font-bold">2</span>
              <span>
                Choisissez <LuSquarePlus className="inline h-4 w-4" /> <b>Sur l'écran d'accueil</b>.
              </span>
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-or-500 text-sm font-bold">3</span>
              <span>
                Touchez <b>Ajouter</b>, puis ouvrez AGENDA SECU depuis l'icône.
              </span>
            </li>
          </ol>
        ) : android ? (
          <button
            onClick={async () => {
              await invitationAndroid?.prompt()
              invitationAndroid = null
              fermer()
            }}
            className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl bg-or-500 py-3.5 font-bold text-nuit-900"
          >
            <LuDownload className="h-5 w-5" /> Installer l'application
          </button>
        ) : (
          <ol className="mb-5 space-y-3 text-[15px] text-nuit-900">
            <li>1. Ouvrez cette page dans <b>Chrome</b>.</li>
            <li>2. Touchez le menu <b>⋮</b> en haut à droite.</li>
            <li>3. Choisissez <b>Installer l'application</b> (ou « Ajouter à l'écran d'accueil »).</li>
          </ol>
        )}
      </div>
    </div>
  )
}
