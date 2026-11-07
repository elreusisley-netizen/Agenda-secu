/*
  Données de l'espace agent : ses missions (propositions, à venir, planning) et ses notifications.
  En mode démo, les données restent en mémoire.
*/
import { useCallback, useEffect, useState } from 'react'
import { MISSIONS_AGENT_INITIALES, NOTIFICATIONS_AGENT, site as siteDemo } from '../demo/donnees-demo'
import { enHeureParis, traduireErreur, versHorodatage, type StatutAffectation } from './missions'
import { modeDemo, supabase } from './supabase'

export interface SiteMission {
  nom: string
  adresse: string
  code_postal: string | null
  ville: string | null
  infos_acces: string | null
  consignes: string | null
  contact_nom: string | null
  contact_telephone: string | null
}

export interface MaMission {
  affectation_id: string
  mission_id: string
  statut: StatutAffectation
  motif_refus: string | null
  mission_annulee: boolean
  debut: string
  fin: string
  date: string
  hDebut: string
  hFin: string
  consignes: string | null
  site: SiteMission
}

export interface Notification {
  id: string
  titre: string
  message: string
  lien: string | null
  lue: boolean
  cree_le: string
}

// ---------- Mode démo ----------
let demoMissions: MaMission[] = MISSIONS_AGENT_INITIALES.map((m, i) => {
  const s = siteDemo(m.siteId)
  const debut = versHorodatage(m.date, m.debut)
  let fin = versHorodatage(m.date, m.fin)
  if (fin <= debut) fin = new Date(new Date(fin).getTime() + 864e5).toISOString()
  return {
    affectation_id: 'a' + i,
    mission_id: m.id,
    statut: m.statut,
    motif_refus: null,
    mission_annulee: false,
    debut,
    fin,
    date: m.date,
    hDebut: m.debut,
    hFin: m.fin,
    consignes: null,
    site: { nom: s.nom, adresse: s.adresse, code_postal: null, ville: null, infos_acces: s.acces, consignes: s.consignes, contact_nom: s.contact, contact_telephone: null },
  }
})
let demoNotifs: Notification[] = NOTIFICATIONS_AGENT.map((n, i) => ({
  id: n.id,
  titre: n.titre,
  message: n.texte,
  lien: null,
  lue: n.lue,
  cree_le: new Date(Date.now() - (i + 1) * 7200e3).toISOString(),
}))

// ---------- Missions ----------
const SELECTION =
  'id, statut, motif_refus, mission_id, missions(debut, fin, consignes, statut, sites(nom, adresse, code_postal, ville, infos_acces, consignes, contact_nom, contact_telephone))'

export async function chargerMesMissions(agentId: string): Promise<MaMission[]> {
  if (modeDemo) return demoMissions.map((m) => ({ ...m }))
  const { data, error } = await supabase!.from('affectations').select(SELECTION).eq('agent_id', agentId)
  if (error) throw error
  const liste: MaMission[] = []
  for (const l of (data ?? []) as Record<string, unknown>[]) {
    const m = l.missions as Record<string, unknown> | null
    if (!m) continue // mission annulée ou plus visible
    const d = enHeureParis(m.debut as string)
    const f = enHeureParis(m.fin as string)
    const s = (m.sites as SiteMission | null) ?? { nom: 'Site', adresse: '', code_postal: null, ville: null, infos_acces: null, consignes: null, contact_nom: null, contact_telephone: null }
    liste.push({
      affectation_id: l.id as string,
      mission_id: l.mission_id as string,
      statut: l.statut as StatutAffectation,
      motif_refus: (l.motif_refus as string) ?? null,
      mission_annulee: m.statut === 'annulee',
      debut: m.debut as string,
      fin: m.fin as string,
      date: d.date,
      hDebut: d.heure,
      hFin: f.heure,
      consignes: (m.consignes as string) ?? null,
      site: s,
    })
  }
  return liste.sort((a, b) => a.debut.localeCompare(b.debut))
}

