// Droits configurables des chefs d'équipe (mêmes noms que les colonnes de la table permissions_chefs).
import type { Profil } from './supabase'

export const DROITS = [
  { id: 'voir_agents', libelle: 'Voir les agents', aide: 'Liste et fiches des agents' },
  { id: 'voir_plannings', libelle: 'Voir les plannings', aide: 'Planning des missions et affectations' },
  { id: 'voir_disponibilites', libelle: 'Voir les disponibilités', aide: 'Réponses des agents, jour et nuit' },
  { id: 'gerer_affectations', libelle: 'Gérer les affectations', aide: 'Proposer et confirmer des missions' },
  { id: 'suivre_reponses', libelle: 'Suivre les réponses', aide: 'Propositions acceptées ou refusées' },
  { id: 'voir_sites', libelle: 'Voir les sites et clients', aide: 'Adresses, accès et consignes' },
  { id: 'exporter', libelle: 'Comptage des heures', aide: 'Voir les heures et exporter plannings et heures (PDF, Excel)' },
] as const

export type Droit = (typeof DROITS)[number]['id']
export type Droits = Record<Droit, boolean>

export const AUCUN_DROIT: Droits = Object.fromEntries(DROITS.map((d) => [d.id, false])) as Droits
export const TOUS_LES_DROITS: Droits = Object.fromEntries(DROITS.map((d) => [d.id, true])) as Droits

/** Exigence d'accès : un droit, l'un de plusieurs droits, ou « admin » seulement. */
export type Exigence = Droit | Droit[] | 'admin' | null

export function autorise(exigence: Exigence, profil: Profil | null, droits: Droits | null): boolean {
  if (!profil) return false
  if (profil.role === 'admin') return true
  if (profil.role !== 'chef') return false
  if (exigence === null) return true
  if (exigence === 'admin') return false
  const liste = Array.isArray(exigence) ? exigence : [exigence]
  return liste.some((d) => droits?.[d])
}
