import { useState } from 'react'
import { LuX } from 'react-icons/lu'
import { espaceDe, useAuth } from '../auth/AuthContexte'
import { useDemo } from '../demo/DemoContexte'
import { modeDemo } from '../lib/supabase'
import { naviguer } from '../lib/routeur'

/*
  Pastille « DÉMO » : rappelle que les écrans affichent encore des données fictives.
  En mode démo (sans Supabase), elle permet aussi de passer d'un espace à l'autre.
  Elle disparaîtra quand toutes les données seront réelles.
*/
export function BadgeDemo() {
  const [ouvert, setOuvert] = useState(false)
  const { reinitialiser, afficherMessage } = useDemo()
  const { connexion, deconnexion } = useAuth()

  const basculer = async (admin: boolean) => {
    setOuvert(false)
    await connexion(admin ? 'admin' : '', '')
    naviguer(espaceDe(admin ? 'admin' : 'agent'), true)
  }

  return (
    <div className="fixed bottom-[84px] right-3 z-40 md:bottom-4 md:right-4">
      {ouvert && (
        <div className="mb-2 w-64 rounded-2xl border border-trait bg-white p-3 text-sm shadow-xl">
          <div className="mb-2 flex items-start justify-between gap-2">
            <p className="font-semibold text-nuit-900">{modeDemo ? 'Version de démonstration' : 'Données d’exemple'}</p>
            <button onClick={() => setOuvert(false)} aria-label="Fermer" className="text-nuit-600">
              <LuX className="h-4 w-4" />
            </button>
          </div>
          <p className="mb-3 text-xs leading-relaxed text-nuit-600">
            {modeDemo
              ? 'Toutes les données affichées sont fictives. Rien n’est enregistré : un rechargement remet la démo à zéro.'
              : 'Cet écran affiche encore des exemples fictifs. La saisie réelle des disponibilités sera bientôt disponible.'}
          </p>
          <div className="grid gap-1.5">
            {modeDemo && (
              <>
                <button
                  className="rounded-lg bg-fond px-3 py-2 text-left font-medium"
                  onClick={async () => {
                    setOuvert(false)
                    await deconnexion()
                    naviguer('/connexion', true)
                  }}
                >
                  Écran de connexion
                </button>
                <button className="rounded-lg bg-fond px-3 py-2 text-left font-medium" onClick={() => basculer(false)}>
                  Espace agent (mobile)
                </button>
                <button className="rounded-lg bg-fond px-3 py-2 text-left font-medium" onClick={() => basculer(true)}>
                  Espace administrateur (web)
                </button>
              </>
            )}
            <button
              className="rounded-lg px-3 py-2 text-left font-medium text-red-700"
              onClick={() => {
                reinitialiser()
                setOuvert(false)
                afficherMessage('Exemples remis à zéro')
              }}
            >
              Remettre les exemples à zéro
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-end">
        <button
          onClick={() => setOuvert((o) => !o)}
          className="rounded-full border-2 border-or-500 bg-nuit-900 px-3 py-1 text-[11px] font-bold tracking-wider text-or-500 shadow-lg"
          aria-expanded={ouvert}
        >
          DÉMO
        </button>
      </div>
    </div>
  )
}
