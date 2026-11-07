import { useState } from 'react'
import { LuChevronRight, LuPlus } from 'react-icons/lu'
import { CadreAdmin } from '../../components/admin/CadreAdmin'
import {
  BandeauPlanning,
  DetailMission,
  FormulaireMission,
  NavMois,
  Puce,
  Remplissage,
  useDroitsMissions,
  useMois,
} from '../../components/admin/missions'
import { aujourdhuiIso, dateCourte } from '../../lib/dates'
import { nbConfirmes, premierDuMois, type Mission } from '../../lib/missions'

type Filtre = 'toutes' | 'a_pourvoir' | 'a_traiter' | 'annulees'
const FILTRES: { id: Filtre; libelle: string }[] = [
  { id: 'toutes', libelle: 'Toutes' },
  { id: 'a_pourvoir', libelle: 'À pourvoir' },
  { id: 'a_traiter', libelle: 'À confirmer' },
  { id: 'annulees', libelle: 'Annulées' },
]

function filtrer(m: Mission, f: Filtre) {
  if (f === 'annulees') return m.statut === 'annulee'
  if (m.statut === 'annulee') return f === 'toutes'
  if (f === 'a_pourvoir') return nbConfirmes(m) < m.nb_agents_requis
  if (f === 'a_traiter') return m.affectations.some((a) => a.statut === 'acceptee')
  return true
}

function CarteMission({ m, ouvrir }: { m: Mission; ouvrir: () => void }) {
  const compte = (s: string) => m.affectations.filter((a) => a.statut === s).length
  const proposees = compte('proposee')
  const acceptees = compte('acceptee')
  const refusees = compte('refusee')
  return (
    <button onClick={ouvrir} className={`flex w-full items-center gap-3 rounded-xl border border-trait bg-white p-3.5 text-left shadow-sm active:bg-fond ${m.statut === 'annulee' ? 'opacity-60' : ''}`}>
      <div className="w-[62px] shrink-0 text-center text-[13px] font-bold leading-tight text-nuit-900">
        {m.hDebut}
        <span className="block text-[11px] font-medium text-nuit-600">{m.hFin}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-semibold text-nuit-900">{m.site_nom}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          <Remplissage m={m} />
          {m.statut !== 'annulee' && acceptees > 0 && <Puce classe="bg-attente/40 text-attente-fonce">{acceptees} à confirmer</Puce>}
          {m.statut !== 'annulee' && proposees > 0 && <Puce classe="bg-creneau-bleu text-creneau-bleu-texte">{proposees} en attente</Puce>}
          {m.statut !== 'annulee' && refusees > 0 && <Puce classe="bg-indispo/40 text-indispo-fonce">{refusees} refus</Puce>}
        </div>
      </div>
      <LuChevronRight className="h-4 w-4 shrink-0 text-nuit-600" />
    </button>
  )
}

export default function Missions() {
  const { admin } = useDroitsMissions()
  const { annee, mois, donnees, erreur, recharger, changerMois, allerA } = useMois()
  const [filtre, setFiltre] = useState<Filtre>('toutes')
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [formulaire, setFormulaire] = useState<'creer' | 'modifier' | null>(null)

  const missions = donnees?.missions ?? []
  const visibles = missions.filter((m) => filtrer(m, filtre))
  const jours = [...new Set(visibles.map((m) => m.date))]
  const mission = missions.find((m) => m.id === ouverte)
  const ajd = aujourdhuiIso()
  const dateDefaut = ajd.startsWith(premierDuMois(annee, mois).slice(0, 7)) ? ajd : premierDuMois(annee, mois)

  return (
    <CadreAdmin actif="missions">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-nuit-900">Missions</h1>
        {admin && (
          <button onClick={() => setFormulaire('creer')} className="flex items-center gap-1.5 rounded-lg bg-or-500 px-3.5 py-2 text-[13px] font-bold text-nuit-900 shadow-sm active:bg-or-600">
            <LuPlus className="h-4 w-4" /> Créer une mission
          </button>
        )}
      </div>

      <div className="mb-3 flex justify-center sm:justify-start">
        <NavMois annee={annee} mois={mois} changer={changerMois} />
      </div>

      {erreur && <p className="rounded-xl bg-red-50 p-4 text-[13px] text-red-800">{erreur}</p>}
      {!donnees && !erreur && <p className="p-6 text-center text-[13px] text-nuit-600">Chargement…</p>}

      {donnees && (
        <>
          <BandeauPlanning planning={donnees.planning} missions={missions} recharger={recharger} />

          <div className="-mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {FILTRES.map((f) => {
              const n = missions.filter((m) => filtrer(m, f.id)).length
              return (
                <button
                  key={f.id}
                  onClick={() => setFiltre(f.id)}
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold ${filtre === f.id ? 'bg-nuit-900 text-white' : 'bg-white text-nuit-700 ring-1 ring-trait'}`}
                >
                  {f.libelle} {n > 0 && <span className="opacity-70">({n})</span>}
                </button>
              )
            })}
          </div>

          {visibles.length === 0 && (
            <div className="rounded-xl border border-dashed border-trait bg-white p-8 text-center">
              <p className="text-[14px] font-semibold text-nuit-900">{missions.length === 0 ? 'Aucune mission ce mois-ci' : 'Aucune mission dans ce filtre'}</p>
              {admin && missions.length === 0 && (
                <button onClick={() => setFormulaire('creer')} className="mt-3 rounded-lg bg-or-500 px-4 py-2 text-[13px] font-bold text-nuit-900">
                  Créer la première mission
                </button>
              )}
            </div>
          )}

          <div className="space-y-4">
            {jours.map((j) => (
              <section key={j}>
                <h2 className={`mb-2 text-[13px] font-bold ${j === ajd ? 'text-or-600' : 'text-nuit-700'}`}>
                  {dateCourte(j)}
                  {j === ajd && ' · aujourd’hui'}
                </h2>
                <div className="space-y-2">
                  {visibles
                    .filter((m) => m.date === j)
                    .map((m) => (
                      <CarteMission key={m.id} m={m} ouvrir={() => setOuverte(m.id)} />
                    ))}
                </div>
              </section>
            ))}
          </div>

          {mission && formulaire !== 'modifier' && (
            <DetailMission mission={mission} donnees={donnees} fermer={() => setOuverte(null)} recharger={recharger} modifier={() => setFormulaire('modifier')} />
          )}
          {formulaire && (
            <FormulaireMission
              mission={formulaire === 'modifier' ? mission : undefined}
              dateDefaut={dateDefaut}
              donnees={donnees}
              fermer={() => setFormulaire(null)}
              apres={(date) => {
                setFormulaire(null)
                const [a, m] = date.split('-').map(Number)
                if (a !== annee || m - 1 !== mois) allerA(a, m - 1)
                else void recharger()
              }}
            />
          )}
        </>
      )}
    </CadreAdmin>
  )
}
