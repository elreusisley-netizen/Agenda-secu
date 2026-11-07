import { useState } from 'react'
import { LuPlus } from 'react-icons/lu'
import { CadreAdmin } from '../../components/admin/CadreAdmin'
import { BandeauPlanning, DetailMission, FormulaireMission, NavMois, STATUTS, useDroitsMissions, useMois } from '../../components/admin/missions'
import { ajouterJours, aujourdhuiIso, dateCourte, joursDuMois, jourSemaineCourt, numeroJour, semaineDe } from '../../lib/dates'
import { ACTIVES, nbConfirmes, nomAgent, premierDuMois, type Mission, type StatutAffectation } from '../../lib/missions'

type Vue = 'mois' | 'semaine'

function Pastille({ m, statut, manque, ouvrir }: { m: Mission; statut?: StatutAffectation; manque?: number; ouvrir: () => void }) {
  const classe = statut ? STATUTS[statut].classe : 'bg-white text-nuit-900 ring-1 ring-dashed ring-or-500'
  return (
    <button
      onClick={ouvrir}
      title={`${m.site_nom} — ${statut ? STATUTS[statut].libelle : `${manque} agent(s) manquant(s)`}`}
      className={`mx-auto block w-[62px] rounded-md px-1 py-1 text-center text-[11px] font-semibold leading-tight ${classe}`}
    >
      {m.hDebut}
      <br />
      {manque ? `−${manque}` : m.hFin}
    </button>
  )
}

