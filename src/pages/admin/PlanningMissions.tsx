import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { LuCheck, LuChevronLeft, LuChevronRight, LuClock, LuFileSpreadsheet, LuPlus, LuSearch } from 'react-icons/lu'
import { ImportExcel } from '../../components/admin/ImportExcel'
import { CadreAdmin } from '../../components/admin/CadreAdmin'
import { BandeauPlanning, DetailMission, FormulaireMission, memoriserMois, moisCourant, useDroitsMissions, useEstPetit, usePeriode } from '../../components/admin/missions'
import { MOIS_COURTS, ajouterJours, aujourdhuiIso, joursDuMois, semaineDe, titreMois, versDate, versIso } from '../../lib/dates'
import { ACTIVES, nbConfirmes, nomAgent, premierDuMois, type AgentCourt, type Mission, type StatutAffectation } from '../../lib/missions'

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
function hachage(id: string) {
  let h = 0
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h % PALETTE.length
}
// Couleurs des sites affichés : chacun garde « sa » couleur, sauf si elle est déjà prise par un autre site visible.
let attribution = new Map<string, number>()
function attribuerCouleurs(ids: string[]) {
  const pris = new Set<number>()
  attribution = new Map()
  for (const id of [...new Set(ids)].sort()) {
    let i = hachage(id)
    for (let k = 0; k < PALETTE.length && pris.has(i); k++) i = (i + 1) % PALETTE.length
    pris.add(i)
    attribution.set(id, i)
  }
}
const couleurDe = (id: string) => PALETTE[attribution.get(id) ?? hachage(id)]
const TEINTES_AVATAR = ['#1e293b', '#334155', '#4338ca', '#0f766e', '#b45309', '#be123c', '#6d28d9', '#0369a1']
const initiales = (a: AgentCourt) => ((a.prenom?.[0] ?? '') + (a.nom?.[0] ?? '')).toUpperCase() || '?'

// ---------- Blocs ----------
const heureCourte = (h: string) => (h.endsWith(':00') ? String(Number(h.slice(0, 2))) + 'h' : h.replace(':', 'h'))

