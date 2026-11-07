import { useState } from 'react'
import { BarreNavigation, EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { ResumeMission } from '../../components/agent/CarteMission'
import { BadgeStatut } from '../../components/agent/Badge'
import { useDemo } from '../../demo/DemoContexte'

export default function Missions() {
  const { missions, repondre, afficherMessage } = useDemo()
  const [onglet, setOnglet] = useState<'propositions' | 'avenir'>('propositions')

  const propositions = missions.filter((m) => m.statut === 'proposee').sort((a, b) => a.date.localeCompare(b.date))
  const aVenir = missions
    .filter((m) => m.statut === 'acceptee' || m.statut === 'confirmee')
    .sort((a, b) => a.date.localeCompare(b.date))

  const liste = onglet === 'propositions' ? propositions : aVenir

  return (
    <EcranAgent>
      <EnteteAgent titre="Missions disponibles" retourVers="/agent" />
      <Feuille className="pb-6">
        <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-fond p-1">
          <button
            onClick={() => setOnglet('propositions')}
            className={`rounded-xl py-2.5 text-[14px] font-bold ${onglet === 'propositions' ? 'bg-or-500 text-nuit-900 shadow-sm' : 'text-nuit-900'}`}
          >
            Propositions ({propositions.length})
          </button>
          <button
            onClick={() => setOnglet('avenir')}
            className={`rounded-xl py-2.5 text-[14px] font-bold ${onglet === 'avenir' ? 'bg-or-500 text-nuit-900 shadow-sm' : 'text-nuit-900'}`}
          >
            À venir
          </button>
        </div>

        {liste.length === 0 && (
          <p className="py-12 text-center text-sm text-nuit-600">
            {onglet === 'propositions' ? 'Aucune proposition en attente.' : 'Aucune mission à venir.'}
          </p>
        )}

        <ul className="divide-y divide-trait">
          {liste.map((m) => (
            <li key={m.id} className="px-1 py-4">
              <ResumeMission
                mission={m}
                enfants={
                  onglet === 'propositions' ? (
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          repondre(m.id, 'refusee')
                          afficherMessage('Mission refusée (démo)')
                        }}
                        className="rounded-xl bg-fond py-2.5 text-[14px] font-semibold text-nuit-900"
                      >
                        Refuser
                      </button>
                      <button
                        onClick={() => {
                          repondre(m.id, 'acceptee')
                          afficherMessage('Mission acceptée (démo)')
                        }}
                        className="rounded-xl bg-or-500 py-2.5 text-[14px] font-bold text-nuit-900"
                      >
                        Accepter
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2.5">
                      <BadgeStatut statut={m.statut} />
                    </div>
                  )
                }
              />
            </li>
          ))}
        </ul>
      </Feuille>
      <BarreNavigation actif="missions" />
    </EcranAgent>
  )
}
