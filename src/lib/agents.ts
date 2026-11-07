/*
  Accès aux données des agents (profil + fiche professionnelle).
  En mode démo, les données restent en mémoire.
*/
import { aujourdhuiIso, versDate, versIso } from './dates'
import { modeDemo, supabase } from './supabase'

export interface Agent {
  id: string
  prenom: string
  nom: string
  email: string
  telephone: string | null
  actif: boolean
  matricule: string | null
  carte_pro_numero: string | null
  carte_pro_expiration: string | null
  qualifications: string[]
  type_contrat: string | null
  notes_internes: string | null
}

export const QUALIFICATIONS = ['ADS', 'SSIAP 1', 'SSIAP 2', 'SSIAP 3', 'Agent cynophile', 'SST', 'Rondier', 'Palpation']
export const CONTRATS = ['CDI', 'CDD', 'Intérim', 'Vacataire', 'Autre']

/** État de la carte professionnelle : expirée, expire dans moins de 60 jours, ou valable. */
export function etatCarte(expiration: string | null): 'expiree' | 'bientot' | 'ok' | null {
  if (!expiration) return null
  const jours = (versDate(expiration).getTime() - versDate(aujourdhuiIso()).getTime()) / 864e5
  if (jours < 0) return 'expiree'
  if (jours <= 60) return 'bientot'
  return 'ok'
}

// ---------- Mode démo ----------
let demo: Agent[] = [
  { id: 'd1', prenom: 'Karim', nom: 'Benali', email: 'karim@demo.fr', telephone: '06 00 00 00 11', actif: true, matricule: 'A-001', carte_pro_numero: 'CAR-075-2030-01-01-000001', carte_pro_expiration: '2030-01-01', qualifications: ['ADS', 'SSIAP 1'], type_contrat: 'CDI', notes_internes: null },
  { id: 'd2', prenom: 'Sophie', nom: 'Martin', email: 'sophie@demo.fr', telephone: '06 00 00 00 12', actif: true, matricule: 'A-002', carte_pro_numero: null, carte_pro_expiration: '2026-12-01', qualifications: ['ADS'], type_contrat: 'Vacataire', notes_internes: null },
  { id: 'd3', prenom: 'Moussa', nom: 'Diallo', email: 'moussa@demo.fr', telephone: null, actif: false, matricule: 'A-003', carte_pro_numero: null, carte_pro_expiration: '2025-06-30', qualifications: [], type_contrat: 'CDD', notes_internes: null },
]

function fusionner(p: Record<string, unknown>, a: Record<string, unknown> | undefined): Agent {
  return {
    id: p.id as string,
    prenom: (p.prenom as string) ?? '',
    nom: (p.nom as string) ?? '',
    email: (p.email as string) ?? '',
    telephone: (p.telephone as string) ?? null,
    actif: Boolean(p.actif),
    matricule: (a?.matricule as string) ?? null,
    carte_pro_numero: (a?.carte_pro_numero as string) ?? null,
    carte_pro_expiration: (a?.carte_pro_expiration as string) ?? null,
    qualifications: (a?.qualifications as string[]) ?? [],
    type_contrat: (a?.type_contrat as string) ?? null,
    notes_internes: (a?.notes_internes as string) ?? null,
  }
}

export async function listerAgents(): Promise<Agent[]> {
  if (modeDemo) return [...demo]
  const { data: profils, error } = await supabase!
    .from('profils')
    .select('id, prenom, nom, email, telephone, actif')
    .eq('role', 'agent')
    .order('nom')
  if (error) throw error
  const ids = (profils ?? []).map((p) => p.id)
  const { data: fiches } = ids.length ? await supabase!.from('agents').select('*').in('profil_id', ids) : { data: [] }
  return (profils ?? []).map((p) => fusionner(p, (fiches ?? []).find((f) => f.profil_id === p.id)))
}

