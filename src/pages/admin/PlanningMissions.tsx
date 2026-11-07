import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { LuCheck, LuChevronLeft, LuChevronRight, LuClock, LuPlus, LuSearch } from 'react-icons/lu'
import { CadreAdmin } from '../../components/admin/CadreAdmin'
import { BandeauPlanning, DetailMission, FormulaireMission, memoriserMois, moisCourant, useDroitsMissions } from '../../components/admin/missions'
import { MOIS_COURTS, ajouterJours, aujourdhuiIso, joursDuMois, semaineDe, titreMois, versDate, versIso } from '../../lib/dates'
import { ACTIVES, chargerMois, nbConfirmes, nomAgent, premierDuMois, type AgentCourt, type DonneesMois, type Mission, type Planning, type StatutAffectation } from '../../lib/missions'

type Vue = 'semaine' | 'mois'
const JOURS = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']

// ---------- Couleurs ----------
/** Une couleur par site, toujours la même pour un site donné. */
const PALETTE = [
  { fond: '#4f46e5', clair: '#eef2ff', texte: '#ffffff' }, // indigo
  { fond: '#0d9488', clair: '#f0fdfa', texte: '#ffffff' }, // sarcelle
  { fond: '#16a34a', clair: '#f0fdf4', texte: '#ffffff' }, // vert
  { fond: '#eab308', clair: '#fefce8', texte: '#1c1917' }, // jaune
  { fond: '#db2777', clair: '#fdf2f8', texte: '#ffffff' }, // rose
  { fond: '#0284c7', clair: '#f0f9ff', texte: '#ffffff' }, // bleu
  { fond: '#9333ea', clair: '#faf5ff', texte: '#ffffff' }, // violet
  { fond: '#ea580c', clair: '#fff7ed', texte: '#ffffff' }, // orange
]
function couleurDe(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return PALETTE[h % PALETTE.length]
}
const TEINTES_AVATAR = ['#1e293b', '#334155', '#4338ca', '#0f766e', '#b45309', '#be123c', '#6d28d9', '#0369a1']
const initiales = (a: AgentCourt) => ((a.prenom?.[0] ?? '') + (a.nom?.[0] ?? '')).toUpperCase() || '?'

// ---------- Données d'une période (une semaine peut couvrir deux mois) ----------
function usePeriode(mois: string[]) {
  const cle = mois.join(',')
  const [donnees, setDonnees] = useState<(DonneesMois & { plannings: Planning[] }) | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    try {
      const parts = await Promise.all(
        cle.split(',').map((m) => {
          const [a, mm] = m.split('-').map(Number)
          return chargerMois(a, mm - 1)
        }),
      )
      setDonnees({
        planning: parts[0].planning,
        plannings: parts.map((p) => p.planning).filter((p): p is Planning => !!p),
        missions: parts.flatMap((p) => p.missions),
        agents: parts[0].agents,
        dispos: Object.assign({}, ...parts.map((p) => p.dispos)),
      })
      setErreur(null)
    } catch {
      setErreur('Impossible de charger le planning. Vérifiez votre connexion puis réessayez.')
    }
  }, [cle])

  useEffect(() => {
    void recharger()
  }, [recharger])
  return { donnees, erreur, recharger }
}

