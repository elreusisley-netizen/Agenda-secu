import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { LuArrowLeft, LuChevronLeft, LuChevronRight, LuTriangleAlert } from 'react-icons/lu'
import { CadreAdmin } from '../../components/admin/CadreAdmin'
import { BadgeStatut } from '../../components/agent/Badge'
import { useAuth } from '../../auth/AuthContexte'
import { useDemo } from '../../demo/DemoContexte'
import {
  CONTRATS,
  QUALIFICATIONS,
  affectationsAgent,
  changerActifDemo,
  chargerAgent,
  dispositionsDuMois,
  enregistrerAgent,
  historiqueAgent,
  type AffectationAgent,
  type Agent,
  type DispoJour,
  type LigneHistorique,
} from '../../lib/agents'
import { JOURS_COURTS, dateCourte, grilleMois, moisSuivant, titreMois, versDate } from '../../lib/dates'
import { gererComptes, modeDemo } from '../../lib/supabase'
import { Lien } from '../../lib/routeur'
import { BadgeCarte, Initiales } from './Agents'

type Onglet = 'infos' | 'dispos' | 'plannings' | 'historique'

// ---------- Onglet Informations ----------
function Champ({ libelle, children, large }: { libelle: string; children: ReactNode; large?: boolean }) {
  return (
    <label className={`text-[13px] font-medium text-nuit-700 ${large ? 'sm:col-span-2' : ''}`}>
      {libelle}
      {children}
    </label>
  )
}

