/*
  Missions, propositions aux agents et publication des plannings.
  Les heures sont toujours celles de Paris (heure d'été/hiver gérée automatiquement).
  En mode démo, les données restent en mémoire.
*/
import { messageErreur, modeDemo, supabase } from './supabase'
import { deux, joursDansMois } from './dates'

export type StatutAffectation = 'proposee' | 'acceptee' | 'refusee' | 'confirmee' | 'annulee'
export type StatutPlanning = 'brouillon' | 'propositions_envoyees' | 'publie'
export type StatutDispo = 'disponible' | 'indisponible' | 'en_attente'
export type Creneau = 'jour' | 'nuit'

export interface Affectation {
  id: string
  agent_id: string
  statut: StatutAffectation
  motif_refus: string | null
}

export interface Mission {
  id: string
  planning_id: string
  site_id: string
  site_nom: string
  ville: string | null
  debut: string // horodatage complet
  fin: string
  date: string // AAAA-MM-JJ (Paris)
  hDebut: string // HH:MM (Paris)
  hFin: string
  nb_agents_requis: number
  consignes: string | null
  statut: 'ouverte' | 'complete' | 'annulee'
  affectations: Affectation[]
}

export interface Planning {
  id: string
  mois: string
  statut: StatutPlanning
  publie_le: string | null
}

export interface AgentCourt {
  id: string
  prenom: string
  nom: string
  actif: boolean
}

export interface DonneesMois {
  planning: Planning | null
  missions: Mission[]
  agents: AgentCourt[]
  /** clé « agent|jour|creneau » */
  dispos: Record<string, StatutDispo>
}

export interface SaisieMission {
  site_id: string
  date: string
  hDebut: string
  hFin: string
  nb: number
  consignes: string
  agents: string[]
}

export const ACTIVES: StatutAffectation[] = ['proposee', 'acceptee', 'confirmee']
export const ENGAGEES: StatutAffectation[] = ['acceptee', 'confirmee']