// ---------- Blocs ----------
function Bloc({ m, statut, compact, ouvrir }: { m: Mission; statut: StatutAffectation; compact?: boolean; ouvrir: () => void }) {
  const c = couleurDe(m.site_id)
  const confirme = statut === 'confirmee'
  const style: CSSProperties = confirme
    ? { background: c.fond, color: c.texte, borderColor: c.fond }
    : { background: c.clair, color: '#0f172a', borderColor: c.fond, borderStyle: statut === 'proposee' ? 'dashed' : 'solid' }
  const libelle = statut === 'confirmee' ? 'Confirmée' : statut === 'acceptee' ? 'Acceptée — à confirmer' : 'Proposée — en attente'
  const Icone = confirme ? LuCheck : LuClock

  if (compact) {
    return (
      <button onClick={ouvrir} title={`${m.site_nom} · ${m.hDebut}–${m.hFin} · ${libelle}`} style={style} className="block w-full truncate rounded border px-1 py-0.5 text-left text-[10px] font-bold leading-tight">
        {m.hDebut.replace(':00', 'h')}–{m.hFin.replace(':00', 'h')}
      </button>
    )
  }
  return (
    <button onClick={ouvrir} title={libelle} style={style} className="relative block w-full rounded-lg border-2 px-2 py-1.5 text-left shadow-sm transition active:scale-[0.97]">
      <span className="block whitespace-nowrap pr-4 text-[11px] font-semibold leading-tight opacity-90">
        {m.hDebut}–{m.hFin}
      </span>
      <span className="mt-0.5 block truncate text-[12px] font-bold leading-tight">{m.site_nom}</span>
      <span
        className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full"
        style={{ background: confirme ? 'rgba(255,255,255,.3)' : statut === 'acceptee' ? '#f59e0b' : '#cbd5e1', color: confirme ? 'inherit' : '#fff' }}
      >
        <Icone className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    </button>
  )
}

function BlocManquant({ m, manque, compact, ouvrir }: { m: Mission; manque: number; compact?: boolean; ouvrir: () => void }) {
  return (
    <button
      onClick={ouvrir}
      title={`${m.site_nom} — ${manque} agent(s) manquant(s)`}
      className={`block w-full rounded-lg border-2 border-dashed border-or-500 bg-white text-left text-nuit-900 ${compact ? 'truncate px-1 py-0.5 text-[10px] font-bold' : 'px-2 py-1.5'}`}
    >
      {compact ? (
        `−${manque} · ${m.hDebut.replace(':00', 'h')}`
      ) : (
        <>
          <span className="block text-[11px] font-semibold leading-tight">
            {m.hDebut}–{m.hFin}
          </span>
          <span className="mt-0.5 block truncate text-[12px] font-bold leading-tight">{m.site_nom}</span>
          <span className="mt-0.5 block text-[11px] font-bold text-red-600">
            {manque} agent{manque > 1 ? 's' : ''} manquant{manque > 1 ? 's' : ''}
          </span>
        </>
      )}
    </button>
  )
}

