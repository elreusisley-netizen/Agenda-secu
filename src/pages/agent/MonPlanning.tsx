import { useState } from 'react'
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu'
import { BarreNavigation, EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { BadgeStatut } from '../../components/agent/Badge'
import { useDemo } from '../../demo/DemoContexte'
import { site } from '../../demo/donnees-demo'
import { jourSemaineCourt, moisSuivant, numeroJour, titreMois, versDate } from '../../lib/dates'
import { Lien } from '../../lib/routeur'

export default function MonPlanning() {
  const { missions } = useDemo()
  const [[annee, mois], setMois] = useState<[number, number]>([2026, 10])

  const duMois = missions
    .filter((m) => m.statut === 'confirmee')
    .filter((m) => {
      const d = versDate(m.date)
      return d.getFullYear() === annee && d.getMonth() === mois
    })
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <EcranAgent>
      <EnteteAgent titre="Mon planning" retourVers="/agent" />
      <Feuille className="pb-6">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-trait px-3 py-3">
          <button onClick={() => setMois(moisSuivant(annee, mois, -1))} aria-label="Mois précédent" className="p-1.5">
            <LuChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-[15px] font-bold text-nuit-900">{titreMois(annee, mois)}</p>
          <button onClick={() => setMois(moisSuivant(annee, mois, 1))} aria-label="Mois suivant" className="p-1.5">
            <LuChevronRight className="h-5 w-5" />
          </button>
        </div>

        {duMois.length === 0 && <p className="py-12 text-center text-sm text-nuit-600">Aucune mission confirmée ce mois-ci.</p>}

        <ul className="space-y-3">
          {duMois.map((m) => (
            <li key={m.id}>
              <Lien vers={`/agent/missions/${m.id}`} className="flex items-center gap-3 rounded-2xl border border-trait bg-white px-3 py-3.5">
                <div className="w-12 shrink-0 text-center">
                  <p className="text-[13px] text-nuit-700">{jourSemaineCourt(m.date)}</p>
                  <p className="text-[22px] font-bold leading-tight text-nuit-900">{numeroJour(m.date)}</p>
                </div>
                <div className="min-w-0 flex-1 border-l border-trait pl-3">
                  <p className="text-[15px] font-bold text-nuit-900">
                    {m.debut} – {m.fin}
                  </p>
                  <p className="truncate text-[13px] text-nuit-900">{site(m.siteId).nom}</p>
                </div>
                <BadgeStatut statut={m.statut} />
              </Lien>
            </li>
          ))}
        </ul>
      </Feuille>
      <BarreNavigation actif="planning" />
    </EcranAgent>
  )
}
