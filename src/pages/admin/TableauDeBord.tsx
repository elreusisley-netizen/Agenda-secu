import { useEffect, useState } from 'react'
import { CadreAdmin, RUBRIQUES, type RubriqueAdmin } from '../../components/admin/CadreAdmin'
import { useAuth } from '../../auth/AuthContexte'
import { COURBE_30_JOURS, INDICATEURS } from '../../demo/donnees-demo'
import { ajouterJours, aujourdhuiIso, versDate } from '../../lib/dates'
import { autorise } from '../../lib/droits'
import { modeDemo, supabase } from '../../lib/supabase'
import { Lien } from '../../lib/routeur'

/** Chiffres renvoyés par la fonction tableau_de_bord() (null = rubrique non autorisée pour ce chef). */
interface Donnees {
  agents_actifs: number | null
  chefs: number | null
  clients: number | null
  sites: number | null
  missions_mois: number | null
  postes_requis: number | null
  postes_couverts: number | null
  a_pourvoir: number | null
  reponses_en_attente: number | null
  plannings_publies: number | null
  disponibles_aujourdhui: number | null
  indisponibles_aujourdhui: number | null
  courbe_30_jours: { jour: string; missions: number }[] | null
}

function donneesDemo(): Donnees {
  const debut = ajouterJours(aujourdhuiIso(), -29)
  return {
    agents_actifs: INDICATEURS.agentsActifs,
    chefs: 3,
    clients: 12,
    sites: 27,
    missions_mois: INDICATEURS.missionsMois,
    postes_requis: INDICATEURS.missionsMois,
    postes_couverts: INDICATEURS.couvertes,
    a_pourvoir: INDICATEURS.aPourvoir,
    reponses_en_attente: 7,
    plannings_publies: 2,
    disponibles_aujourdhui: 18,
    indisponibles_aujourdhui: 6,
    courbe_30_jours: COURBE_30_JOURS.map((v, i) => ({ jour: ajouterJours(debut, i), missions: i === 0 ? v : v - COURBE_30_JOURS[i - 1] })),
  }
}

function Indicateur({ libelle, valeur, couleur = 'text-nuit-900', vers, petit }: { libelle: string; valeur: string; couleur?: string; vers?: string; petit?: boolean }) {
  const contenu = (
    <>
      <p className={`text-[12px] font-medium ${couleur === 'text-emerald-600' ? 'text-emerald-600' : 'text-nuit-700'}`}>{libelle}</p>
      <p className={`mt-1.5 font-extrabold leading-none ${petit ? 'text-[22px]' : 'text-[26px]'} ${couleur}`}>{valeur}</p>
    </>
  )
  const classe = 'block rounded-2xl border border-trait bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]'
  return vers ? (
    <Lien vers={vers} className={`${classe} hover:border-nuit-600/30`}>
      {contenu}
    </Lien>
  ) : (
    <div className={classe}>{contenu}</div>
  )
}

