import { useState, type FormEvent } from 'react'
import { LuChevronLeft, LuChevronRight, LuPlus, LuTriangleAlert, LuX } from 'react-icons/lu'
import { CadreAdmin } from '../../components/admin/CadreAdmin'
import { useDemo } from '../../demo/DemoContexte'
import { AGENTS, SITES, site, type AgentDemo, type CreneauPlanning } from '../../demo/donnees-demo'
import {
  MOIS_COURTS,
  ajouterJours,
  chevauche,
  dateCourte,
  deux,
  joursDuMois,
  jourSemaineCourt,
  moisSuivant,
  numeroJour,
  semaineDe,
  titreMois,
  versDate,
  versIso,
} from '../../lib/dates'

type Vue = 'mois' | 'semaine' | 'jour'

function Pastille({ c }: { c: CreneauPlanning }) {
  const confirme = c.statut === 'confirmee'
  return (
    <div
      title={`${site(c.siteId).nom} — ${confirme ? 'confirmée' : 'proposée, en attente de réponse'}`}
      className={`mx-auto w-[58px] rounded-md px-1 py-1 text-center text-[11px] font-semibold leading-tight ${
        confirme ? 'bg-confirme-fond text-confirme-texte' : 'bg-creneau-bleu text-creneau-bleu-texte'
      }`}
    >
      {c.debut}
      <br />
      {c.fin}
    </div>
  )
}

function Avatar({ a }: { a: AgentDemo }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white"
      style={{ background: a.teinte }}
    >
      {a.initiales}
    </span>
  )
}

function FormulaireMission({ fermer, dateDefaut }: { fermer: () => void; dateDefaut: string }) {
  const { creneaux, ajouterCreneau, afficherMessage } = useDemo()
  const [siteId, setSiteId] = useState(SITES[0].id)
  const [date, setDate] = useState(dateDefaut)
  const [debut, setDebut] = useState('09:00')
  const [fin, setFin] = useState('18:00')
  const [nombre, setNombre] = useState(1)
  const [agentId, setAgentId] = useState(AGENTS[0].id)
  const [consignes, setConsignes] = useState('')

  const conflit = creneaux.find((c) => c.agentId === agentId && c.date === date && chevauche(c.debut, c.fin, debut, fin))
  const agent = AGENTS.find((a) => a.id === agentId)

  const valider = (e: FormEvent) => {
    e.preventDefault()
    if (conflit) return
    ajouterCreneau({ agentId, date, debut, fin, siteId, statut: 'proposee' })
    afficherMessage(`Mission proposée à ${agent?.nom} (démo)`)
    fermer()
  }

  const champ = 'mt-1 w-full rounded-lg border border-trait bg-white px-3 py-2 text-sm outline-none focus:border-or-500'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={fermer} role="dialog" aria-modal="true">
      <form
        onSubmit={valider}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-nuit-900">Créer une mission</h2>
          <button type="button" onClick={fermer} aria-label="Fermer" className="p-1">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[13px] font-medium text-nuit-700">
          <label className="col-span-2">
            Site
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)} className={champ}>
              {SITES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nom} — {s.client}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 sm:col-span-1">
            Date
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={champ} />
          </label>
          <label className="col-span-2 sm:col-span-1">
            Agents nécessaires
            <input type="number" min={1} max={50} value={nombre} onChange={(e) => setNombre(Number(e.target.value))} className={champ} />
          </label>
          <label>
            Début
            <input type="time" required value={debut} onChange={(e) => setDebut(e.target.value)} className={champ} />
          </label>
          <label>
            Fin
            <input type="time" required value={fin} onChange={(e) => setFin(e.target.value)} className={champ} />
          </label>
          <label className="col-span-2">
            Agent à proposer
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={champ}>
              {AGENTS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nom}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2">
            Consignes
            <textarea rows={2} value={consignes} onChange={(e) => setConsignes(e.target.value)} className={champ} placeholder="Facultatif" />
          </label>
        </div>
        {fin <= debut && <p className="mt-3 text-xs text-nuit-600">Vacation de nuit : la fin est le lendemain.</p>}
        {conflit && (
          <p className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[13px] text-red-800">
            <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Chevauchement : {agent?.nom} a déjà une mission de {conflit.debut} à {conflit.fin} le {dateCourte(conflit.date)}
          </p>
        )}
        <p className="mt-3 text-xs text-nuit-600">Démo : la mission est ajoutée à la grille en « proposée », pour {nombre} agent(s) requis.</p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={fermer} className="rounded-xl bg-fond px-4 py-2.5 text-sm font-semibold">
            Annuler
          </button>
          <button type="submit" disabled={Boolean(conflit)} className="rounded-xl bg-or-500 px-4 py-2.5 text-sm font-bold text-nuit-900 disabled:opacity-50">
            Proposer la mission
          </button>
        </div>
      </form>
    </div>
  )
}

