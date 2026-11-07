/*
  Éléments partagés par les écrans « Missions » et « Plannings » :
  chargement du mois, formulaire de mission, choix des agents, fiche détaillée.
*/
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { LuCheck, LuChevronLeft, LuChevronRight, LuClock, LuMapPin, LuSearch, LuTriangleAlert, LuX } from 'react-icons/lu'
import { useAuth } from '../../auth/AuthContexte'
import { useDemo } from '../../demo/DemoContexte'
import { listerClients, listerSites, type Client, type Site } from '../../lib/clients'
import { dateCourte, moisSuivant, titreMois } from '../../lib/dates'
import {
  ACTIVES,
  ENGAGEES,
  annulerMission,
  bornes,
  changerStatut,
  changerStatutPlanning,
  chargerMois,
  creerMission,
  creneauDe,
  modifierMission,
  nbConfirmes,
  nomAgent,
  proposer,
  retirerProposition,
  rouvrirMission,
  seChevauchent,
  supprimerMission,
  type Affectation,
  type DonneesMois,
  type Mission,
  type Planning,
  type SaisieMission,
  type StatutAffectation,
  type StatutDispo,
} from '../../lib/missions'

// ---------- Droits ----------
export function useDroitsMissions() {
  const { profil, droits } = useAuth()
  const admin = profil?.role === 'admin'
  return { admin, gerer: admin || Boolean(droits.gerer_affectations) }
}

// ---------- Mois affiché (gardé quand on passe d'un écran à l'autre) ----------
const maintenant = new Date()
let moisMemorise: [number, number] = [maintenant.getFullYear(), maintenant.getMonth()]

export const moisCourant = () => moisMemorise
export function memoriserMois(a: number, m: number) {
  moisMemorise = [a, m]
}

export function useMois() {
  const [[annee, mois], setAm] = useState<[number, number]>(moisMemorise)
  const [donnees, setDonnees] = useState<DonneesMois | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    try {
      setDonnees(await chargerMois(annee, mois))
      setErreur(null)
    } catch {
      setErreur('Impossible de charger les missions. Vérifiez votre connexion puis réessayez.')
    }
  }, [annee, mois])

  useEffect(() => {
    setDonnees(null)
    void recharger()
  }, [recharger])

  const changerMois = (sens: 1 | -1) => {
    moisMemorise = moisSuivant(annee, mois, sens)
    setAm(moisMemorise)
  }
  const allerA = (a: number, m: number) => {
    moisMemorise = [a, m]
    setAm(moisMemorise)
  }
  return { annee, mois, donnees, erreur, recharger, changerMois, allerA }
}