function OngletInfos({ agent, modifiable, auChangement }: { agent: Agent; modifiable: boolean; auChangement: (a: Agent) => void }) {
  const { afficherMessage } = useDemo()
  const [f, setF] = useState<Agent>(agent)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const [autre, setAutre] = useState('')
  const modifie = JSON.stringify(f) !== JSON.stringify(agent)
  const maj = (k: keyof Agent) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const champ = 'mt-1 w-full rounded-lg border border-trait bg-white px-3 py-2.5 text-sm text-nuit-900 outline-none focus:border-or-500 disabled:bg-fond'

  const basculerQualif = (q: string) =>
    setF((x) => ({ ...x, qualifications: x.qualifications.includes(q) ? x.qualifications.filter((y) => y !== q) : [...x.qualifications, q] }))

  const enregistrer = async (e: FormEvent) => {
    e.preventDefault()
    if (!f.prenom.trim() || !f.nom.trim()) return setErreur('Le prénom et le nom sont obligatoires.')
    setEnCours(true)
    setErreur(null)
    const err = await enregistrerAgent(f)
    setEnCours(false)
    if (err) return setErreur(err)
    auChangement(f)
    afficherMessage('Fiche enregistrée')
  }

  const qualifs = Array.from(new Set([...QUALIFICATIONS, ...f.qualifications]))

  return (
    <form onSubmit={enregistrer} className="max-w-3xl">
      <fieldset disabled={!modifiable} className="grid gap-3 sm:grid-cols-2">
        <Champ libelle="Prénom">
          <input value={f.prenom} onChange={maj('prenom')} className={champ} />
        </Champ>
        <Champ libelle="Nom">
          <input value={f.nom} onChange={maj('nom')} className={champ} />
        </Champ>
        <Champ libelle="Adresse e-mail (identifiant de connexion)">
          <input value={f.email} disabled className={champ} />
        </Champ>
        <Champ libelle="Téléphone">
          <input type="tel" value={f.telephone ?? ''} onChange={maj('telephone')} className={champ} />
        </Champ>
        <Champ libelle="Matricule">
          <input value={f.matricule ?? ''} onChange={maj('matricule')} className={champ} />
        </Champ>
        <Champ libelle="Type de contrat">
          <select value={f.type_contrat ?? ''} onChange={maj('type_contrat')} className={champ}>
            <option value="">Non renseigné</option>
            {CONTRATS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Champ>
        <Champ libelle="N° de carte professionnelle (CNAPS)">
          <input value={f.carte_pro_numero ?? ''} onChange={maj('carte_pro_numero')} className={champ} placeholder="CAR-…" />
        </Champ>
        <Champ libelle="Date d’expiration de la carte">
          <input type="date" value={f.carte_pro_expiration ?? ''} onChange={maj('carte_pro_expiration')} className={champ} />
          <span className="mt-1 block">
            <BadgeCarte expiration={f.carte_pro_expiration} />
          </span>
        </Champ>

        <div className="sm:col-span-2">
          <p className="text-[13px] font-medium text-nuit-700">Qualifications</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {qualifs.map((q) => {
              const actif = f.qualifications.includes(q)
              return (
                <button
                  type="button"
                  key={q}
                  onClick={() => basculerQualif(q)}
                  className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${actif ? 'border-or-500 bg-or-500 text-nuit-900' : 'border-trait bg-white text-nuit-700'}`}
                  aria-pressed={actif}
                >
                  {q}
                </button>
              )
            })}
          </div>
          {modifiable && (
            <div className="mt-2 flex gap-2">
              <input value={autre} onChange={(e) => setAutre(e.target.value)} placeholder="Autre qualification" className="w-full max-w-xs rounded-lg border border-trait px-3 py-2 text-sm outline-none focus:border-or-500" />
              <button
                type="button"
                onClick={() => {
                  const q = autre.trim()
                  if (q && !f.qualifications.includes(q)) setF((x) => ({ ...x, qualifications: [...x.qualifications, q] }))
                  setAutre('')
                }}
                className="rounded-lg bg-fond px-3 py-2 text-sm font-semibold"
              >
                Ajouter
              </button>
            </div>
          )}
        </div>

        {modifiable && (
          <Champ libelle="Notes internes (visibles uniquement par l’administration)" large>
            <textarea rows={3} value={f.notes_internes ?? ''} onChange={maj('notes_internes')} className={champ} />
          </Champ>
        )}
      </fieldset>

      {erreur && (
        <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[13px] text-red-800">
          <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {erreur}
        </p>
      )}
      {modifiable && (
        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={!modifie || enCours} className="rounded-xl bg-or-500 px-5 py-2.5 text-sm font-bold text-nuit-900 disabled:opacity-50">
            {enCours ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          {modifie && (
            <button type="button" onClick={() => setF(agent)} className="rounded-xl bg-fond px-4 py-2.5 text-sm font-semibold">
              Annuler les modifications
            </button>
          )}
        </div>
      )}
    </form>
  )
}

// ---------- Onglet Disponibilités (lecture) ----------
const COULEURS: Record<string, string> = { disponible: 'bg-dispo', indisponible: 'bg-indispo', en_attente: 'bg-attente' }

function OngletDispos({ agentId }: { agentId: string }) {
  const maintenant = new Date()
  const [[annee, mois], setMois] = useState<[number, number]>([maintenant.getFullYear(), maintenant.getMonth()])
  const [dispos, setDispos] = useState<DispoJour | null>(null)

  useEffect(() => {
    setDispos(null)
    dispositionsDuMois(agentId, annee, mois).then(setDispos)
  }, [agentId, annee, mois])

  return (
    <div className="max-w-md">
      <div className="rounded-2xl border border-trait px-3 pb-3 pt-3">
        <div className="mb-3 flex items-center justify-between px-1">
          <button onClick={() => setMois(moisSuivant(annee, mois, -1))} aria-label="Mois précédent" className="p-1.5">
            <LuChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-[15px] font-bold text-nuit-900">{titreMois(annee, mois)}</p>
          <button onClick={() => setMois(moisSuivant(annee, mois, 1))} aria-label="Mois suivant" className="p-1.5">
            <LuChevronRight className="h-5 w-5" />
          </button>
        </div>
        <div className="mb-2 grid grid-cols-7 text-center text-[12px] text-nuit-700">
          {JOURS_COURTS.map((j) => (
            <span key={j}>{j}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2">
          {grilleMois(annee, mois).map((iso, i) => {
            if (!iso) return <span key={'v' + i} />
            const v = dispos?.[iso]
            const pareil = v?.jour === v?.nuit
            return (
              <span key={iso} className="relative mx-auto flex aspect-square w-full max-w-[40px] items-center justify-center overflow-hidden rounded-lg text-[13px] font-semibold text-nuit-900">
                {v && (pareil && v.jour ? (
                  <span className={`absolute inset-0 ${COULEURS[v.jour]}`} />
                ) : (
                  <>
                    <span className={`absolute inset-x-0 top-0 h-1/2 ${v.jour ? COULEURS[v.jour] : 'bg-fond'}`} />
                    <span className={`absolute inset-x-0 bottom-0 h-1/2 ${v.nuit ? COULEURS[v.nuit] : 'bg-fond'}`} />
                  </>
                ))}
                <span className="relative">{versDate(iso).getDate()}</span>
              </span>
            )
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-nuit-700">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-dispo" /> Disponible</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-indispo" /> Indisponible</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-full bg-attente" /> En attente</span>
      </div>
      <p className="mt-1 text-[12px] text-nuit-600">Case coupée : haut = journée, bas = nuit. Les disponibilités sont saisies par l’agent depuis son téléphone.</p>
      {dispos && Object.keys(dispos).length === 0 && <p className="mt-3 text-sm text-nuit-600">Aucune disponibilité déclarée pour ce mois.</p>}
    </div>
  )
}

// ---------- Onglet Plannings (lecture) ----------
function OngletPlannings({ agentId }: { agentId: string }) {
  const [liste, setListe] = useState<AffectationAgent[] | null>(null)
  useEffect(() => {
    affectationsAgent(agentId).then(setListe)
  }, [agentId])
  const heure = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Paris' })
  const jour = (iso: string) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })

  if (!liste) return <p className="py-6 text-sm text-nuit-600">Chargement…</p>
  if (liste.length === 0) return <p className="py-6 text-sm text-nuit-600">Aucune mission proposée ou affectée pour le moment.</p>
  return (
    <ul className="max-w-2xl divide-y divide-trait rounded-2xl border border-trait bg-white">
      {liste.map((l) => (
        <li key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-nuit-900">
              {dateCourte(jour(l.debut))} · {heure(l.debut)} – {heure(l.fin)}
            </p>
            <p className="text-[13px] text-nuit-600">{l.site}</p>
          </div>
          <BadgeStatut statut={l.statut} />
        </li>
      ))}
    </ul>
  )
}

// ---------- Onglet Historique (admin) ----------
const LIBELLES: Record<string, string> = {
  prenom: 'Prénom',
  nom: 'Nom',
  telephone: 'Téléphone',
  actif: 'Compte actif',
  role: 'Rôle',
  email: 'E-mail',
  matricule: 'Matricule',
  carte_pro_numero: 'N° carte pro',
  carte_pro_expiration: 'Expiration carte pro',
  qualifications: 'Qualifications',
  type_contrat: 'Contrat',
  notes_internes: 'Notes internes',
}

function valeurLisible(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'oui' : 'non'
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—'
  return String(v)
}

function OngletHistorique({ agentId }: { agentId: string }) {
  const [lignes, setLignes] = useState<LigneHistorique[] | null>(null)
  useEffect(() => {
    historiqueAgent(agentId).then(setLignes)
  }, [agentId])
  if (!lignes) return <p className="py-6 text-sm text-nuit-600">Chargement…</p>
  if (lignes.length === 0) return <p className="py-6 text-sm text-nuit-600">Aucune modification enregistrée.</p>
  return (
    <ul className="max-w-2xl space-y-2">
      {lignes.map((l) => {
        const changements =
          l.action === 'UPDATE' && l.avant && l.apres
            ? Object.keys(LIBELLES).filter((k) => k in l.apres! && JSON.stringify(l.avant![k]) !== JSON.stringify(l.apres![k]))
            : []
        const titre = l.action === 'INSERT' ? (l.table_nom === 'profils' ? 'Compte créé' : 'Fiche créée') : l.action === 'DELETE' ? 'Suppression' : 'Modification'
        if (l.action === 'UPDATE' && changements.length === 0) return null
        return (
          <li key={l.id} className="rounded-xl border border-trait bg-white px-4 py-3 text-sm">
            <p className="font-semibold text-nuit-900">
              {titre}
              <span className="ml-2 text-[12px] font-normal text-nuit-600">
                {new Date(l.cree_le).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Paris' })}
              </span>
            </p>
            {changements.map((k) => (
              <p key={k} className="text-[13px] text-nuit-700">
                {LIBELLES[k]} : {valeurLisible(l.avant![k])} → <b>{valeurLisible(l.apres![k])}</b>
              </p>
            ))}
          </li>
        )
      })}
    </ul>
  )
}

// ---------- Page ----------
export default function FicheAgent({ id }: { id: string }) {
  const { profil, droits } = useAuth()
  const { afficherMessage } = useDemo()
  const admin = profil?.role === 'admin'
  const [agent, setAgent] = useState<Agent | null | undefined>(undefined)
  const [onglet, setOnglet] = useState<Onglet>('infos')
  const [enCours, setEnCours] = useState(false)

  useEffect(() => {
    chargerAgent(id).then(setAgent)
  }, [id])

  const basculerActif = async () => {
    if (!agent) return
    setEnCours(true)
    const res = await gererComptes({ action: agent.actif ? 'desactiver' : 'reactiver', id: agent.id })
    setEnCours(false)
    if (res.erreur) return afficherMessage(res.erreur)
    if (modeDemo) changerActifDemo(agent.id, !agent.actif)
    setAgent({ ...agent, actif: !agent.actif })
    afficherMessage(agent.actif ? 'Compte désactivé' : 'Compte réactivé')
  }

  const onglets: { id: Onglet; libelle: string; visible: boolean }[] = [
    { id: 'infos', libelle: 'Informations', visible: true },
    { id: 'dispos', libelle: 'Disponibilités', visible: admin || Boolean(droits?.voir_disponibilites) },
    { id: 'plannings', libelle: 'Plannings', visible: admin || Boolean(droits?.voir_plannings || droits?.gerer_affectations || droits?.suivre_reponses) },
    { id: 'historique', libelle: 'Historique', visible: admin },
  ]

  return (
    <CadreAdmin actif="agents">
      <Lien vers="/admin/agents" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-nuit-700">
        <LuArrowLeft className="h-4 w-4" /> Agents
      </Lien>

      {agent === undefined && <p className="py-10 text-center text-sm text-nuit-600">Chargement…</p>}
      {agent === null && <p className="py-10 text-center text-sm text-nuit-600">Agent introuvable.</p>}

      {agent && (
        <>
          <header className="mb-4 flex flex-wrap items-center gap-3">
            <Initiales prenom={agent.prenom} nom={agent.nom} grand />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[20px] font-bold text-nuit-900">
                {agent.prenom} {agent.nom}
              </h1>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${agent.actif ? 'bg-confirme-fond text-confirme-texte' : 'bg-indispo/40 text-indispo-fonce'}`}>
                  {agent.actif ? 'Actif' : 'Désactivé'}
                </span>
                {agent.matricule && <span className="rounded-full bg-fond px-2.5 py-0.5 text-[11px] font-semibold text-nuit-700">{agent.matricule}</span>}
                <BadgeCarte expiration={agent.carte_pro_expiration} />
              </div>
            </div>
            {admin && (
              <button onClick={basculerActif} disabled={enCours} className="rounded-lg bg-fond px-3.5 py-2 text-[13px] font-semibold text-nuit-900 disabled:opacity-60">
                {agent.actif ? 'Désactiver le compte' : 'Réactiver le compte'}
              </button>
            )}
          </header>

          <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-trait text-[13px] font-semibold">
            {onglets
              .filter((o) => o.visible)
              .map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOnglet(o.id)}
                  className={`-mb-px shrink-0 border-b-2 px-3 py-2 ${onglet === o.id ? 'border-or-500 text-nuit-900' : 'border-transparent text-nuit-600'}`}
                >
                  {o.libelle}
                </button>
              ))}
          </nav>

          {onglet === 'infos' && <OngletInfos key={agent.id + String(agent.actif)} agent={agent} modifiable={admin} auChangement={setAgent} />}
          {onglet === 'dispos' && <OngletDispos agentId={agent.id} />}
          {onglet === 'plannings' && <OngletPlannings agentId={agent.id} />}
          {onglet === 'historique' && <OngletHistorique agentId={agent.id} />}
        </>
      )}
    </CadreAdmin>
  )
}