/** L'agent accepte ou refuse une proposition. Renvoie un message d'erreur ou null. */
export async function repondre(m: MaMission, statut: 'acceptee' | 'refusee', motif?: string): Promise<string | null> {
  const motifPropre = motif?.trim() ? motif.trim().slice(0, 300) : null
  if (modeDemo) {
    demoMissions = demoMissions.map((x) => (x.affectation_id === m.affectation_id ? { ...x, statut, motif_refus: statut === 'refusee' ? motifPropre : null } : x))
    return null
  }
  const { error } = await supabase!
    .from('affectations')
    .update(statut === 'refusee' ? { statut, motif_refus: motifPropre } : { statut })
    .eq('id', m.affectation_id)
  return error ? traduireErreur(error) : null
}

export const estPassee = (m: MaMission) => new Date(m.fin).getTime() < Date.now()
export const propositionsOuvertes = (ms: MaMission[]) => ms.filter((m) => m.statut === 'proposee' && !m.mission_annulee && !estPassee(m))

// Dernières données connues : affichées tout de suite quand on change d'écran, puis mises à jour.
let cacheMissions: { agent: string; liste: MaMission[] } | null = null

/** Missions de l'agent connecté, rechargées à l'ouverture de l'écran et au retour dans l'appli. */
export function useMesMissions(agentId: string | undefined) {
  const [missions, setMissions] = useState<MaMission[] | null>(cacheMissions && cacheMissions.agent === agentId ? cacheMissions.liste : null)
  const [erreur, setErreur] = useState<string | null>(null)

  const recharger = useCallback(async () => {
    if (!agentId) return
    try {
      const liste = await chargerMesMissions(agentId)
      cacheMissions = { agent: agentId, liste }
      setMissions(liste)
      setErreur(null)
    } catch {
      setErreur('Impossible de charger vos missions. Vérifiez votre connexion.')
    }
  }, [agentId])

  useEffect(() => {
    void recharger()
    const auRetour = () => document.visibilityState === 'visible' && void recharger()
    document.addEventListener('visibilitychange', auRetour)
    return () => document.removeEventListener('visibilitychange', auRetour)
  }, [recharger])

  return { missions, erreur, recharger }
}

// ---------- Notifications ----------
export async function chargerNotifications(): Promise<Notification[]> {
  if (modeDemo) return demoNotifs.map((n) => ({ ...n }))
  const { data, error } = await supabase!.from('notifications').select('id, titre, message, lien, lue, cree_le').order('cree_le', { ascending: false }).limit(50)
  if (error) throw error
  return (data ?? []) as Notification[]
}

export async function marquerLues(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  if (modeDemo) {
    demoNotifs = demoNotifs.map((n) => (ids.includes(n.id) ? { ...n, lue: true } : n))
    return
  }
  await supabase!.from('notifications').update({ lue: true }).in('id', ids)
}

/** Nombre de notifications non lues (pour la pastille de la cloche). */
export function useNonLues() {
  const [n, setN] = useState(0)
  useEffect(() => {
    let actif = true
    const lire = () =>
      chargerNotifications()
        .then((l) => actif && setN(l.filter((x) => !x.lue).length))
        .catch(() => undefined)
    void lire()
    const auRetour = () => document.visibilityState === 'visible' && void lire()
    document.addEventListener('visibilitychange', auRetour)
    return () => {
      actif = false
      document.removeEventListener('visibilitychange', auRetour)
    }
  }, [])
  return n
}

/** « Il y a 5 min », « Hier », « Le 03/11 »… */
export function depuis(horodatage: string): string {
  const s = (Date.now() - new Date(horodatage).getTime()) / 1000
  if (s < 60) return 'À l’instant'
  if (s < 3600) return `Il y a ${Math.floor(s / 60)} min`
  if (s < 86400) return `Il y a ${Math.floor(s / 3600)} h`
  if (s < 172800) return 'Hier'
  if (s < 604800) return `Il y a ${Math.floor(s / 86400)} j`
  return 'Le ' + new Date(horodatage).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}