// ---------- Heures de Paris ----------
const FORMAT_PARIS = new Intl.DateTimeFormat('fr-FR', {
  timeZone: 'Europe/Paris',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function partiesParis(t: number) {
  const p = Object.fromEntries(FORMAT_PARIS.formatToParts(new Date(t)).map((x) => [x.type, x.value]))
  return { a: +p.year, m: +p.month, j: +p.day, h: +p.hour % 24, mi: +p.minute }
}

/** Date + heure de Paris → horodatage ISO (UTC). */
export function versHorodatage(date: string, heure: string): string {
  const [a, m, j] = date.split('-').map(Number)
  const [h, mi] = heure.split(':').map(Number)
  const voulu = Date.UTC(a, m - 1, j, h, mi)
  let t = voulu
  for (let i = 0; i < 2; i++) {
    const p = partiesParis(t)
    t += voulu - Date.UTC(p.a, p.m - 1, p.j, p.h, p.mi)
  }
  return new Date(t).toISOString()
}

/** Horodatage → { date, heure } à Paris. */
export function enHeureParis(horodatage: string): { date: string; heure: string } {
  const p = partiesParis(new Date(horodatage).getTime())
  return { date: `${p.a}-${deux(p.m)}-${deux(p.j)}`, heure: `${deux(p.h)}:${deux(p.mi)}` }
}

/** Début/fin d'une saisie ; si la fin est avant le début, elle est le lendemain. */
export function bornes(date: string, hDebut: string, hFin: string): { debut: string; fin: string } {
  const debut = versHorodatage(date, hDebut)
  let fin = versHorodatage(date, hFin)
  if (fin <= debut) {
    const [a, m, j] = date.split('-').map(Number)
    const d = new Date(Date.UTC(a, m - 1, j + 1))
    fin = versHorodatage(d.toISOString().slice(0, 10), hFin)
  }
  return { debut, fin }
}

/** Créneau d'une mission pour les disponibilités : jour si elle commence entre 6 h et 18 h. */
export function creneauDe(hDebut: string): Creneau {
  const h = Number(hDebut.slice(0, 2))
  return h >= 6 && h < 18 ? 'jour' : 'nuit'
}

export const premierDuMois = (annee: number, mois: number) => `${annee}-${deux(mois + 1)}-01`

export function seChevauchent(a: { debut: string; fin: string }, b: { debut: string; fin: string }): boolean {
  return new Date(a.debut) < new Date(b.fin) && new Date(b.debut) < new Date(a.fin)
}

export const nbConfirmes = (m: Mission) => m.affectations.filter((a) => a.statut === 'confirmee').length

export const nomAgent = (a?: AgentCourt) => (a ? `${a.prenom} ${a.nom}`.trim() : 'Agent supprimé')

function erreur(e: unknown): string {
  const m = (e as { message?: string })?.message ?? ''
  if (/chevauchement|nombre d'agents|seul l'administrateur|il y a déjà|agent actif|réservée|introuvable|ne vous concerne/i.test(m)) return m
  if (/check constraint|violates check/i.test(m)) return 'Horaires invalides : une mission dure au maximum 24 heures.'
  if (/foreign key|23503/i.test(m)) return 'Un élément lié est introuvable (site ou agent supprimé ?).'
  if (/permission|row-level|policy|42501/i.test(m)) return 'Vous n’avez pas le droit de faire cette action.'
  return messageErreur(e)
}

function versMission(l: Record<string, unknown>): Mission {
  const d = enHeureParis(l.debut as string)
  const f = enHeureParis(l.fin as string)
  const site = (l.sites as { nom?: string; ville?: string | null } | null) ?? null
  return {
    id: l.id as string,
    planning_id: l.planning_id as string,
    site_id: l.site_id as string,
    site_nom: site?.nom ?? 'Site',
    ville: site?.ville ?? null,
    debut: l.debut as string,
    fin: l.fin as string,
    date: d.date,
    hDebut: d.heure,
    hFin: f.heure,
    nb_agents_requis: l.nb_agents_requis as number,
    consignes: (l.consignes as string) ?? null,
    statut: l.statut as Mission['statut'],
    affectations: ((l.affectations as Affectation[]) ?? []).map((a) => ({ ...a, motif_refus: a.motif_refus ?? null })),
  }
}

// ---------- Mode démo (en mémoire) ----------
const demo = {
  plannings: [] as Planning[],
  missions: [] as Record<string, unknown>[],
  affectations: [] as (Affectation & { mission_id: string })[],
  agents: [
    { id: 'd1', prenom: 'Karim', nom: 'Benali', actif: true },
    { id: 'd2', prenom: 'Sophie', nom: 'Martin', actif: true },
  ] as AgentCourt[],
  sites: { s1: 'Centre commercial', s2: 'Entrepôt logistique' } as Record<string, string>,
}
const nouvelId = () => 'x' + Math.random().toString(36).slice(2, 10)

function demoPlanning(mois: string): string {
  let p = demo.plannings.find((x) => x.mois === mois)
  if (!p) demo.plannings.push((p = { id: nouvelId(), mois, statut: 'brouillon', publie_le: null }))
  return p.id
}

// ---------- Lecture ----------
export async function chargerMois(annee: number, mois: number): Promise<DonneesMois> {
  const debutMois = premierDuMois(annee, mois)
  const finMois = `${annee}-${deux(mois + 1)}-${deux(joursDansMois(annee, mois))}`

  if (modeDemo) {
    const planning = demo.plannings.find((p) => p.mois === debutMois) ?? null
    const missions = demo.missions
      .filter((m) => planning && m.planning_id === planning.id)
      .map((m) => versMission({ ...m, sites: { nom: demo.sites[m.site_id as string] ?? 'Site' }, affectations: demo.affectations.filter((a) => a.mission_id === m.id) }))
      .sort((a, b) => a.debut.localeCompare(b.debut))
    return { planning, missions, agents: [...demo.agents], dispos: {} }
  }

  const sb = supabase!
  const [rp, ra, rd] = await Promise.all([
    sb.from('plannings').select('id, mois, statut, publie_le').eq('mois', debutMois).maybeSingle(),
    sb.from('profils').select('id, prenom, nom, actif').eq('role', 'agent').order('nom'),
    sb.from('disponibilites').select('agent_id, jour, creneau, statut').gte('jour', debutMois).lte('jour', finMois),
  ])
  if (rp.error) throw rp.error
  if (ra.error) throw ra.error
  const planning = (rp.data as Planning | null) ?? null

  let missions: Mission[] = []
  if (planning) {
    const rm = await sb
      .from('missions')
      .select('id, planning_id, site_id, debut, fin, nb_agents_requis, consignes, statut, sites(nom, ville), affectations(id, agent_id, statut, motif_refus)')
      .eq('planning_id', planning.id)
      .order('debut')
    if (rm.error) throw rm.error
    missions = ((rm.data ?? []) as Record<string, unknown>[]).map(versMission)
  }

  const dispos: Record<string, StatutDispo> = {}
  for (const d of (rd.data ?? []) as { agent_id: string; jour: string; creneau: Creneau; statut: StatutDispo }[]) {
    dispos[`${d.agent_id}|${d.jour}|${d.creneau}`] = d.statut
  }
  return { planning, missions, agents: (ra.data ?? []) as AgentCourt[], dispos }
}

// ---------- Missions (administrateur) ----------
function verifierSaisie(s: SaisieMission): string | null {
  if (!s.site_id) return 'Choisissez un site.'
  if (!s.date) return 'Choisissez une date.'
  if (!s.hDebut || !s.hFin) return 'Indiquez les heures de début et de fin.'
  if (s.hDebut === s.hFin) return 'Les heures de début et de fin doivent être différentes.'
  if (!(s.nb >= 1 && s.nb <= 200)) return 'Le nombre d’agents doit être entre 1 et 200.'
  return null
}

export async function creerMission(s: SaisieMission): Promise<string | null> {
  const invalide = verifierSaisie(s)
  if (invalide) return invalide
  const { debut, fin } = bornes(s.date, s.hDebut, s.hFin)
  const mois = s.date.slice(0, 8) + '01'
  if (modeDemo) {
    const id = nouvelId()
    demo.missions.push({ id, planning_id: demoPlanning(mois), site_id: s.site_id, debut, fin, nb_agents_requis: s.nb, consignes: s.consignes.trim() || null, statut: 'ouverte' })
    s.agents.forEach((a) => demo.affectations.push({ id: nouvelId(), mission_id: id, agent_id: a, statut: 'proposee', motif_refus: null }))
    return null
  }
  const { error } = await supabase!.rpc('creer_mission', {
    p_site: s.site_id,
    p_debut: debut,
    p_fin: fin,
    p_nb: s.nb,
    p_consignes: s.consignes,
    p_agents: s.agents,
  })
  return error ? erreur(error) : null
}

export async function modifierMission(id: string, s: SaisieMission): Promise<string | null> {
  const invalide = verifierSaisie(s)
  if (invalide) return invalide
  const { debut, fin } = bornes(s.date, s.hDebut, s.hFin)
  if (modeDemo) {
    const m = demo.missions.find((x) => x.id === id)
    if (m) Object.assign(m, { planning_id: demoPlanning(s.date.slice(0, 8) + '01'), site_id: s.site_id, debut, fin, nb_agents_requis: s.nb, consignes: s.consignes.trim() || null })
    return null
  }
  const { error } = await supabase!.rpc('modifier_mission', {
    p_id: id,
    p_site: s.site_id,
    p_debut: debut,
    p_fin: fin,
    p_nb: s.nb,
    p_consignes: s.consignes,
  })
  return error ? erreur(error) : null
}

/** Annule la mission : les agents encore concernés sont prévenus. */
export async function annulerMission(m: Mission): Promise<string | null> {
  const e = await annulerAffectationsActives(m)
  if (e) return e
  if (modeDemo) {
    const x = demo.missions.find((d) => d.id === m.id)
    if (x) x.statut = 'annulee'
    return null
  }
  const { error } = await supabase!.from('missions').update({ statut: 'annulee' }).eq('id', m.id)
  return error ? erreur(error) : null
}

/** Rouvre une mission annulée (sans reproposer automatiquement aux agents). */
export async function rouvrirMission(m: Mission): Promise<string | null> {
  if (modeDemo) {
    const x = demo.missions.find((d) => d.id === m.id)
    if (x) x.statut = 'ouverte'
    return null
  }
  const { error } = await supabase!.from('missions').update({ statut: 'ouverte' }).eq('id', m.id)
  return error ? erreur(error) : null
}

/** Supprime définitivement la mission (les agents encore concernés sont prévenus avant). */
export async function supprimerMission(m: Mission): Promise<string | null> {
  const e = await annulerAffectationsActives(m)
  if (e) return e
  if (modeDemo) {
    demo.missions = demo.missions.filter((d) => d.id !== m.id)
    demo.affectations = demo.affectations.filter((a) => a.mission_id !== m.id)
    return null
  }
  const { error } = await supabase!.from('missions').delete().eq('id', m.id)
  return error ? erreur(error) : null
}

async function annulerAffectationsActives(m: Mission): Promise<string | null> {
  const ids = m.affectations.filter((a) => ACTIVES.includes(a.statut)).map((a) => a.id)
  if (ids.length === 0) return null
  if (modeDemo) {
    demo.affectations.forEach((a) => ids.includes(a.id) && (a.statut = 'annulee'))
    return null
  }
  const { error } = await supabase!.from('affectations').update({ statut: 'annulee' }).in('id', ids)
  return error ? erreur(error) : null
}

// ---------- Propositions (administrateur et chefs autorisés) ----------
/** Propose la mission aux agents choisis (nouvelle proposition, ou à nouveau après un refus/une annulation). */
export async function proposer(m: Mission, agentIds: string[]): Promise<string | null> {
  const existants = new Map(m.affectations.map((a) => [a.agent_id, a]))
  const nouveaux = agentIds.filter((id) => !existants.has(id))
  const aRelancer = agentIds.map((id) => existants.get(id)).filter((a): a is Affectation => !!a && (a.statut === 'refusee' || a.statut === 'annulee'))

  if (modeDemo) {
    nouveaux.forEach((agent_id) => demo.affectations.push({ id: nouvelId(), mission_id: m.id, agent_id, statut: 'proposee', motif_refus: null }))
    demo.affectations.forEach((a) => aRelancer.some((r) => r.id === a.id) && (a.statut = 'proposee'))
    return null
  }
  if (nouveaux.length) {
    const { error } = await supabase!.from('affectations').insert(nouveaux.map((agent_id) => ({ mission_id: m.id, agent_id })))
    if (error) return erreur(error)
  }
  if (aRelancer.length) {
    const { error } = await supabase!
      .from('affectations')
      .update({ statut: 'proposee', propose_le: new Date().toISOString() })
      .in('id', aRelancer.map((a) => a.id))
    if (error) return erreur(error)
  }
  return null
}

export async function changerStatut(a: Affectation, statut: StatutAffectation): Promise<string | null> {
  if (modeDemo) {
    const x = demo.affectations.find((d) => d.id === a.id)
    if (x) x.statut = statut
    return null
  }
  const { error } = await supabase!.from('affectations').update({ statut }).eq('id', a.id)
  return error ? erreur(error) : null
}

/** Retire une proposition à laquelle l'agent n'a pas encore répondu. */
export async function retirerProposition(a: Affectation): Promise<string | null> {
  if (modeDemo) {
    demo.affectations = demo.affectations.filter((d) => d.id !== a.id)
    return null
  }
  const { error } = await supabase!.from('affectations').delete().eq('id', a.id)
  return error ? erreur(error) : null
}

// ---------- Planning du mois (administrateur) ----------
export async function changerStatutPlanning(p: Planning, statut: StatutPlanning): Promise<string | null> {
  if (modeDemo) {
    const x = demo.plannings.find((d) => d.id === p.id)
    if (x) Object.assign(x, { statut, publie_le: statut === 'publie' ? new Date().toISOString() : x.publie_le })
    return null
  }
  const { error } = await supabase!.from('plannings').update({ statut }).eq('id', p.id)
  return error ? erreur(error) : null
}
