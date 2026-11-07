import { useState } from 'react'
import { BarreNavigation, EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { BoutonsReponse, ResumeMission } from '../../components/agent/CarteMission'
import { BadgeStatut } from '../../components/agent/Badge'
import { useAuth } from '../../auth/AuthContexte'
import { estPassee, propositionsOuvertes, useMesMissions } from '../../lib/espaceAgent'

export default function Missions() {
  const { profil } = useAuth()
  const { missions, erreur, recharger } = useMesMissions(profil?.id)
  const [onglet, setOnglet] = useState<'propositions' | 'avenir'>('propositions')

  const propositions = propositionsOuvertes(missions ?? [])
  const aVenir = (missions ?? []).filter((m) => (m.statut === 'acceptee' || m.statut === 'confirmee') && !m.mission_annulee && !estPassee(m))
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
            À venir ({aVenir.length})
          </button>
        </div>

        {erreur && <p className="mb-3 rounded-xl bg-red-50 p-3 text-[13px] text-red-800">{erreur}</p>}
        {!missions && !erreur && <p className="py-12 text-center text-sm text-nuit-600">Chargement…</p>}
        {missions && liste.length === 0 && (
          <p className="py-12 text-center text-sm text-nuit-600">{onglet === 'propositions' ? 'Aucune proposition en attente.' : 'Aucune mission à venir.'}</p>
        )}

        <ul className="divide-y divide-trait">
          {liste.map((m) => (
            <li key={m.affectation_id} className="px-1 py-4">
              <ResumeMission
                mission={m}
                enfants={
                  onglet === 'propositions' ? (
                    <BoutonsReponse mission={m} apres={recharger} />
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