export async function chargerAgent(id: string): Promise<Agent | null> {
  if (modeDemo) return demo.find((a) => a.id === id) ?? null
  const { data: p } = await supabase!.from('profils').select('id, prenom, nom, email, telephone, actif, role').eq('id', id).maybeSingle()
  if (!p || p.role !== 'agent') return null
  const { data: a } = await supabase!.from('agents').select('*').eq('profil_id', id).maybeSingle()
  return fusionner(p, a ?? undefined)
}

/** Enregistre les informations modifiables (réservé à l'administrateur). Renvoie un message d'erreur ou null. */
export async function enregistrerAgent(a: Agent): Promise<string | null> {
  const nettoyer = (v: string | null) => (v && v.trim() ? v.trim() : null)
  if (modeDemo) {
    demo = demo.map((x) => (x.id === a.id ? { ...a } : x))
    return null
  }
  const { error: e1 } = await supabase!
    .from('profils')
    .update({ prenom: a.prenom.trim(), nom: a.nom.trim(), telephone: nettoyer(a.telephone) })
    .eq('id', a.id)
  if (e1) return 'Les informations personnelles n’ont pas pu être enregistrées.'
  const { error: e2 } = await supabase!.from('agents').upsert({
    profil_id: a.id,
    matricule: nettoyer(a.matricule),
    carte_pro_numero: nettoyer(a.carte_pro_numero),
    carte_pro_expiration: a.carte_pro_expiration || null,
    qualifications: a.qualifications,
    type_contrat: nettoyer(a.type_contrat),
    notes_internes: nettoyer(a.notes_internes),
  })
  if (e2) return /matricule|duplicate|unique/i.test(e2.message) ? 'Ce matricule est déjà utilisé par un autre agent.' : 'La fiche professionnelle n’a pas pu être enregistrée.'
  return null
}

export function ajouterAgentDemo(a: Agent) {
  demo = [...demo, a]
}

export function changerActifDemo(id: string, actif: boolean) {
  demo = demo.map((x) => (x.id === id ? { ...x, actif } : x))
}

// ---------- Disponibilités, affectations, historique d'un agent ----------
export type DispoJour = Record<string, { jour?: string; nuit?: string }>

export async function dispositionsDuMois(agentId: string, annee: number, mois: number): Promise<DispoJour> {
  if (modeDemo) return {}
  const debut = `${annee}-${String(mois + 1).padStart(2, '0')}-01`
  const fin = versIso(new Date(annee, mois + 1, 1, 12))
  const { data } = await supabase!.from('disponibilites').select('jour, creneau, statut').eq('agent_id', agentId).gte('jour', debut).lt('jour', fin)
  const res: DispoJour = {}
  for (const l of data ?? []) {
    res[l.jour] = { ...res[l.jour], [l.creneau]: l.statut }
  }
  return res
}

export interface AffectationAgent {
  id: string
  statut: 'proposee' | 'acceptee' | 'refusee' | 'confirmee' | 'annulee'
  debut: string
  fin: string
  site: string
}

export async function affectationsAgent(agentId: string): Promise<AffectationAgent[]> {
  if (modeDemo) return []
  const { data } = await supabase!
    .from('affectations')
    .select('id, statut, missions(debut, fin, sites(nom))')
    .eq('agent_id', agentId)
  return ((data ?? []) as unknown as { id: string; statut: AffectationAgent['statut']; missions: { debut: string; fin: string; sites: { nom: string } | null } | null }[])
    .filter((l) => l.missions)
    .map((l) => ({ id: l.id, statut: l.statut, debut: l.missions!.debut, fin: l.missions!.fin, site: l.missions!.sites?.nom ?? '' }))
    .sort((a, b) => b.debut.localeCompare(a.debut))
}

export interface LigneHistorique {
  id: number
  action: string
  table_nom: string
  avant: Record<string, unknown> | null
  apres: Record<string, unknown> | null
  cree_le: string
}

export async function historiqueAgent(agentId: string): Promise<LigneHistorique[]> {
  if (modeDemo) return []
  const { data } = await supabase!
    .from('historique')
    .select('id, action, table_nom, avant, apres, cree_le')
    .eq('enregistrement_id', agentId)
    .order('cree_le', { ascending: false })
    .limit(50)
  return (data ?? []) as LigneHistorique[]
}