function Bloc({ m, statut, compact, mini, ouvrir }: { m: Mission; statut: StatutAffectation; compact?: boolean; mini?: boolean; ouvrir: () => void }) {
  const c = couleurDe(m.site_id)
  const confirme = statut === 'confirmee'
  const style: CSSProperties = confirme
    ? { background: c.fond, color: c.texte, borderColor: c.fond }
    : { background: c.clair, color: '#0f172a', borderColor: c.fond, borderStyle: statut === 'proposee' ? 'dashed' : 'solid' }
  const libelle = statut === 'confirmee' ? 'Confirmée' : statut === 'acceptee' ? 'Acceptée — à confirmer' : 'Proposée — en attente'
  const Icone = confirme ? LuCheck : LuClock

  if (mini) {
    return (
      <button onClick={ouvrir} title={`${m.site_nom} · ${m.hDebut}–${m.hFin} · ${libelle}`} style={style} className="relative block w-full rounded-md border px-0.5 py-1 text-center text-[10px] font-bold leading-[1.15]">
        {heureCourte(m.hDebut)}
        <br />
        {heureCourte(m.hFin)}
        <span className="mt-0.5 block truncate text-[8px] font-semibold uppercase opacity-90">{m.site_nom}</span>
        {!confirme && <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-1 ring-white" style={{ background: statut === 'acceptee' ? '#f59e0b' : '#94a3b8' }} />}
      </button>
    )
  }
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

function BlocManquant({ m, manque, compact, mini, ouvrir }: { m: Mission; manque: number; compact?: boolean; mini?: boolean; ouvrir: () => void }) {
  if (mini) {
    return (
      <button onClick={ouvrir} title={`${m.site_nom} — ${manque} agent(s) manquant(s)`} className="block w-full rounded-md border-2 border-dashed border-or-500 bg-white px-0.5 py-1 text-center text-[10px] font-bold leading-[1.15] text-nuit-900">
        {heureCourte(m.hDebut)}
        <span className="block text-red-600">−{manque}</span>
      </button>
    )
  }
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
  const [importOuvert, setImport] = useState(false)

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
  attribuerCouleurs(sites.map(([id]) => id))

  const fin = versDate(jours[jours.length - 1])
  const libelle =
    vue === 'semaine'
      ? `${versDate(jours[0]).getDate()} ${MOIS_COURTS[versDate(jours[0]).getMonth()]} – ${fin.getDate()} ${MOIS_COURTS[fin.getMonth()]} ${fin.getFullYear()}`
      : titreMois(d.getFullYear(), d.getMonth())
  const petit = useEstPetit()
  const compact = vue === 'mois'
  const mini = petit && vue === 'semaine' // téléphone : toute la semaine tient dans l'écran
  const largeurNoms = mini ? 62 : petit ? 96 : 170
  const colonne = mini ? '' : compact ? 'w-[58px] min-w-[58px]' : 'w-[112px] min-w-[112px]'

  return (
    <CadreAdmin actif="plannings">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-nuit-900">Planning</h1>
        {admin && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setImport(true)} className="flex items-center gap-1.5 rounded-lg border border-trait bg-white px-3.5 py-2 text-[13px] font-bold text-nuit-900 shadow-sm active:bg-fond">
              <LuFileSpreadsheet className="h-4 w-4 text-dispo-fonce" /> Importer Excel
            </button>
            <button onClick={() => setFormulaire('creer')} className="flex items-center gap-1.5 rounded-lg bg-or-500 px-3.5 py-2 text-[13px] font-bold text-nuit-900 shadow-sm active:bg-or-600">
              <LuPlus className="h-4 w-4" /> Créer une mission
            </button>
          </div>
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

          <div className={`overflow-x-auto border border-trait bg-white shadow-sm ${mini ? '-mx-2 rounded-xl' : 'rounded-2xl'}`}>
            <table className="table-fixed border-collapse" style={{ width: mini ? '100%' : `max(100%, ${largeurNoms + jours.length * (compact ? 58 : 112)}px)` }}>
              <thead>
                <tr className="bg-fond/60">
                  <th className="sticky left-0 z-20 border-b border-r border-trait bg-[#f8fafc]" style={{ width: largeurNoms, minWidth: largeurNoms }} />
                  {jours.map((j) => {
                    const dj = versDate(j)
                    const estAjd = j === ajd
                    const weekend = dj.getDay() === 0 || dj.getDay() === 6
                    return (
                      <th key={j} className={`${colonne} border-b border-r border-trait ${mini ? 'px-0 py-1.5' : 'px-1 py-2'} text-center ${weekend ? 'bg-slate-100/70' : ''}`}>
                        <span className={`block font-semibold text-nuit-600 ${mini ? 'text-[9px]' : 'text-[10px] tracking-wider'}`}>{JOURS[dj.getDay()]}</span>
                        <span className={`mx-auto mt-0.5 flex items-center justify-center rounded-full font-bold ${mini ? 'h-6 w-6 text-[12px]' : compact ? 'h-7 w-7 text-[12px]' : 'h-7 w-7 text-[16px]'} ${estAjd ? 'bg-or-500 text-nuit-900' : 'text-nuit-900'}`}>
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
                    <td className={`sticky left-0 z-10 border-b border-r border-trait bg-[#fffbeb] ${mini ? 'px-1 py-1.5' : 'px-3 py-2'}`}>
                      <span className={`block font-bold leading-tight text-nuit-900 ${mini ? 'text-[10px]' : 'text-[13px]'}`}>À pourvoir</span>
                      <span className="hidden text-[11px] text-nuit-600 sm:block">Missions incomplètes</span>
                    </td>
                    {jours.map((j) => (
                      <td key={j} className={`border-b border-r border-trait bg-[#fffbeb]/60 align-top ${mini ? 'p-0.5' : 'p-1'}`}>
                        <div className="space-y-1">
                          {manquantes(j).map((m) => (
                            <BlocManquant key={m.id} m={m} manque={m.nb_agents_requis - nbConfirmes(m)} compact={compact} mini={mini} ouvrir={() => setOuverte(m.id)} />
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
                      <td className={`sticky left-0 z-10 border-b border-r border-trait bg-white ${mini ? 'px-1 py-1.5' : 'px-2 py-2 sm:px-3'}`}>
                        <span className={`flex items-center ${mini ? 'flex-col gap-0.5 text-center' : 'gap-2'}`}>
                          <span className={`flex shrink-0 items-center justify-center rounded-full font-bold text-white ${mini ? 'h-7 w-7 text-[10px]' : 'h-8 w-8 text-[11px]'}`} style={{ background: TEINTES_AVATAR[i % TEINTES_AVATAR.length] }}>
                            {initiales(a)}
                          </span>
                          <span className={`min-w-0 ${mini ? 'w-full' : ''}`}>
                            <span className={`block truncate font-semibold leading-tight text-nuit-900 ${mini ? 'text-[10px]' : 'text-[13px]'}`}>{petit ? a.prenom || a.nom : nomAgent(a)}</span>
                            {h > 0 && <span className={`block text-nuit-600 ${mini ? 'text-[9px]' : 'text-[11px]'}`}>{Math.round(h * 10) / 10} h</span>}
                          </span>
                        </span>
                      </td>
                      {jours.map((j) => {
                        const weekend = [0, 6].includes(versDate(j).getDay())
                        return (
                          <td key={j} className={`border-b border-r border-trait align-top ${mini ? 'h-[58px] p-0.5' : 'h-[64px] p-1'} ${weekend ? 'bg-slate-50' : ''}`}>
                            <div className={mini ? 'space-y-0.5' : 'space-y-1'}>
                              {blocsDe(a.id, j).map(({ m, x }) => (
                                <Bloc key={x.id} m={m} statut={x.statut} compact={compact} mini={mini} ouvrir={() => setOuverte(m.id)} />
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

          {importOuvert && (
            <ImportExcel
              agents={donnees.agents}
              fermer={() => {
                setImport(false)
                void recharger()
              }}
              apres={(date) => {
                setImport(false)
                if (jours.includes(date)) void recharger()
                else setAncre(date)
              }}
            />
          )}
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
