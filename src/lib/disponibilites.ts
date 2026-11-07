/*
  Disponibilités des agents : une valeur par jour et par créneau (journée / nuit).
  disponible = vert, indisponible = rouge, en_attente = orange.
  En mode démo, les données restent en mémoire.
*/
import { deux, joursDansMois } from './dates'
import { traduireErreur, type Creneau, type StatutDispo } from './missions'
import { modeDemo, supabase } from './supabase'

export type { Creneau, StatutDispo }
export type ValeurJour = Partial<Record<Creneau, StatutDispo>>
export type DispoMois = Record<string, ValeurJour>

export const STATUTS_DISPO: StatutDispo[] = ['disponible', 'indisponible', 'en_attente']
export const LIBELLE_DISPO: Record<StatutDispo, string> = {
  disponible: 'Disponible',
  indisponible: 'Indisponible',
  en_attente: 'En attente',
}
export const COULEUR_DISPO: Record<StatutDispo, string> = {
  disponible: 'bg-dispo',
  indisponible: 'bg-indispo',
  en_attente: 'bg-attente',
}
export const CRENEAUX: Creneau[] = ['jour', 'nuit']

const bornesMois = (annee: number, mois: number) => [`${annee}-${deux(mois + 1)}-01`, `${annee}-${deux(mois + 1)}-${deux(joursDansMois(annee, mois))}`]

// ---------- Mode démo ----------
let demo: DispoMois = {}

/** Disponibilités d'un agent pour un mois. */
export async function chargerMesDispos(agentId: string, annee: number, mois: number): Promise<DispoMois> {
  const [debut, fin] = bornesMois(annee, mois)
  if (modeDemo) return Object.fromEntries(Object.entries(demo).filter(([j]) => j >= debut && j <= fin).map(([j, v]) => [j, { ...v }]))
  const { data, error } = await supabase!.from('disponibilites').select('jour, creneau, statut').eq('agent_id', agentId).gte('jour', debut).lte('jour', fin)
  if (error) throw error
  const res: DispoMois = {}
  for (const l of (data ?? []) as { jour: string; creneau: Creneau; statut: StatutDispo }[]) res[l.jour] = { ...res[l.jour], [l.creneau]: l.statut }
  return res
}

/** Liste des changements entre deux versions (pour n'envoyer que ce qui a bougé). */
export function differences(avant: DispoMois, apres: DispoMois) {
  const aEnregistrer: { jour: string; creneau: Creneau; statut: StatutDispo }[] = []
  const aEffacer: { jour: string; creneau: Creneau }[] = []
  const jours = new Set([...Object.keys(avant), ...Object.keys(apres)])
  for (const jour of jours) {
    for (const creneau of CRENEAUX) {
      const a = avant[jour]?.[creneau]
      const b = apres[jour]?.[creneau]
      if (a === b) continue
      if (b) aEnregistrer.push({ jour, creneau, statut: b })
      else aEffacer.push({ jour, creneau })
    }
  }
  return { aEnregistrer, aEffacer, total: aEnregistrer.length + aEffacer.length }
}

/** Enregistre les changements de l'agent. Renvoie un message d'erreur ou null. */
export async function enregistrerMesDispos(agentId: string, avant: DispoMois, apres: DispoMois): Promise<string | null> {
  const { aEnregistrer, aEffacer } = differences(avant, apres)
  if (modeDemo) {
    for (const { jour, creneau, statut } of aEnregistrer) demo[jour] = { ...demo[jour], [creneau]: statut }
    for (const { jour, creneau } of aEffacer) {
      const v = { ...demo[jour] }
      delete v[creneau]
      if (v.jour || v.nuit) demo[jour] = v
      else delete demo[jour]
    }
    return null
  }
  if (aEnregistrer.length) {
    const { error } = await supabase!
      .from('disponibilites')
      .upsert(aEnregistrer.map((l) => ({ agent_id: agentId, ...l })), { onConflict: 'agent_id,jour,creneau' })
    if (error) return traduireErreur(error)
  }
  for (const creneau of CRENEAUX) {
    const jours = aEffacer.filter((l) => l.creneau === creneau).map((l) => l.jour)
    if (!jours.length) continue
    const { error } = await supabase!.from('disponibilites').delete().eq('agent_id', agentId).eq('creneau', creneau).in('jour', jours)
    if (error) return traduireErreur(error)
  }
  return null
}