export default function PlanningMissions() {
  const { admin } = useDroitsMissions()
  const { annee, mois, donnees, erreur, recharger, changerMois, allerA } = useMois()
  const [vue, setVue] = useState<Vue>('mois')
  const ajd = aujourdhuiIso()
  const debutMois = premierDuMois(annee, mois)
  const [semaine, setSemaine] = useState(ajd.startsWith(debutMois.slice(0, 7)) ? ajd : debutMois)
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [formulaire, setFormulaire] = useState<'creer' | 'modifier' | null>(null)

  const tousJours = joursDuMois(annee, mois)
  const semaineVisible = tousJours.includes(semaine) ? semaine : debutMois
  const jours = vue === 'mois' ? tousJours : semaineDe(semaineVisible).filter((j) => tousJours.includes(j))

  const missions = (donnees?.missions ?? []).filter((m) => m.statut !== 'annulee')
  const mission = donnees?.missions.find((m) => m.id === ouverte)
  const engagesIds = new Set(missions.flatMap((m) => m.affectations.filter((a) => ACTIVES.includes(a.statut)).map((a) => a.agent_id)))
  const lignes = (donnees?.agents ?? []).filter((a) => a.actif || engagesIds.has(a.id))
  const aPourvoir = (j: string) => missions.filter((m) => m.date === j && nbConfirmes(m) < m.nb_agents_requis)

  const deplacerSemaine = (sens: 1 | -1) => {
    const cible = ajouterJours(semaineVisible, 7 * sens)
    if (tousJours.includes(cible)) setSemaine(cible)
    else {
      changerMois(sens)
      setSemaine(cible)
    }
  }

  return (
    <CadreAdmin actif="plannings">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-nuit-900">Planning des missions</h1>
        {admin && (
          <button onClick={() => setFormulaire('creer')} className="flex items-center gap-1.5 rounded-lg bg-or-500 px-3.5 py-2 text-[13px] font-bold text-nuit-900 shadow-sm active:bg-or-600">
            <LuPlus className="h-4 w-4" /> Créer une mission
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <NavMois annee={annee} mois={mois} changer={changerMois} />
        <div className="flex items-center gap-1 text-[12px] font-semibold">
          {vue === 'semaine' && (
            <>
              <button onClick={() => deplacerSemaine(-1)} className="rounded-md px-2 py-1.5 text-nuit-700 hover:bg-fond" aria-label="Semaine précédente">
                ‹ Sem.
              </button>
              <button onClick={() => deplacerSemaine(1)} className="mr-2 rounded-md px-2 py-1.5 text-nuit-700 hover:bg-fond" aria-label="Semaine suivante">
                Sem. ›
              </button>
            </>
          )}
          {(['mois', 'semaine'] as Vue[]).map((v) => (
            <button key={v} onClick={() => setVue(v)} className={`rounded-md px-3 py-1.5 ${vue === v ? 'bg-or-500 text-nuit-900' : 'text-nuit-700 hover:bg-fond'}`}>
              {v === 'mois' ? 'Mois' : 'Semaine'}
            </button>
          ))}
        </div>
      </div>

      {erreur && <p className="rounded-xl bg-red-50 p-4 text-[13px] text-red-800">{erreur}</p>}
      {!donnees && !erreur && <p className="p-6 text-center text-[13px] text-nuit-600">Chargement…</p>}

      {donnees && (
        <>
          <BandeauPlanning planning={donnees.planning} missions={donnees.missions} recharger={recharger} />

          {lignes.length === 0 && missions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-trait bg-white p-8 text-center text-[14px] font-semibold text-nuit-900">Aucun agent ni mission pour ce mois.</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-trait bg-white">
              <table className="w-full border-collapse text-[12px]">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 w-[130px] min-w-[130px] border-b border-r border-trait bg-white" />
                    {jours.map((j) => (
                      <th key={j} className={`min-w-[74px] border-b border-r border-trait px-1 py-2 font-semibold ${j === ajd ? 'bg-or-300/30 text-nuit-900' : 'text-nuit-900'}`}>
                        <span className="block">{jourSemaineCourt(j)}</span>
                        <span className="block">{numeroJour(j)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-or-300/10">
                    <td className="sticky left-0 z-10 border-b border-r border-trait bg-[#fffbeb] px-3 py-2 font-bold text-nuit-900">À pourvoir</td>
                    {jours.map((j) => (
                      <td key={j} className="h-[52px] border-b border-r border-trait px-1 py-1 align-middle">
                        <div className="space-y-1">
                          {aPourvoir(j).map((m) => (
                            <Pastille key={m.id} m={m} manque={m.nb_agents_requis - nbConfirmes(m)} ouvrir={() => setOuverte(m.id)} />
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                  {lignes.map((a) => (
                    <tr key={a.id}>
                      <td className="sticky left-0 z-10 border-b border-r border-trait bg-white px-3 py-2 font-semibold text-nuit-900">
                        <span className="line-clamp-2">{nomAgent(a)}</span>
                      </td>
                      {jours.map((j) => (
                        <td key={j} className="h-[52px] border-b border-r border-trait px-1 py-1 align-middle">
                          <div className="space-y-1">
                            {missions
                              .filter((m) => m.date === j)
                              .flatMap((m) => m.affectations.filter((x) => x.agent_id === a.id && ACTIVES.includes(x.statut)).map((x) => ({ m, x })))
                              .map(({ m, x }) => (
                                <Pastille key={x.id} m={m} statut={x.statut} ouvrir={() => setOuverte(m.id)} />
                              ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[12px] text-nuit-700">
            {(['confirmee', 'acceptee', 'proposee'] as StatutAffectation[]).map((s) => (
              <span key={s} className="flex items-center gap-2">
                <span className={`h-3 w-3 rounded ${STATUTS[s].classe}`} /> {STATUTS[s].libelle}
              </span>
            ))}
            <span className="flex items-center gap-2">
              <span className="h-3 w-3 rounded bg-white ring-1 ring-or-500" /> Agents manquants (−n)
            </span>
            {vue === 'semaine' && <span className="text-nuit-600">Semaine du {dateCourte(jours[0])}</span>}
          </div>

          {mission && formulaire !== 'modifier' && (
            <DetailMission mission={mission} donnees={donnees} fermer={() => setOuverte(null)} recharger={recharger} modifier={() => setFormulaire('modifier')} />
          )}
          {formulaire && (
            <FormulaireMission
              mission={formulaire === 'modifier' ? mission : undefined}
              dateDefaut={vue === 'semaine' ? jours[0] : ajd.startsWith(debutMois.slice(0, 7)) ? ajd : debutMois}
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
