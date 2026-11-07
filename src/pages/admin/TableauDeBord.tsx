import { CadreAdmin } from '../../components/admin/CadreAdmin'
import { COURBE_30_JOURS, INDICATEURS } from '../../demo/donnees-demo'
import { Lien } from '../../lib/routeur'

function Indicateur({ libelle, valeur, couleur, vers }: { libelle: string; valeur: string; couleur: string; vers: string }) {
  return (
    <Lien vers={vers} className="rounded-2xl border border-trait bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:border-nuit-600/30">
      <p className={`text-[12px] font-medium ${couleur === 'text-emerald-600' ? 'text-emerald-600' : 'text-nuit-700'}`}>{libelle}</p>
      <p className={`mt-1.5 text-[26px] font-extrabold leading-none ${couleur}`}>{valeur}</p>
    </Lien>
  )
}

/** Courbe des missions cumulées sur 30 jours (SVG dessiné à la main, sans bibliothèque). */
function Courbe() {
  const L = 520
  const H = 200
  const g = 34
  const b = 22
  const max = 80
  const x = (i: number) => g + (i / (COURBE_30_JOURS.length - 1)) * (L - g - 8)
  const y = (v: number) => 8 + (1 - v / max) * (H - b - 8)
  const points = COURBE_30_JOURS.map((v, i) => `${x(i)},${y(v)}`).join(' ')
  const aire = `M${x(0)},${y(0)} L${points.replaceAll(' ', ' L')} L${x(COURBE_30_JOURS.length - 1)},${y(0)} Z`
  return (
    <svg viewBox={`0 0 ${L} ${H}`} className="h-auto w-full" role="img" aria-label="Missions cumulées sur les 30 derniers jours">
      <defs>
        <linearGradient id="aire-or" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffc414" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#ffc414" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0, 20, 40, 60, 80].map((v) => (
        <g key={v}>
          <line x1={g} x2={L - 8} y1={y(v)} y2={y(v)} stroke="#eef0f3" />
          <text x={g - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill="#8a93a4">
            {v}
          </text>
        </g>
      ))}
      {[0, 5, 10, 15, 20, 25, 29].map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="#8a93a4">
          J{i + 1}
        </text>
      ))}
      <path d={aire} fill="url(#aire-or)" />
      <polyline points={points} fill="none" stroke="#ffc414" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

function Anneau({ couvertes, aPourvoir }: { couvertes: number; aPourvoir: number }) {
  const total = couvertes + aPourvoir
  const taux = Math.round((couvertes / total) * 100)
  const r = 52
  const c = 2 * Math.PI * r
  const partVerte = (couvertes / total) * c
  return (
    <svg viewBox="0 0 140 140" className="h-40 w-40" role="img" aria-label={`${taux} % des missions couvertes`}>
      <circle cx="70" cy="70" r={r} fill="none" stroke="#ff9f1c" strokeWidth="16" />
      <circle
        cx="70"
        cy="70"
        r={r}
        fill="none"
        stroke="#22c55e"
        strokeWidth="16"
        strokeDasharray={`${partVerte} ${c}`}
        transform="rotate(-90 70 70)"
      />
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
  const { agentsActifs, missionsMois, aPourvoir, couvertes } = INDICATEURS
  const taux = Math.round((couvertes / missionsMois) * 100)
  return (
    <CadreAdmin actif="tableau">
      <h1 className="mb-5 text-[22px] font-bold text-nuit-900">Tableau de bord</h1>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Indicateur libelle="Agents actifs" valeur={String(agentsActifs)} couleur="text-nuit-900" vers="/admin/agents" />
        <Indicateur libelle="Missions ce mois" valeur={String(missionsMois)} couleur="text-blue-700" vers="/admin/plannings" />
        <Indicateur libelle="À pourvoir" valeur={String(aPourvoir)} couleur="text-red-600" vers="/admin/plannings" />
        <Indicateur libelle="Taux de couverture" valeur={`${taux} %`} couleur="text-emerald-600" vers="/admin/plannings" />
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <div className="rounded-2xl border border-trait bg-white p-5">
          <h2 className="mb-3 text-[13px] font-bold text-nuit-900">Missions (30 derniers jours)</h2>
          <Courbe />
        </div>
        <div className="rounded-2xl border border-trait bg-white p-5">
          <h2 className="mb-2 text-[13px] font-bold text-nuit-900">Statut des missions</h2>
          <div className="flex flex-col items-center">
            <Anneau couvertes={couvertes} aPourvoir={aPourvoir} />
            <div className="mt-3 space-y-1.5 self-start text-[12px] text-nuit-700">
              <p className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" /> Couvertes ({couvertes})
              </p>
              <p className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-600" /> À pourvoir ({aPourvoir})
              </p>
            </div>
          </div>
        </div>
      </section>
      <p className="mt-4 text-xs text-nuit-600">Chiffres d’exemple : les indicateurs réels seront bientôt disponibles.</p>
    </CadreAdmin>
  )
}