// ---------- Vue téléphone : la semaine jour par jour ----------
function ListeSemaine({
  jours,
  missions,
  agents,
  ajd,
  ouvrir,
}: {
  jours: string[]
  missions: Mission[]
  agents: AgentCourt[]
  ajd: string
  ouvrir: (id: string) => void
}) {
  const index = new Map(agents.map((a, i) => [a.id, { a, i }]))
  return (
    <div className="space-y-4">
      {jours.map((j) => {
        const dj = versDate(j)
        const duJour = missions.filter((m) => m.date === j)
        const manquantes = duJour.filter((m) => nbConfirmes(m) < m.nb_agents_requis)
        const vacations = duJour
          .flatMap((m) => m.affectations.filter((x) => ACTIVES.includes(x.statut) && index.has(x.agent_id)).map((x) => ({ m, x })))
          .sort((p, q) => p.m.debut.localeCompare(q.m.debut))
        return (
          <section key={j}>
            <h2 className="mb-2 flex items-center gap-2">
              <span className={`flex h-9 w-9 items-center justify-center rounded-full text-[15px] font-bold ${j === ajd ? 'bg-or-500 text-nuit-900' : 'bg-fond text-nuit-900'}`}>{dj.getDate()}</span>
              <span className="text-[14px] font-bold text-nuit-900">
                {['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][dj.getDay()]}
                <span className="font-normal text-nuit-600"> · {MOIS_COURTS[dj.getMonth()]}</span>
              </span>
              {j === ajd && <span className="rounded-full bg-or-300/50 px-2 py-0.5 text-[11px] font-semibold text-nuit-900">Aujourd’hui</span>}
            </h2>
            {vacations.length === 0 && manquantes.length === 0 && <p className="rounded-xl border border-dashed border-trait px-3 py-2.5 text-[13px] text-nuit-600">Aucune vacation</p>}
            <div className="space-y-2">
              {manquantes.map((m) => (
                <button key={m.id} onClick={() => ouvrir(m.id)} className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-or-500 bg-[#fffbeb] px-3 py-2.5 text-left">
                  <span className="w-[86px] shrink-0 text-[13px] font-bold text-nuit-900">
                    {m.hDebut}–{m.hFin}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-nuit-900">{m.site_nom}</span>
                    <span className="block text-[12px] font-bold text-red-600">
                      {m.nb_agents_requis - nbConfirmes(m)} agent{m.nb_agents_requis - nbConfirmes(m) > 1 ? 's' : ''} manquant{m.nb_agents_requis - nbConfirmes(m) > 1 ? 's' : ''}
                    </span>
                  </span>
                </button>
              ))}
              {vacations.map(({ m, x }) => {
                const { a, i } = index.get(x.agent_id)!
                const c = couleurDe(m.site_id)
                return (
                  <button
                    key={x.id}
                    onClick={() => ouvrir(m.id)}
                    className={`flex w-full items-center gap-3 overflow-hidden rounded-xl border bg-white py-2.5 pl-0 pr-3 text-left shadow-sm ${x.statut === 'proposee' ? 'border-dashed border-nuit-600/40' : 'border-trait'}`}
                  >
                    <span className="h-11 w-1.5 shrink-0 rounded-r" style={{ background: c.fond }} />
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: TEINTES_AVATAR[i % TEINTES_AVATAR.length] }}>
                      {initiales(a)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold text-nuit-900">{nomAgent(a)}</span>
                      <span className="block truncate text-[12px] text-nuit-700">
                        {m.hDebut}–{m.hFin} · {m.site_nom}
                      </span>
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUT_PUCE[x.statut]}`}>{STATUT_COURT[x.statut]}</span>
                  </button>
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
const STATUT_COURT: Partial<Record<StatutAffectation, string>> = { confirmee: 'Confirmée', acceptee: 'À confirmer', proposee: 'Proposée' }
const STATUT_PUCE: Partial<Record<StatutAffectation, string>> = {
  confirmee: 'bg-confirme-fond text-confirme-texte',
  acceptee: 'bg-attente/40 text-attente-fonce',
  proposee: 'bg-creneau-bleu text-creneau-bleu-texte',
}

// ---------- Écran ----------
export default function PlanningMissions() {
  const { admin } = useDroitsMissions()
  const ajd = aujourdhuiIso()
  const [vue, setVue] = useState<Vue>('semaine')
  const [ancre, setAncre] = useState(() => {
    const [a, m] = moisCourant()
    const debut = premierDuMois(a, m)
    return ajd.startsWith(debut.slice(0, 7)) ? ajd : debut
  })
  const [recherche, setRecherche] = useState('')
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [formulaire, setFormulaire] = useState<'creer' | 'modifier' | null>(null)

  const d = versDate(ancre)
  const jours = vue === 'semaine' ? semaineDe(ancre) : joursDuMois(d.getFullYear(), d.getMonth())
  const moisCouverts = [...new Set(jours.map((j) => j.slice(0, 7)))]
  const { donnees, erreur, recharger } = usePeriode(moisCouverts)

  // Mois de référence (bandeau de publication) : celui du jeudi de la semaine, ou le mois affiché.
  const moisRef = vue === 'semaine' ? jours[3].slice(0, 7) : ancre.slice(0, 7)
  useEffect(() => {
    const [a, m] = moisRef.split('-').map(Number)
    memoriserMois(a, m - 1)
  }, [moisRef])

  const deplacer = (sens: 1 | -1) => {
    if (vue === 'semaine') setAncre(ajouterJours(ancre, 7 * sens))
    else setAncre(versIso(new Date(d.getFullYear(), d.getMonth() + sens, 1, 12)))
  }

  const missions = useMemo(() => (donnees?.missions ?? []).filter((m) => m.statut !== 'annulee' && jours.includes(m.date)), [donnees, jours])
  const mission = donnees?.missions.find((m) => m.id === ouverte)
  const planningRef = donnees?.plannings.find((p) => p.mois.startsWith(moisRef)) ?? null
  const missionsRef = (donnees?.missions ?? []).filter((m) => planningRef && m.planning_id === planningRef.id)

  const engages = new Set(missions.flatMap((m) => m.affectations.filter((a) => ACTIVES.includes(a.statut)).map((a) => a.agent_id)))
  const lignes = (donnees?.agents ?? [])
    .filter((a) => a.actif || engages.has(a.id))
    .filter((a) => nomAgent(a).toLowerCase().includes(recherche.trim().toLowerCase()))
    .sort((x, y) => Number(engages.has(y.id)) - Number(engages.has(x.id)) || nomAgent(x).localeCompare(nomAgent(y)))

  const blocsDe = (agentId: string, jour: string) =>
    missions
      .filter((m) => m.date === jour)
      .flatMap((m) => m.affectations.filter((x) => x.agent_id === agentId && ACTIVES.includes(x.statut)).map((x) => ({ m, x })))
  const heuresSemaine = (agentId: string) =>
    missions
      .filter((m) => m.affectations.some((x) => x.agent_id === agentId && x.statut === 'confirmee'))
      .reduce((t, m) => t + (new Date(m.fin).getTime() - new Date(m.debut).getTime()) / 36e5, 0)
  const manquantes = (jour: string) => missions.filter((m) => m.date === jour && nbConfirmes(m) < m.nb_agents_requis)
  const sites = [...new Map(missions.map((m) => [m.site_id, m.site_nom])).entries()]

  const fin = versDate(jours[jours.length - 1])
  const libelle =
    vue === 'semaine'
      ? `${versDate(jours[0]).getDate()} ${MOIS_COURTS[versDate(jours[0]).getMonth()]} – ${fin.getDate()} ${MOIS_COURTS[fin.getMonth()]} ${fin.getFullYear()}`
      : titreMois(d.getFullYear(), d.getMonth())
  const compact = vue === 'mois'
  const colonne = compact ? 'w-[58px] min-w-[58px]' : 'w-[112px] min-w-[112px]'

  return (
    <CadreAdmin actif="plannings">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-nuit-900">Planning</h1>
        {admin && (
          <button onClick={() => setFormulaire('creer')} className="flex items-center gap-1.5 rounded-lg bg-or-500 px-3.5 py-2 text-[13px] font-bold text-nuit-900 shadow-sm active:bg-or-600">
            <LuPlus className="h-4 w-4" /> Créer une mission
          </button>
        )}
      </div>

      {/* Barre d'outils */}
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
          <BandeauPlanning planning={planningRef} missions={missionsRef} recharger={recharger} />

          {vue === 'semaine' && (
            <div className="sm:hidden">
              <ListeSemaine jours={jours} missions={missions} agents={lignes} ajd={ajd} ouvrir={setOuverte} />
            </div>
          )}
          <div className={`overflow-x-auto rounded-2xl border border-trait bg-white shadow-sm ${vue === 'semaine' ? 'hidden sm:block' : ''}`}>
            <table className="table-fixed border-collapse" style={{ width: `max(100%, ${170 + jours.length * (compact ? 58 : 112)}px)` }}>
              <thead>
                <tr className="bg-fond/60">
                  <th className="sticky left-0 z-20 w-[118px] min-w-[118px] border-b border-r border-trait bg-[#f8fafc] sm:w-[170px] sm:min-w-[170px]" />
                  {jours.map((j) => {
                    const dj = versDate(j)
                    const estAjd = j === ajd
                    const weekend = dj.getDay() === 0 || dj.getDay() === 6
                    return (
                      <th key={j} className={`${colonne} border-b border-r border-trait px-1 py-2 text-center ${weekend ? 'bg-slate-100/70' : ''}`}>
                        <span className="block text-[10px] font-semibold tracking-wider text-nuit-600">{JOURS[dj.getDay()]}</span>
                        <span className={`mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full font-bold ${compact ? 'text-[12px]' : 'text-[16px]'} ${estAjd ? 'bg-or-500 text-nuit-900' : 'text-nuit-900'}`}>
                          {dj.getDate()}
                        </span>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {missions.some((m) => nbConfirmes(m) < m.nb_agents_requis) && (
                  <tr>
                    <td className="sticky left-0 z-10 border-b border-r border-trait bg-[#fffbeb] px-3 py-2">
                      <span className="block text-[13px] font-bold text-nuit-900">À pourvoir</span>
                      <span className="hidden text-[11px] text-nuit-600 sm:block">Missions incomplètes</span>
                    </td>
                    {jours.map((j) => (
                      <td key={j} className="border-b border-r border-trait bg-[#fffbeb]/60 p-1 align-top">
                        <div className="space-y-1">
                          {manquantes(j).map((m) => (
                            <BlocManquant key={m.id} m={m} manque={m.nb_agents_requis - nbConfirmes(m)} compact={compact} ouvrir={() => setOuverte(m.id)} />
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                )}
                {lignes.map((a, i) => {
                  const h = heuresSemaine(a.id)
                  return (
                    <tr key={a.id} className="group">
                      <td className="sticky left-0 z-10 border-b border-r border-trait bg-white px-2 py-2 sm:px-3">
                        <span className="flex items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: TEINTES_AVATAR[i % TEINTES_AVATAR.length] }}>
                            {initiales(a)}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-semibold leading-tight text-nuit-900">
                              <span className="sm:hidden">{a.prenom || a.nom}</span>
                              <span className="hidden sm:inline">{nomAgent(a)}</span>
                            </span>
                            {h > 0 && <span className="block text-[11px] text-nuit-600">{Math.round(h * 10) / 10} h</span>}
                          </span>
                        </span>
                      </td>
                      {jours.map((j) => {
                        const weekend = [0, 6].includes(versDate(j).getDay())
                        return (
                          <td key={j} className={`h-[64px] border-b border-r border-trait p-1 align-top ${weekend ? 'bg-slate-50' : ''}`}>
                            <div className="space-y-1">
                              {blocsDe(a.id, j).map(({ m, x }) => (
                                <Bloc key={x.id} m={m} statut={x.statut} compact={compact} ouvrir={() => setOuverte(m.id)} />
                              ))}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}
                {lignes.length === 0 && (
                  <tr>
                    <td colSpan={jours.length + 1} className="p-8 text-center text-[13px] text-nuit-600">
                      {recherche ? 'Aucun agent ne correspond à la recherche.' : 'Aucun agent actif. Créez des agents dans « Agents ».'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Légende */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-nuit-700">
            {sites.map(([id, nom]) => (
              <span key={id} className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded" style={{ background: couleurDe(id).fond }} /> {nom}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-5 rounded bg-nuit-700" /> Confirmée
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-5 rounded border-2 border-nuit-600 bg-white" /> Acceptée, à confirmer
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-5 rounded border-2 border-dashed border-nuit-600 bg-white" /> Proposée
            </span>
          </div>

          {mission && formulaire !== 'modifier' && (
            <DetailMission mission={mission} donnees={donnees} fermer={() => setOuverte(null)} recharger={recharger} modifier={() => setFormulaire('modifier')} />
          )}
          {formulaire && (
            <FormulaireMission
              mission={formulaire === 'modifier' ? mission : undefined}
              dateDefaut={jours.includes(ajd) ? ajd : jours[0]}
              donnees={donnees}
              fermer={() => setFormulaire(null)}
              apres={(date) => {
                setFormulaire(null)
                if (jours.includes(date)) void recharger()
                else setAncre(date)
              }}
            />
          )}
        </>
      )}
    </CadreAdmin>
  )
}
