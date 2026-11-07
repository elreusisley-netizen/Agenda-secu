import { LuCalendar, LuClipboardList, LuClock, LuDoorOpen, LuMapPin, LuPhone } from 'react-icons/lu'
import type { ReactNode } from 'react'
import { BarreNavigation, EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { BadgeStatut } from '../../components/agent/Badge'
import { useDemo } from '../../demo/DemoContexte'
import { site } from '../../demo/donnees-demo'
import { dateCourte } from '../../lib/dates'

function Ligne({ Icone, titre, children }: { Icone: typeof LuClock; titre: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <Icone className="mt-0.5 h-5 w-5 shrink-0 text-nuit-900" />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-nuit-600">{titre}</p>
        <div className="mt-0.5 text-[15px] text-nuit-900">{children}</div>
      </div>
    </div>
  )
}

// Écran complémentaire (non dessiné sur les maquettes) : ouvert par la flèche « > » d'une mission.
export default function MissionDetail({ id }: { id: string }) {
  const { missions, repondre, afficherMessage } = useDemo()
  const mission = missions.find((m) => m.id === id)

  if (!mission) {
    return (
      <EcranAgent>
        <EnteteAgent titre="Mission" retourVers="/agent/missions" />
        <Feuille>
          <p className="py-10 text-center text-sm text-nuit-600">Mission introuvable.</p>
        </Feuille>
      </EcranAgent>
    )
  }

  const s = site(mission.siteId)
  const itineraire = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.adresse)}`

  return (
    <EcranAgent>
      <EnteteAgent titre={s.nom} retourVers="/agent/missions" />
      <Feuille className="pb-6">
        <div className="mb-1 px-1">
          <BadgeStatut statut={mission.statut} />
        </div>
        <div className="divide-y divide-trait px-1">
          <Ligne Icone={LuCalendar} titre="Date">
            {dateCourte(mission.date)}
          </Ligne>
          <Ligne Icone={LuClock} titre="Horaires">
            {mission.debut} – {mission.fin}
          </Ligne>
          <Ligne Icone={LuMapPin} titre="Adresse">
            <p>{s.adresse}</p>
            <a href={itineraire} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-or-600 underline">
              Ouvrir l'itinéraire
            </a>
          </Ligne>
          <Ligne Icone={LuDoorOpen} titre="Accès">
            {s.acces}
          </Ligne>
          <Ligne Icone={LuClipboardList} titre="Consignes">
            {s.consignes}
          </Ligne>
          <Ligne Icone={LuPhone} titre="Contact sur place">
            {s.contact}
          </Ligne>
        </div>
        {mission.statut === 'proposee' && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                repondre(mission.id, 'refusee')
                afficherMessage('Mission refusée (démo)')
              }}
              className="rounded-xl bg-fond py-3 font-semibold text-nuit-900"
            >
              Refuser
            </button>
            <button
              onClick={() => {
                repondre(mission.id, 'acceptee')
                afficherMessage('Mission acceptée (démo)')
              }}
              className="rounded-xl bg-or-500 py-3 font-bold text-nuit-900"
            >
              Accepter
            </button>
          </div>
        )}
      </Feuille>
      <BarreNavigation actif="missions" />
    </EcranAgent>
  )
}