export default function PlanningMissions() {
  const { creneaux } = useDemo()
  const [vue, setVue] = useState<Vue>('mois')
  const [ancre, setAncre] = useState('2026-11-02')
  const [formulaire, setFormulaire] = useState(false)

  const d = versDate(ancre)
  const jours =
    vue === 'mois' ? joursDuMois(d.getFullYear(), d.getMonth()) : vue === 'semaine' ? semaineDe(ancre) : [ancre]

  const deplacer = (sens: 1 | -1) => {
    if (vue === 'mois') {
      const [a, m] = moisSuivant(d.getFullYear(), d.getMonth(), sens)
      setAncre(versIso(new Date(a, m, 1, 12)))
    } else setAncre(ajouterJours(ancre, vue === 'semaine' ? 7 * sens : sens))
  }

  const libellePeriode =
    vue === 'mois'
      ? titreMois(d.getFullYear(), d.getMonth())
      : vue === 'semaine'
        ? `${versDate(jours[0]).getDate()} – ${versDate(jours[6]).getDate()} ${MOIS_COURTS[versDate(jours[6]).getMonth()]} ${versDate(jours[6]).getFullYear()}`
        : dateCourte(ancre) + ' ' + d.getFullYear()

  const creneau = (agentId: string, iso: string) => creneaux.filter((c) => c.agentId === agentId && c.date === iso)

  return (
    <CadreAdmin actif="plannings">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-nuit-900">Planning des missions</h1>
        <button
          onClick={() => setFormulaire(true)}
          className="flex items-center gap-1.5 rounded-lg bg-or-500 px-3.5 py-2 text-[13px] font-bold text-nuit-900 shadow-sm active:bg-or-600"
        >
          <LuPlus className="h-4 w-4" /> Créer une mission
        </button>
      </div>

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-nuit-900">
          <button onClick={() => deplacer(-1)} aria-label="Période précédente" className="rounded-md p-1 hover:bg-fond">
            <LuChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[120px] text-center">{libellePeriode}</span>
          <button onClick={() => deplacer(1)} aria-label="Période suivante" className="rounded-md p-1 hover:bg-fond">
            <LuChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-1 text-[12px] font-semibold">
          {(['mois', 'semaine', 'jour'] as Vue[]).map((v) => (
            <button
              key={v}
              onClick={() => setVue(v)}
              className={`rounded-md px-3 py-1.5 ${vue === v ? 'bg-or-500 text-nuit-900' : 'text-nuit-700 hover:bg-fond'}`}
            >
              {v === 'mois' ? 'Mois' : v === 'semaine' ? 'Semaine' : 'Jour'}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-trait">
        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[150px] min-w-[150px] border-b border-r border-trait bg-white" />
              {jours.map((iso) => (
                <th key={iso} className={`border-b border-r border-trait px-1 py-2 font-semibold text-nuit-900 ${vue === 'jour' ? '' : 'min-w-[72px]'}`}>
                  <span className="block">{jourSemaineCourt(iso)}</span>
                  <span className="block">{numeroJour(iso)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {AGENTS.map((a) => (
              <tr key={a.id}>
                <td className="sticky left-0 z-10 border-b border-r border-trait bg-white px-3 py-2">
                  <span className="flex items-center gap-2 font-semibold text-nuit-900">
                    <Avatar a={a} />
                    {a.nom}
                  </span>
                </td>
                {jours.map((iso) => (
                  <td key={iso} className="h-[52px] border-b border-r border-trait px-1 py-1 align-middle">
                    {vue === 'jour' ? (
                      creneau(a.id, iso).map((c) => (
                        <p key={c.id} className="text-[13px] text-nuit-900">
                          <span className={`mr-2 inline-block rounded px-1.5 py-0.5 font-semibold ${c.statut === 'confirmee' ? 'bg-confirme-fond text-confirme-texte' : 'bg-creneau-bleu text-creneau-bleu-texte'}`}>
                            {c.debut} – {c.fin}
                          </span>
                          {site(c.siteId).nom}
                        </p>
                      ))
                    ) : (
                      <div className="space-y-1">
                        {creneau(a.id, iso).map((c) => (
                          <Pastille key={c.id} c={c} />
                        ))}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-nuit-700">
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-confirme-fond ring-1 ring-confirme-texte/30" /> Confirmée
        </span>
        <span className="flex items-center gap-2">
          <span className="h-3 w-3 rounded bg-creneau-bleu ring-1 ring-creneau-bleu-texte/30" /> Proposée, en attente de réponse
        </span>
        <span className="text-nuit-600">Agents et missions fictifs (démo).</span>
      </div>

      {formulaire && <FormulaireMission fermer={() => setFormulaire(false)} dateDefaut={vue === 'mois' ? `${d.getFullYear()}-${deux(d.getMonth() + 1)}-01` : jours[0]} />}
    </CadreAdmin>
  )
}
