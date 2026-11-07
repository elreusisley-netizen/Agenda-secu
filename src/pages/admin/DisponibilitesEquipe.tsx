import { useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuMoon, LuSearch, LuSun } from 'react-icons/lu'
import { CadreAdmin } from '../../components/admin/CadreAdmin'
import { Fenetre, memoriserMois, moisCourant, useEstPetit, usePeriode } from '../../components/admin/missions'
import { MOIS_COURTS, ajouterJours, aujourdhuiIso, dateCourte, joursDuMois, semaineDe, titreMois, versDate, versIso } from '../../lib/dates'
import { COULEUR_DISPO, LIBELLE_DISPO, STATUTS_DISPO, type Creneau, type StatutDispo } from '../../lib/disponibilites'
import { ENGAGEES, nomAgent, premierDuMois, type AgentCourt } from '../../lib/missions'

type Vue = 'semaine' | 'mois'
const JOURS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']
const TEINTES_AVATAR = ['#1e293b', '#334155', '#4338ca', '#0f766e', '#b45309', '#be123c', '#6d28d9', '#0369a1']
const initiales = (a: AgentCourt) => ((a.prenom?.[0] ?? '') + (a.nom?.[0] ?? '')).toUpperCase() || '?'

export default function DisponibilitesEquipe() {
  const petit = useEstPetit()
  const ajd = aujourdhuiIso()
  const [vue, setVue] = useState<Vue>(() => (window.matchMedia('(max-width: 639px)').matches ? 'semaine' : 'mois'))
  const [ancre, setAncre] = useState(() => {
    const [a, m] = moisCourant()
    const debut = premierDuMois(a, m)
    return ajd.startsWith(debut.slice(0, 7)) ? ajd : debut
  })
  const [recherche, setRecherche] = useState('')
  const [detail, setDetail] = useState<{ agent: AgentCourt; jour: string } | null>(null)

  const d = versDate(ancre)
  const jours = vue === 'semaine' ? semaineDe(ancre) : joursDuMois(d.getFullYear(), d.getMonth())
  const { donnees, erreur } = usePeriode([...new Set(jours.map((j) => j.slice(0, 7)))])

  const deplacer = (sens: 1 | -1) => {
    const cible = vue === 'semaine' ? ajouterJours(ancre, 7 * sens) : versIso(new Date(d.getFullYear(), d.getMonth() + sens, 1, 12))
    setAncre(cible)
    const c = versDate(cible)
    memoriserMois(c.getFullYear(), c.getMonth())
  }

  const dispo = (agentId: string, jour: string, c: Creneau) => donnees?.dispos[`${agentId}|${jour}|${c}`] as StatutDispo | undefined
  const missionsDe = (agentId: string, jour: string) =>
    (donnees?.missions ?? []).filter((m) => m.date === jour && m.statut !== 'annulee' && m.affectations.some((a) => a.agent_id === agentId && ENGAGEES.includes(a.statut)))
  const agents = (donnees?.agents ?? []).filter((a) => a.actif).filter((a) => nomAgent(a).toLowerCase().includes(recherche.trim().toLowerCase()))
  const compte = (jour: string, c: Creneau) => agents.filter((a) => dispo(a.id, jour, c) === 'disponible').length
  const renseignes = (agentId: string) => jours.filter((j) => dispo(agentId, j, 'jour') || dispo(agentId, j, 'nuit')).length

  const mini = petit && vue === 'semaine'
  const largeurNoms = mini ? 62 : petit ? 96 : vue === 'mois' ? 150 : 180
  const largeurJour = mini ? 0 : vue === 'mois' ? 27 : 96
  const fin = versDate(jours[jours.length - 1])
  const libelle =
    vue === 'semaine'
      ? `${versDate(jours[0]).getDate()} ${MOIS_COURTS[versDate(jours[0]).getMonth()]} – ${fin.getDate()} ${MOIS_COURTS[fin.getMonth()]} ${fin.getFullYear()}`
      : titreMois(d.getFullYear(), d.getMonth())

  const Moitie = ({ s, haut }: { s?: StatutDispo; haut: boolean }) => (
    <span className={`block h-1/2 ${s ? COULEUR_DISPO[s] : 'bg-slate-100'} ${haut ? 'border-b border-white' : ''}`} />
  )

  return (
    <CadreAdmin actif="disponibilites">
      <h1 className="mb-4 text-[22px] font-bold text-nuit-900">Disponibilités</h1>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-trait bg-white">
          <button onClick={() => deplacer(-1)} aria-label="Période précédente" className="p-2 hover:bg-fond">
            <LuChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[150px] text-center text-[13px] font-semibold text-nuit-900">{libelle}</span>
          <button onClick={() => deplacer(1)} aria-label="Période suivante" className="p-2 hover:bg-fond">
            <LuChevronRight className="h-4 w-4" />
          </button>
        </div>
        <button onClick={() => setAncre(ajd)} className="rounded-lg border border-trait bg-white px-3 py-2 text-[13px] font-semibold text-nuit-900 hover:bg-fond">
          Aujourd’hui
        </button>
        <div className="flex rounded-lg border border-trait bg-white p-0.5 text-[12px] font-semibold">
          {(['semaine', 'mois'] as Vue[]).map((v) => (
            <button key={v} onClick={() => setVue(v)} className={`rounded-md px-3 py-1.5 ${vue === v ? 'bg-nuit-900 text-white' : 'text-nuit-700'}`}>
              {v === 'semaine' ? 'Semaine' : 'Mois'}
            </button>
          ))}
        </div>
        {(donnees?.agents.length ?? 0) > 6 && (
          <div className="relative min-w-[160px] flex-1 sm:max-w-[220px]">
            <LuSearch className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-nuit-600" />
            <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un agent" className="w-full rounded-lg border border-trait bg-white py-2 pl-8 pr-2 text-[13px] outline-none focus:border-or-500" />
          </div>
        )}
      </div>

      {erreur && <p className="rounded-xl bg-red-50 p-4 text-[13px] text-red-800">{erreur}</p>}
      {!donnees && !erreur && <p className="p-6 text-center text-[13px] text-nuit-600">Chargement…</p>}

      {donnees && (
        <>
          <div className={`overflow-x-auto border border-trait bg-white shadow-sm ${mini ? '-mx-2 rounded-xl' : 'rounded-2xl'}`}>
            <table className="table-fixed border-collapse" style={{ width: mini ? '100%' : `max(100%, ${largeurNoms + jours.length * largeurJour}px)` }}>
              <thead>
                <tr className="bg-[#f8fafc]">
                  <th className="sticky left-0 z-20 border-b border-r border-trait bg-[#f8fafc]" style={{ width: largeurNoms, minWidth: largeurNoms }} />
                  {jours.map((j) => {
                    const dj = versDate(j)
                    const weekend = dj.getDay() === 0 || dj.getDay() === 6
                    return (
                      <th key={j} className={`border-b border-r border-trait px-0 py-1.5 text-center ${weekend ? 'bg-slate-100/70' : ''}`} style={largeurJour ? { width: largeurJour, minWidth: largeurJour } : undefined}>
                        <span className={`block font-semibold text-nuit-600 ${vue === 'mois' || mini ? 'text-[9px]' : 'text-[10px] tracking-wider'}`}>{vue === 'mois' ? JOURS[dj.getDay()][0] : JOURS[dj.getDay()]}</span>
                        <span className={`mx-auto mt-0.5 flex items-center justify-center rounded-full font-bold ${vue === 'mois' ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-[14px]'} ${j === ajd ? 'bg-or-500 text-nuit-900' : 'text-nuit-900'}`}>
                          {dj.getDate()}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                <tr className="bg-[#f0fdf4]">
                  <td className={`sticky left-0 z-10 border-b border-r border-trait bg-[#f0fdf4] ${mini ? 'px-1 py-1' : 'px-3 py-1.5'}`}>
                    <span className={`block font-bold leading-tight text-nuit-900 ${mini ? 'text-[10px]' : 'text-[12px]'}`}>Disponibles</span>
                  </td>
                  {jours.map((j) => (
                    <td key={j} className="border-b border-r border-trait px-0 py-1 text-center text-[10px] font-semibold leading-tight text-dispo-fonce">
                      <span className="flex items-center justify-center gap-0.5">
                        <LuSun className="h-2.5 w-2.5" />
                        {compte(j, 'jour')}
                      </span>
                      <span className="flex items-center justify-center gap-0.5">
                        <LuMoon className="h-2.5 w-2.5" />
                        {compte(j, 'nuit')}
                      </span>
                    </td>
                  ))}
                </tr>
                {agents.map((a, i) => (
                  <tr key={a.id}>
                    <td className={`sticky left-0 z-10 border-b border-r border-trait bg-white ${mini ? 'px-1 py-1.5' : 'px-2 py-1.5 sm:px-3'}`}>
                      <span className={`flex items-center ${mini ? 'flex-col gap-0.5 text-center' : 'gap-2'}`}>
                        <span className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${mini ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-[11px]'}`} style={{ background: TEINTES_AVATAR[i % TEINTES_AVATAR.length] }}>
                          {initiales(a)}
                        </span>
                        <span className={`min-w-0 ${mini ? 'w-full' : ''}`}>
                          <span className={`block truncate font-semibold leading-tight text-nuit-900 ${mini ? 'text-[10px]' : 'text-[13px]'}`}>{petit ? a.prenom || a.nom : nomAgent(a)}</span>
                          <span className={`block text-nuit-600 ${mini ? 'text-[9px]' : 'text-[11px]'}`}>
                            {renseignes(a.id)}/{jours.length} j
                          </span>
                        </span>
                      </span>
                    </td>
                    {jours.map((j) => {
                      const enMission = missionsDe(a.id, j).length > 0
                      return (
                        <td key={j} className={`border-b border-r border-trait ${vue === 'mois' ? 'p-0.5' : 'p-1'}`}>
                          <button
                            onClick={() => setDetail({ agent: a, jour: j })}
                            className={`relative block w-full overflow-hidden rounded-md ${vue === 'mois' ? 'h-8' : 'h-11'}`}
                            aria-label={`${nomAgent(a)}, ${dateCourte(j)}`}
                          >
                            <Moitie s={dispo(a.id, j, 'jour')} haut />
                            <Moitie s={dispo(a.id, j, 'nuit')} haut={false} />
                            {enMission && <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-nuit-900 ring-2 ring-white" />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}
                {agents.length === 0 && (
                  <tr>
                    <td colSpan={jours.length + 1} className="p-8 text-center text-[13px] text-nuit-600">
                      {recherche ? 'Aucun agent ne correspond à la recherche.' : 'Aucun agent actif.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-nuit-700">
            {STATUTS_DISPO.map((s) => (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`h-3 w-3 rounded ${COULEUR_DISPO[s]}`} /> {LIBELLE_DISPO[s]}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-slate-100 ring-1 ring-trait" /> Non renseigné
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-nuit-900" /> Déjà en mission
            </span>
            <span className="text-nuit-600">Case : haut = journée, bas = nuit.</span>
          </div>

          {detail && (
            <Fenetre titre={nomAgent(detail.agent)} fermer={() => setDetail(null)}>
              <p className="mb-3 text-[14px] font-semibold text-nuit-900">{dateCourte(detail.jour)}</p>
              {(['jour', 'nuit'] as Creneau[]).map((c) => {
                const s = dispo(detail.agent.id, detail.jour, c)
                return (
                  <p key={c} className="mb-2 flex items-center justify-between rounded-lg bg-fond px-3 py-2.5 text-[14px] text-nuit-900">
                    <span className="flex items-center gap-2">
                      {c === 'jour' ? <LuSun className="h-4 w-4" /> : <LuMoon className="h-4 w-4" />} {c === 'jour' ? 'Journée' : 'Nuit'}
                    </span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${s ? COULEUR_DISPO[s] : 'bg-white text-nuit-600'}`}>{s ? LIBELLE_DISPO[s] : 'Non renseigné'}</span>
                  </p>
                )
              })}
              {missionsDe(detail.agent.id, detail.jour).map((m) => (
                <p key={m.id} className="mt-2 rounded-lg border border-trait px-3 py-2.5 text-[13px] text-nuit-900">
                  <b>En mission</b> {m.hDebut}–{m.hFin} · {m.site_nom}
                </p>
              ))}
            </Fenetre>
          )}
        </>
      )}
    </CadreAdmin>
  )
}
