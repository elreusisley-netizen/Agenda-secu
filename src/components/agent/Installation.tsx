import { useEffect, useState, type ReactNode } from 'react'
import { LuBell, LuDownload, LuEllipsisVertical, LuShare, LuSquarePlus, LuX } from 'react-icons/lu'

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

const estAndroid = () => /android/i.test(navigator.userAgent)

function Etape({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-or-500 text-sm font-bold text-nuit-900">{n}</span>
      <span className="pt-0.5">{children}</span>
    </li>
  )
}

/** Fenêtre qui explique comment installer l'application, sur iPhone et sur Android. */
export function GuideInstallation({ fermer }: { fermer: () => void }) {
  const [onglet, setOnglet] = useState<'iphone' | 'android'>(estAndroid() ? 'android' : 'iphone')
  const [android, setAndroid] = useState(Boolean(invitationAndroid))
  useEffect(() => {
    const f = () => setAndroid(true)
    window.addEventListener('beforeinstallprompt', f)
    return () => window.removeEventListener('beforeinstallprompt', f)
  }, [])

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center" onClick={fermer} role="dialog" aria-modal="true">
      <div className="pb-securite max-h-[92dvh] w-full max-w-[430px] overflow-y-auto rounded-t-[1.75rem] bg-white px-5 pt-5 sm:rounded-[1.75rem] sm:pb-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold text-nuit-900">Installer AGENDA SECU</h2>
          <button onClick={fermer} aria-label="Fermer" className="p-1 text-nuit-900">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-nuit-700">L'application s'ouvre ensuite depuis l'écran d'accueil, comme une application classique, et peut recevoir les notifications.</p>

        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-fond p-1 text-[14px] font-bold">
          {(
            [
              ['iphone', 'iPhone'],
              ['android', 'Android'],
            ] as const
          ).map(([id, libelle]) => (
            <button key={id} onClick={() => setOnglet(id)} className={`rounded-lg py-2 ${onglet === id ? 'bg-white text-nuit-900 shadow-sm' : 'text-nuit-600'}`}>
              {libelle}
            </button>
          ))}
        </div>

        {onglet === 'iphone' ? (
          <ol className="mb-4 space-y-3 text-[15px] text-nuit-900">
            <Etape n={1}>
              Ouvrez l'adresse de l'application dans <b>Safari</b>.
            </Etape>
            <Etape n={2}>
              Touchez <LuShare className="inline h-4 w-4" /> <b>Partager</b> (en bas de l'écran, ou en haut sur iPad).
            </Etape>
            <Etape n={3}>
              Faites défiler et choisissez <LuSquarePlus className="inline h-4 w-4" /> <b>Sur l'écran d'accueil</b>.
            </Etape>
            <Etape n={4}>
              Touchez <b>Ajouter</b>, puis ouvrez AGENDA SECU <b>depuis sa nouvelle icône</b>.
            </Etape>
          </ol>
        ) : (
          <>
            {android && (
              <button
                onClick={async () => {
                  await invitationAndroid?.prompt()
                  invitationAndroid = null
                  fermer()
                }}
                className="mb-4 flex w-full items-center justify-center gap-2 rounded-xl bg-or-500 py-3.5 font-bold text-nuit-900"
              >
                <LuDownload className="h-5 w-5" /> Installer en un geste
              </button>
            )}
            <ol className="mb-4 space-y-3 text-[15px] text-nuit-900">
              <Etape n={1}>
                Ouvrez l'adresse de l'application dans <b>Chrome</b>.
              </Etape>
              <Etape n={2}>
                Touchez le menu <LuEllipsisVertical className="inline h-4 w-4" /> en haut à droite.
              </Etape>
              <Etape n={3}>
                Choisissez <b>Installer l'application</b> (ou <b>Ajouter à l'écran d'accueil</b>), puis confirmez.
              </Etape>
              <Etape n={4}>
                Ouvrez AGENDA SECU <b>depuis sa nouvelle icône</b>.
              </Etape>
            </ol>
            <p className="mb-4 rounded-lg bg-fond p-3 text-[13px] text-nuit-700">
              Sur un Samsung avec <b>Samsung Internet</b> : menu <b>≡</b> en bas → <b>Ajouter la page à</b> → <b>Écran d'accueil</b>.
            </p>
          </>
        )}

        <div className="mb-2 rounded-xl border border-trait p-3 text-[13px] text-nuit-700">
          <p className="mb-1 flex items-center gap-2 font-bold text-nuit-900">
            <LuBell className="h-4 w-4" /> Ensuite : activer les notifications
          </p>
          Dans l'application installée, allez dans <b>Profil</b> (agent) ou touchez <b>votre nom en haut à droite</b> (administrateur et chef), puis <b>Activer les notifications</b> et <b>Autoriser</b>.
          {onglet === 'iphone' && <span className="mt-1 block text-nuit-600">Il faut iOS 16.4 ou plus récent (Réglages → Général → Mise à jour logicielle).</span>}
        </div>
      </div>
    </div>
  )
}