export function NavMois({ annee, mois, changer }: { annee: number; mois: number; changer: (s: 1 | -1) => void }) {
  return (
    <div className="flex items-center gap-2 text-[14px] font-semibold text-nuit-900">
      <button onClick={() => changer(-1)} aria-label="Mois précédent" className="rounded-md p-1.5 hover:bg-fond">
        <LuChevronLeft className="h-4 w-4" />
      </button>
      <span className="min-w-[130px] text-center">{titreMois(annee, mois)}</span>
      <button onClick={() => changer(1)} aria-label="Mois suivant" className="rounded-md p-1.5 hover:bg-fond">
        <LuChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

// ---------- Petits éléments ----------
export function Fenetre({ titre, fermer, children }: { titre: string; fermer: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={fermer} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-nuit-900">{titre}</h2>
          <button type="button" onClick={fermer} aria-label="Fermer" className="p-1">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Alerte({ texte }: { texte: string | null }) {
  if (!texte) return null
  return (
    <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[13px] text-red-800">
      <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {texte}
    </p>
  )
}

const CHAMP = 'mt-1 w-full rounded-lg border border-trait bg-white px-3 py-2.5 text-sm text-nuit-900 outline-none focus:border-or-500'

export const STATUTS: Record<StatutAffectation, { libelle: string; classe: string }> = {
  proposee: { libelle: 'Proposée', classe: 'bg-creneau-bleu text-creneau-bleu-texte' },
  acceptee: { libelle: 'Acceptée — à confirmer', classe: 'bg-attente/40 text-attente-fonce' },
  confirmee: { libelle: 'Confirmée', classe: 'bg-confirme-fond text-confirme-texte' },
  refusee: { libelle: 'Refusée', classe: 'bg-indispo/40 text-indispo-fonce' },
  annulee: { libelle: 'Annulée', classe: 'bg-trait text-nuit-700' },
}

const DISPO: Record<StatutDispo | 'aucune', { libelle: string; classe: string; ordre: number }> = {
  disponible: { libelle: 'Disponible', classe: 'bg-dispo/30 text-dispo-fonce', ordre: 0 },
  aucune: { libelle: 'Non renseigné', classe: 'bg-fond text-nuit-600', ordre: 1 },
  en_attente: { libelle: 'En attente', classe: 'bg-attente/40 text-attente-fonce', ordre: 2 },
  indisponible: { libelle: 'Indisponible', classe: 'bg-indispo/40 text-indispo-fonce', ordre: 3 },
}

export function Puce({ classe, children }: { classe: string; children: ReactNode }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${classe}`}>{children}</span>
}

/** Résumé « 1/2 confirmés » coloré selon le remplissage. */
export function Remplissage({ m }: { m: Mission }) {
  if (m.statut === 'annulee') return <Puce classe="bg-trait text-nuit-700">Mission annulée</Puce>
  const c = nbConfirmes(m)
  const complet = c >= m.nb_agents_requis
  return (
    <Puce classe={complet ? 'bg-confirme-fond text-confirme-texte' : 'bg-or-300/50 text-nuit-900'}>
      {c}/{m.nb_agents_requis} confirmé{m.nb_agents_requis > 1 ? 's' : ''}
    </Puce>
  )
}

// ---------- Choix des agents ----------
type Cible = { id?: string; date: string; hDebut: string; debut: string; fin: string }

function SelecteurAgents({
  cible,
  donnees,
  dejaSurMission,
  choisis,
  setChoisis,
}: {
  cible: Cible
  donnees: DonneesMois
  dejaSurMission: Map<string, Affectation>
  choisis: string[]
  setChoisis: (ids: string[]) => void
}) {
  const [recherche, setRecherche] = useState('')
  const creneau = creneauDe(cible.hDebut)

  const lignes = useMemo(() => {
    const autres = donnees.missions.filter((m) => m.id !== cible.id && m.statut !== 'annulee' && seChevauchent(m, cible))
    return donnees.agents
      .filter((a) => a.actif)
      .filter((a) => {
        const deja = dejaSurMission.get(a.id)
        return !deja || deja.statut === 'refusee' || deja.statut === 'annulee'
      })
      .filter((a) => nomAgent(a).toLowerCase().includes(recherche.trim().toLowerCase()))
      .map((a) => {
        const dispo = (donnees.dispos[`${a.id}|${cible.date}|${creneau}`] ?? 'aucune') as StatutDispo | 'aucune'
        let engage: Mission | undefined
        let propose: Mission | undefined
        for (const m of autres) {
          const af = m.affectations.find((x) => x.agent_id === a.id)
          if (af && ENGAGEES.includes(af.statut)) engage = m
          else if (af?.statut === 'proposee') propose = m
        }
        return { a, dispo, engage, propose, deja: dejaSurMission.get(a.id) }
      })
      .sort((x, y) => Number(!!x.engage) - Number(!!y.engage) || DISPO[x.dispo].ordre - DISPO[y.dispo].ordre || nomAgent(x.a).localeCompare(nomAgent(y.a)))
  }, [donnees, cible, dejaSurMission, recherche, creneau])

  const basculer = (id: string) => setChoisis(choisis.includes(id) ? choisis.filter((x) => x !== id) : [...choisis, id])
  const total = donnees.agents.filter((a) => a.actif).length

  return (
    <div>
      <p className="text-[13px] font-medium text-nuit-700">
        Agents à qui proposer la mission <span className="font-normal text-nuit-600">— disponibilités : {creneau === 'jour' ? 'journée' : 'nuit'} du {dateCourte(cible.date)}</span>
      </p>
      {total > 6 && (
        <div className="relative mt-2">
          <LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nuit-600" />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher un agent" className={CHAMP + ' mt-0 pl-9'} />
        </div>
      )}
      <div className="mt-2 max-h-64 divide-y divide-trait overflow-y-auto rounded-lg border border-trait">
        {lignes.length === 0 && <p className="p-3 text-[13px] text-nuit-600">{total === 0 ? 'Aucun agent actif. Créez d’abord des agents.' : 'Aucun autre agent à proposer.'}</p>}
        {lignes.map(({ a, dispo, engage, propose, deja }) => (
          <label key={a.id} className={`flex items-start gap-3 px-3 py-2.5 ${engage ? 'opacity-60' : 'cursor-pointer active:bg-fond'}`}>
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 accent-[var(--color-or-500)]"
              checked={choisis.includes(a.id)}
              disabled={Boolean(engage)}
              onChange={() => basculer(a.id)}
            />
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5 text-[14px] font-semibold text-nuit-900">
                {nomAgent(a)}
                <Puce classe={DISPO[dispo].classe}>{DISPO[dispo].libelle}</Puce>
                {deja && <Puce classe={STATUTS[deja.statut].classe}>{deja.statut === 'refusee' ? 'A refusé' : 'Annulée'}</Puce>}
              </span>
              {engage && (
                <span className="mt-0.5 block text-[12px] text-red-700">
                  Déjà engagé {engage.hDebut}–{engage.hFin} · {engage.site_nom}
                </span>
              )}
              {!engage && propose && (
                <span className="mt-0.5 block text-[12px] text-attente-fonce">
                  Autre proposition en attente {propose.hDebut}–{propose.hFin} · {propose.site_nom}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ---------- Formulaire de création / modification ----------
export function useSites(actif: boolean) {
  const [sites, setSites] = useState<Site[]>([])
  const [clients, setClients] = useState<Client[]>([])
  useEffect(() => {
    if (!actif) return
    Promise.all([listerSites(), listerClients()])
      .then(([s, c]) => {
        setSites(s)
        setClients(c)
      })
      .catch(() => undefined)
  }, [actif])
  return { sites, clients }
}

export function FormulaireMission({
  mission,
  dateDefaut,
  donnees,
  fermer,
  apres,
}: {
  mission?: Mission
  dateDefaut: string
  donnees: DonneesMois
  fermer: () => void
  apres: (date: string) => void
}) {
  const { afficherMessage } = useDemo()
  const { sites, clients } = useSites(true)
  const [s, setS] = useState<SaisieMission>({
    site_id: mission?.site_id ?? '',
    date: mission?.date ?? dateDefaut,
    hDebut: mission?.hDebut ?? '08:00',
    hFin: mission?.hFin ?? '20:00',
    nb: mission?.nb_agents_requis ?? 1,
    consignes: mission?.consignes ?? '',
    agents: [],
  })
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const maj = (p: Partial<SaisieMission>) => setS((x) => ({ ...x, ...p }))

  const choix = sites.filter((x) => x.actif || x.id === mission?.site_id)
  useEffect(() => {
    if (!s.site_id && choix.length === 1) maj({ site_id: choix[0].id })
  }, [choix, s.site_id])

  const nomClient = (id: string) => clients.find((c) => c.id === id)?.nom
  const cible: Cible | null = s.date && s.hDebut && s.hFin && s.hDebut !== s.hFin ? { id: mission?.id, date: s.date, hDebut: s.hDebut, ...bornes(s.date, s.hDebut, s.hFin) } : null
  const nuit = s.hFin && s.hDebut && s.hFin <= s.hDebut
  const dejaSurMission = useMemo(() => new Map<string, Affectation>(), [])

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    setEnvoi(true)
    const err = mission ? await modifierMission(mission.id, s) : await creerMission(s)
    setEnvoi(false)
    if (err) return setErreur(err)
    afficherMessage(mission ? 'Mission modifiée' : s.agents.length ? `Mission créée et proposée à ${s.agents.length} agent${s.agents.length > 1 ? 's' : ''}` : 'Mission créée')
    apres(s.date)
  }

  return (
    <Fenetre titre={mission ? 'Modifier la mission' : 'Créer une mission'} fermer={fermer}>
      <form onSubmit={valider} className="grid grid-cols-2 gap-3 text-[13px] font-medium text-nuit-700">
        <label className="col-span-2">
          Site
          <select required value={s.site_id} onChange={(e) => maj({ site_id: e.target.value })} className={CHAMP}>
            <option value="">— Choisir un site —</option>
            {choix.map((x) => (
              <option key={x.id} value={x.id}>
                {x.nom}
                {nomClient(x.client_id) ? ` — ${nomClient(x.client_id)}` : ''}
              </option>
            ))}
          </select>
          {sites.length === 0 && <span className="mt-1 block text-[12px] font-normal text-nuit-600">Aucun site : ajoutez-en un dans « Sites / Clients ».</span>}
        </label>
        <label className="col-span-2 sm:col-span-1">
          Date
          <input type="date" required value={s.date} onChange={(e) => maj({ date: e.target.value })} className={CHAMP} />
        </label>
        <label className="col-span-2 sm:col-span-1">
          Agents nécessaires
          <input type="number" min={1} max={200} required value={s.nb} onChange={(e) => maj({ nb: Number(e.target.value) })} className={CHAMP} />
        </label>
        <label>
          Début
          <input type="time" required value={s.hDebut} onChange={(e) => maj({ hDebut: e.target.value })} className={CHAMP} />
        </label>
        <label>
          Fin
          <input type="time" required value={s.hFin} onChange={(e) => maj({ hFin: e.target.value })} className={CHAMP} />
        </label>
        {nuit && <p className="col-span-2 -mt-1 text-[12px] font-normal text-nuit-600">Vacation de nuit : la fin est le lendemain matin.</p>}
        {cible && new Date(cible.fin).getTime() < Date.now() && (
          <p className="col-span-2 -mt-1 rounded-lg bg-attente/30 p-2 text-[12px] font-normal text-attente-fonce">
            Cette mission est déjà terminée : les agents ne pourront pas y répondre (vous pouvez confirmer vous-même).
          </p>
        )}
        <label className="col-span-2">
          Consignes
          <textarea rows={2} value={s.consignes} onChange={(e) => maj({ consignes: e.target.value })} className={CHAMP} placeholder="Facultatif : tenue, rondes, contact sur place…" />
        </label>
        {!mission && cible && (
          <div className="col-span-2">
            <SelecteurAgents cible={cible} donnees={donnees} dejaSurMission={dejaSurMission} choisis={s.agents} setChoisis={(agents) => maj({ agents })} />
            <p className="mt-1 text-[12px] font-normal text-nuit-600">Facultatif : vous pourrez proposer la mission plus tard.</p>
          </div>
        )}
        {mission && <p className="col-span-2 text-[12px] font-normal text-nuit-600">Si vous changez l’horaire, les agents concernés sont prévenus automatiquement.</p>}
        <div className="col-span-2">
          <Alerte texte={erreur} />
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={fermer} className="rounded-xl bg-fond px-4 py-2.5 text-sm font-semibold text-nuit-900">
              Annuler
            </button>
            <button type="submit" disabled={envoi} className="rounded-xl bg-or-500 px-4 py-2.5 text-sm font-bold text-nuit-900 disabled:opacity-50">
              {envoi ? 'Enregistrement…' : mission ? 'Enregistrer' : s.agents.length ? 'Créer et proposer' : 'Créer la mission'}
            </button>
          </div>
        </div>
      </form>
    </Fenetre>
  )
}

// ---------- Fiche détaillée d'une mission ----------
const ORDRE: StatutAffectation[] = ['acceptee', 'proposee', 'confirmee', 'refusee', 'annulee']

export function DetailMission({
  mission: m,
  donnees,
  fermer,
  recharger,
  modifier,
}: {
  mission: Mission
  donnees: DonneesMois
  fermer: () => void
  recharger: () => Promise<void>
  modifier: () => void
}) {
  const { admin, gerer } = useDroitsMissions()
  const { afficherMessage } = useDemo()
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [aConfirmer, setAConfirmer] = useState<string | null>(null) // action en attente de « Oui »
  const [proposition, setProposition] = useState(false)
  const [choisis, setChoisis] = useState<string[]>([])

  const agent = (id: string) => donnees.agents.find((a) => a.id === id)
  const confirmes = nbConfirmes(m)
  const complet = confirmes >= m.nb_agents_requis
  const annulee = m.statut === 'annulee'
  const affectations = [...m.affectations].sort((a, b) => ORDRE.indexOf(a.statut) - ORDRE.indexOf(b.statut) || nomAgent(agent(a.agent_id)).localeCompare(nomAgent(agent(b.agent_id))))
  const dejaSurMission = useMemo(() => new Map(m.affectations.map((a) => [a.agent_id, a])), [m])

  const agir = async (action: () => Promise<string | null>, message: string, fermerApres = false) => {
    setOccupe(true)
    setErreur(null)
    const err = await action()
    setOccupe(false)
    setAConfirmer(null)
    if (err) return setErreur(err)
    afficherMessage(message)
    await recharger()
    if (fermerApres) fermer()
  }

  const bouton = 'rounded-lg px-3 py-1.5 text-[12px] font-semibold disabled:opacity-50'
  const Confirmation = ({ cle, question, action, message, fermerApres }: { cle: string; question: string; action: () => Promise<string | null>; message: string; fermerApres?: boolean }) =>
    aConfirmer === cle ? (
      <span className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-red-800">
        {question}
        <button disabled={occupe} onClick={() => agir(action, message, fermerApres)} className={`${bouton} bg-red-600 text-white`}>
          Oui
        </button>
        <button onClick={() => setAConfirmer(null)} className={`${bouton} bg-fond text-nuit-900`}>
          Non
        </button>
      </span>
    ) : null

  return (
    <Fenetre titre={m.site_nom} fermer={fermer}>
      <div className="space-y-1.5 text-[14px] text-nuit-900">
        <p className="flex items-center gap-2">
          <LuClock className="h-4 w-4 text-nuit-600" />
          {dateCourte(m.date)} · {m.hDebut} – {m.hFin}
          {m.hFin <= m.hDebut && <span className="text-[12px] text-nuit-600">(fin le lendemain)</span>}
        </p>
        {m.ville && (
          <p className="flex items-center gap-2">
            <LuMapPin className="h-4 w-4 text-nuit-600" /> {m.ville}
          </p>
        )}
        <p className="flex items-center gap-2">
          <Remplissage m={m} />
        </p>
        {m.consignes && <p className="rounded-lg bg-fond p-3 text-[13px] text-nuit-700">{m.consignes}</p>}
      </div>

      <h3 className="mt-5 text-[13px] font-bold uppercase tracking-wide text-nuit-600">Agents</h3>
      {affectations.length === 0 && <p className="mt-2 text-[13px] text-nuit-600">Mission proposée à personne pour l’instant.</p>}
      <ul className="mt-2 divide-y divide-trait rounded-lg border border-trait">
        {affectations.map((a) => (
          <li key={a.id} className="px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[14px] font-semibold text-nuit-900">{nomAgent(agent(a.agent_id))}</span>
              <Puce classe={STATUTS[a.statut].classe}>{STATUTS[a.statut].libelle}</Puce>
            </div>
            {a.statut === 'refusee' && a.motif_refus && <p className="mt-1 text-[12px] text-nuit-600">Motif : {a.motif_refus}</p>}
            {gerer && !annulee && (
              <div className="mt-2 flex flex-wrap gap-2">
                {(a.statut === 'acceptee' || a.statut === 'proposee') && (
                  <button
                    disabled={occupe || complet}
                    title={complet ? 'Le nombre d’agents requis est atteint' : undefined}
                    onClick={() => agir(() => changerStatut(a, 'confirmee'), 'Agent confirmé — il est prévenu')}
                    className={`${bouton} bg-or-500 text-nuit-900`}
                  >
                    <LuCheck className="mr-1 inline h-3.5 w-3.5" />
                    {a.statut === 'proposee' ? 'Confirmer sans attendre' : 'Confirmer'}
                  </button>
                )}
                {a.statut === 'proposee' && (
                  <button disabled={occupe} onClick={() => agir(() => retirerProposition(a), 'Proposition retirée')} className={`${bouton} bg-fond text-nuit-900`}>
                    Retirer la proposition
                  </button>
                )}
                {a.statut === 'acceptee' && (
                  <button disabled={occupe} onClick={() => agir(() => changerStatut(a, 'annulee'), 'Agent non retenu — il est prévenu')} className={`${bouton} bg-fond text-nuit-900`}>
                    Ne pas retenir
                  </button>
                )}
                {a.statut === 'confirmee' && aConfirmer !== a.id && (
                  <button disabled={occupe} onClick={() => setAConfirmer(a.id)} className={`${bouton} bg-fond text-red-700`}>
                    Annuler l’affectation
                  </button>
                )}
                <Confirmation cle={a.id} question="Annuler cette affectation ?" action={() => changerStatut(a, 'annulee')} message="Affectation annulée — l’agent est prévenu" />
                {(a.statut === 'refusee' || a.statut === 'annulee') && (
                  <button disabled={occupe} onClick={() => agir(() => proposer(m, [a.agent_id]), 'Mission proposée à nouveau')} className={`${bouton} bg-fond text-nuit-900`}>
                    Proposer à nouveau
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {gerer && !annulee && !proposition && (
        <button onClick={() => setProposition(true)} className="mt-3 w-full rounded-xl border border-dashed border-or-500 py-2.5 text-[13px] font-bold text-nuit-900 active:bg-or-300/30">
          + Proposer à d’autres agents
        </button>
      )}
      {proposition && (
        <div className="mt-3 rounded-xl bg-fond/60 p-3">
          <SelecteurAgents cible={m} donnees={donnees} dejaSurMission={dejaSurMission} choisis={choisis} setChoisis={setChoisis} />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => (setProposition(false), setChoisis([]))} className="rounded-xl bg-white px-3 py-2 text-[13px] font-semibold text-nuit-900">
              Fermer
            </button>
            <button
              disabled={occupe || choisis.length === 0}
              onClick={() =>
                agir(() => proposer(m, choisis), `Mission proposée à ${choisis.length} agent${choisis.length > 1 ? 's' : ''}`).then(() => {
                  setProposition(false)
                  setChoisis([])
                })
              }
              className="rounded-xl bg-or-500 px-3 py-2 text-[13px] font-bold text-nuit-900 disabled:opacity-50"
            >
              Envoyer la proposition{choisis.length ? ` (${choisis.length})` : ''}
            </button>
          </div>
        </div>
      )}

      <Alerte texte={erreur} />

      {admin && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-trait pt-4">
          {!annulee && (
            <button onClick={modifier} className="rounded-xl bg-fond px-3.5 py-2 text-[13px] font-semibold text-nuit-900">
              Modifier
            </button>
          )}
          {!annulee && aConfirmer !== 'annuler' && (
            <button onClick={() => setAConfirmer('annuler')} className="rounded-xl bg-fond px-3.5 py-2 text-[13px] font-semibold text-nuit-900">
              Annuler la mission
            </button>
          )}
          {annulee && (
            <button disabled={occupe} onClick={() => agir(() => rouvrirMission(m), 'Mission rouverte')} className="rounded-xl bg-fond px-3.5 py-2 text-[13px] font-semibold text-nuit-900">
              Rouvrir la mission
            </button>
          )}
          {aConfirmer !== 'supprimer' && aConfirmer !== 'annuler' && (
            <button onClick={() => setAConfirmer('supprimer')} className="rounded-xl bg-fond px-3.5 py-2 text-[13px] font-semibold text-red-700">
              Supprimer
            </button>
          )}
          <Confirmation cle="annuler" question="Annuler la mission ? Les agents concernés seront prévenus." action={() => annulerMission(m)} message="Mission annulée" />
          <Confirmation cle="supprimer" question="Supprimer définitivement ?" action={() => supprimerMission(m)} message="Mission supprimée" fermerApres />
        </div>
      )}
      {!gerer && <p className="mt-4 text-[12px] text-nuit-600">Consultation seule : vous n’avez pas le droit de gérer les affectations.</p>}
    </Fenetre>
  )
}

// ---------- État du planning du mois ----------
export function BandeauPlanning({ planning, missions, recharger }: { planning: Planning | null; missions: Mission[]; recharger: () => Promise<void> }) {
  const { admin } = useDroitsMissions()
  const { afficherMessage } = useDemo()
  const [confirmer, setConfirmer] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  if (!planning) return null

  const publie = planning.statut === 'publie'
  const actives = missions.filter((m) => m.statut !== 'annulee')
  const aPourvoir = actives.filter((m) => nbConfirmes(m) < m.nb_agents_requis).length
  const enAttente = actives.reduce((n, m) => n + m.affectations.filter((a) => a.statut === 'proposee').length, 0)
  const aValider = actives.reduce((n, m) => n + m.affectations.filter((a) => a.statut === 'acceptee').length, 0)

  const changer = async (statut: Planning['statut']) => {
    const err = await changerStatutPlanning(planning, statut)
    setConfirmer(false)
    if (err) return setErreur(err)
    afficherMessage(statut === 'publie' ? 'Planning publié — les agents confirmés sont prévenus' : 'Planning repassé en préparation')
    await recharger()
  }

  return (
    <div className={`mb-4 rounded-xl border p-3.5 ${publie ? 'border-confirme-texte/20 bg-confirme-fond/50' : 'border-or-500/40 bg-or-300/20'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[14px] font-bold text-nuit-900">
            {publie ? `Planning publié${planning.publie_le ? ' le ' + new Date(planning.publie_le).toLocaleDateString('fr-FR') : ''}` : 'Planning en préparation'}
          </p>
          <p className="text-[12px] text-nuit-700">
            {actives.length} mission{actives.length > 1 ? 's' : ''} · {aPourvoir} à pourvoir · {enAttente} réponse{enAttente > 1 ? 's' : ''} attendue{enAttente > 1 ? 's' : ''}
            {aValider > 0 && ` · ${aValider} à confirmer`}
          </p>
        </div>
        {admin && !confirmer && (
          <button onClick={() => (publie ? changer('brouillon') : setConfirmer(true))} className={`rounded-lg px-3.5 py-2 text-[13px] font-bold ${publie ? 'bg-white text-nuit-900' : 'bg-nuit-900 text-white'}`}>
            {publie ? 'Repasser en préparation' : 'Publier le planning'}
          </button>
        )}
        {confirmer && (
          <span className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-nuit-900">
            {aPourvoir > 0 ? `${aPourvoir} mission(s) encore à pourvoir. Publier quand même ?` : 'Publier et prévenir les agents ?'}
            <button onClick={() => changer('publie')} className="rounded-lg bg-nuit-900 px-3 py-1.5 text-white">
              Oui
            </button>
            <button onClick={() => setConfirmer(false)} className="rounded-lg bg-white px-3 py-1.5">
              Non
            </button>
          </span>
        )}
      </div>
      {!publie && <p className="mt-1.5 text-[12px] text-nuit-600">Les agents reçoivent déjà les propositions. La publication les prévient que leur planning du mois est prêt.</p>}
      <Alerte texte={erreur} />
    </div>
  )
}

export const actives = (m: Mission) => m.affectations.filter((a) => ACTIVES.includes(a.statut))
