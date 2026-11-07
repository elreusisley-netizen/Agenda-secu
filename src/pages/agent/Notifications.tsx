import { useEffect, useState } from 'react'
import { LuBell } from 'react-icons/lu'
import { BarreNavigation, EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { chargerNotifications, depuis, marquerLues, type Notification } from '../../lib/espaceAgent'
import { naviguer } from '../../lib/routeur'

// Écran complémentaire (non dessiné sur les maquettes) : ouvert par la cloche de l'accueil.
export default function Notifications() {
  const [liste, setListe] = useState<Notification[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    chargerNotifications()
      .then((l) => {
        setListe(l) // les non lues restent en gras pendant cette visite
        void marquerLues(l.filter((n) => !n.lue).map((n) => n.id))
      })
      .catch(() => setErreur('Impossible de charger les notifications. Vérifiez votre connexion.'))
  }, [])

  return (
    <EcranAgent>
      <EnteteAgent titre="Notifications" retourVers="/agent" />
      <Feuille className="pb-6">
        {erreur && <p className="rounded-xl bg-red-50 p-3 text-[13px] text-red-800">{erreur}</p>}
        {!liste && !erreur && <p className="py-12 text-center text-sm text-nuit-600">Chargement…</p>}
        {liste && liste.length === 0 && <p className="py-12 text-center text-sm text-nuit-600">Aucune notification pour l’instant.</p>}
        <ul className="divide-y divide-trait">
          {(liste ?? []).map((n) => (
            <li key={n.id}>
              <button
                disabled={!n.lien}
                onClick={() => n.lien && naviguer(n.lien)}
                className="flex w-full gap-3 px-1 py-4 text-left disabled:cursor-default"
              >
                <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.lue ? 'bg-fond text-nuit-600' : 'bg-or-500 text-nuit-900'}`}>
                  <LuBell className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block text-[15px] text-nuit-900 ${n.lue ? 'font-medium' : 'font-bold'}`}>{n.titre}</span>
                  <span className="block text-sm text-nuit-700">{n.message}</span>
                  <span className="mt-1 block text-xs text-nuit-600">{depuis(n.cree_le)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Feuille>
      <BarreNavigation />
    </EcranAgent>
  )
}