/** Missions par jour sur 30 jours (SVG dessiné à la main, sans bibliothèque). */
function Courbe({ points }: { points: { jour: string; missions: number }[] }) {
  const L = 520
  const H = 200
  const g = 34
  const b = 22
  const brut = Math.max(4, ...points.map((p) => p.missions))
  const pas = Math.max(1, Math.ceil(brut / 4))
  const max = pas * 4
  const x = (i: number) => g + (i / Math.max(1, points.length - 1)) * (L - g - 8)
  const y = (v: number) => 8 + (1 - v / max) * (H - b - 8)
  const ligne = points.map((p, i) => `${x(i)},${y(p.missions)}`).join(' ')
  const aire = `M${x(0)},${y(0)} L${ligne.replaceAll(' ', ' L')} L${x(points.length - 1)},${y(0)} Z`
  const reperes = [0, 7, 14, 21, points.length - 1].filter((i) => i < points.length)
  const etiquette = (iso: string) => {
    const d = versDate(iso)
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  }
  return (
    <svg viewBox={`0 0 ${L} ${H}`} className="h-auto w-full" role="img" aria-label="Nombre de missions par jour sur les 30 derniers jours">
      <defs>
        <linearGradient id="aire-or" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffc414" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffc414" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3, 4].map((k) => (
        <g key={k}>
          <line x1={g} x2={L - 8} y1={y(k * pas)} y2={y(k * pas)} stroke="#eef0f3" />
          <text x={g - 8} y={y(k * pas) + 3.5} textAnchor="end" fontSize="10" fill="#8a93a4">
            {k * pas}
          </text>
        </g>
      ))}
      {reperes.map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'} fontSize="10" fill="#8a93a4">
          {etiquette(points[i].jour)}
        </text>
      ))}
      <path d={aire} fill="url(#aire-or)" />
      <polyline points={ligne} fill="none" stroke="#ffc414" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Anneau({ couvertes, aPourvoir }: { couvertes: number; aPourvoir: number }) {
  const total = couvertes + aPourvoir
  const r = 52
  const c = 2 * Math.PI * r
  if (total === 0) {
    return (
      <svg viewBox="0 0 140 140" className="h-40 w-40" role="img" aria-label="Aucune mission ce mois-ci">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e7e9ee" strokeWidth="16" />
        <text x="70" y="74" textAnchor="middle" fontSize="20" fontWeight="800" fill="#8a93a4">
          —
        </text>
      </svg>
    )
  }
  const taux = Math.round((couvertes / total) * 100)
  return (
    <svg viewBox="0 0 140 140" className="h-40 w-40" role="img" aria-label={`${taux} % des postes couverts`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#ff9f1c" strokeWidth="16" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="#22c55e" strokeWidth="16" strokeDasharray={`${(couvertes / total) * c} ${c}`} transform="rotate(-90 70 70)" />
      <text x="70" y="72" textAnchor="middle" fontSize="22" fontWeight="800" fill="#15803d">
        {taux} %
      </text>
      <text x="70" y="90" textAnchor="middle" fontSize="10" fill="#15803d">
        Couvertes
      </text>
    </svg>
  )
}

export default function TableauDeBord() {
  const { profil, droits } = useAuth()
  const [donnees, setDonnees] = useState<Donnees | null>(modeDemo ? donneesDemo() : null)
  const [erreur, setErreur] = useState<string | null>(null)

  useEffect(() => {
    if (modeDemo) return
    let actif = true
    supabase!.rpc('tableau_de_bord').then(({ data, error }) => {
      if (!actif) return
      if (error) setErreur('Impossible de charger les indicateurs. Vérifiez votre connexion, puis rechargez la page.')
      else setDonnees(data as Donnees)
    })
    return () => {
      actif = false
    }
  }, [])

  // Lien vers une rubrique seulement si la personne y a accès
  const lien = (r: RubriqueAdmin) => {
    const rub = RUBRIQUES.find((x) => x.id === r)
    return rub && autorise(rub.exigence, profil, droits) ? rub.vers : undefined
  }
  const n = (v: number | null | undefined) => (v === null || v === undefined ? null : String(v))

  const d = donnees
  const taux =
    d && d.postes_requis !== null && d.postes_couverts !== null
      ? d.postes_requis > 0
        ? `${Math.round((d.postes_couverts / d.postes_requis) * 100)} %`
        : '—'
      : null

  const principaux = d
    ? [
        { libelle: 'Agents actifs', valeur: n(d.agents_actifs), vers: lien('agents') },
        { libelle: 'Missions ce mois', valeur: n(d.missions_mois), couleur: 'text-blue-700', vers: lien('plannings') },
        { libelle: 'À pourvoir', valeur: n(d.a_pourvoir), couleur: 'text-red-600', vers: lien('plannings') },
        { libelle: 'Taux de couverture', valeur: taux, couleur: 'text-emerald-600', vers: lien('plannings') },
      ].filter((i) => i.valeur !== null)
    : []

  const secondaires = d
    ? [
        { libelle: 'Chefs d’équipe', valeur: n(d.chefs), vers: lien('parametres') },
        { libelle: 'Clients', valeur: n(d.clients), vers: lien('sites') },
        { libelle: 'Sites', valeur: n(d.sites), vers: lien('sites') },
        { libelle: 'Disponibles aujourd’hui', valeur: n(d.disponibles_aujourdhui), vers: lien('disponibilites') },
        { libelle: 'Indisponibles aujourd’hui', valeur: n(d.indisponibles_aujourdhui), vers: lien('disponibilites') },
        { libelle: 'Réponses en attente', valeur: n(d.reponses_en_attente), vers: lien('missions') },
        { libelle: 'Plannings publiés', valeur: n(d.plannings_publies), vers: lien('plannings') },
      ].filter((i) => i.valeur !== null)
    : []

  return (
    <CadreAdmin actif="tableau">
      <h1 className="mb-5 text-[22px] font-bold text-nuit-900">Tableau de bord</h1>

      {erreur && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {!d && !erreur && <p className="py-10 text-center text-sm text-nuit-600">Chargement des indicateurs…</p>}

      {d && (
        <>
          {principaux.length > 0 && (
            <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
              {principaux.map((i) => (
                <Indicateur key={i.libelle} libelle={i.libelle} valeur={i.valeur!} couleur={i.couleur} vers={i.vers} />
              ))}
            </section>
          )}

          {d.courbe_30_jours && d.postes_requis !== null && (
            <section className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
              <div className="rounded-2xl border border-trait bg-white p-5">
                <h2 className="mb-3 text-[13px] font-bold text-nuit-900">Missions (30 derniers jours)</h2>
                <Courbe points={d.courbe_30_jours} />
              </div>
              <div className="rounded-2xl border border-trait bg-white p-5">
                <h2 className="mb-2 text-[13px] font-bold text-nuit-900">Statut des missions</h2>
                <div className="flex flex-col items-center">
                  <Anneau couvertes={d.postes_couverts ?? 0} aPourvoir={d.a_pourvoir ?? 0} />
                  {d.postes_requis === 0 ? (
                    <p className="mt-3 text-center text-[12px] text-nuit-600">Aucune mission prévue ce mois-ci.</p>
                  ) : (
                    <div className="mt-3 space-y-1.5 self-start text-[12px] text-nuit-700">
                      <p className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" /> Couvertes ({d.postes_couverts})
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> À pourvoir ({d.a_pourvoir})
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {secondaires.length > 0 && (
            <section className="mt-6">
              <h2 className="mb-3 text-[15px] font-bold text-nuit-900">Vue d’ensemble</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {secondaires.map((i) => (
                  <Indicateur key={i.libelle} libelle={i.libelle} valeur={i.valeur!} vers={i.vers} petit />
                ))}
              </div>
            </section>
          )}

          {modeDemo && <p className="mt-4 text-xs text-nuit-600">Chiffres d’exemple (mode démonstration).</p>}
        </>
      )}
    </CadreAdmin>
  )
}
