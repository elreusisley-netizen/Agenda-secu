/*
  Accès aux données clients et sites. En mode démo, les données restent en mémoire.
*/
import { modeDemo, supabase } from './supabase'

export interface Client {
  id: string
  nom: string
  adresse: string | null
  contact_nom: string | null
  telephone: string | null
  email: string | null
  notes: string | null
  actif: boolean
}

export interface Site {
  id: string
  client_id: string
  nom: string
  adresse: string
  code_postal: string | null
  ville: string | null
  infos_acces: string | null
  consignes: string | null
  contact_nom: string | null
  contact_telephone: string | null
  actif: boolean
}

export const CLIENT_VIDE: Omit<Client, 'id'> = { nom: '', adresse: null, contact_nom: null, telephone: null, email: null, notes: null, actif: true }
export const SITE_VIDE: Omit<Site, 'id'> = {
  client_id: '',
  nom: '',
  adresse: '',
  code_postal: null,
  ville: null,
  infos_acces: null,
  consignes: null,
  contact_nom: null,
  contact_telephone: null,
  actif: true,
}

let demoClients: Client[] = [
  { id: 'c1', nom: 'Client Démo A', adresse: '1 rue Fictive, 75000 Paris', contact_nom: 'M. Exemple', telephone: '01 00 00 00 01', email: 'contact@client-a.demo', notes: null, actif: true },
  { id: 'c2', nom: 'Client Démo B', adresse: null, contact_nom: null, telephone: null, email: null, notes: null, actif: true },
]
let demoSites: Site[] = [
  { id: 's1', client_id: 'c1', nom: 'Centre commercial', adresse: '12 rue de la Démo', code_postal: '75000', ville: 'Paris', infos_acces: 'Entrée du personnel côté parking.', consignes: 'Ronde toutes les heures.', contact_nom: 'Responsable sécurité', contact_telephone: '01 00 00 00 02', actif: true },
  { id: 's2', client_id: 'c2', nom: 'Entrepôt logistique', adresse: 'ZA de l’Exemple', code_postal: '93000', ville: 'Bobigny', infos_acces: null, consignes: null, contact_nom: null, contact_telephone: null, actif: true },
]

const nettoyer = <T extends Record<string, unknown>>(o: T): T =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' ? (v.trim() === '' ? null : v.trim()) : v])) as T

export async function listerClients(): Promise<Client[]> {
  if (modeDemo) return [...demoClients]
  const { data, error } = await supabase!.from('clients').select('id, nom, adresse, contact_nom, telephone, email, notes, actif').order('nom')
  if (error) throw error
  return (data ?? []) as Client[]
}

export async function listerSites(): Promise<Site[]> {
  if (modeDemo) return [...demoSites]
  const { data, error } = await supabase!
    .from('sites')
    .select('id, client_id, nom, adresse, code_postal, ville, infos_acces, consignes, contact_nom, contact_telephone, actif')
    .order('nom')
  if (error) throw error
  return (data ?? []) as Site[]
}

/** Crée ou modifie un client. Renvoie un message d'erreur ou null. */
export async function enregistrerClient(c: Client | Omit<Client, 'id'>): Promise<string | null> {
  const v = nettoyer({ ...c })
  if (!v.nom) return 'Le nom du client est obligatoire.'
  if (modeDemo) {
    if ('id' in v && v.id) demoClients = demoClients.map((x) => (x.id === v.id ? (v as Client) : x))
    else demoClients = [...demoClients, { ...(v as Omit<Client, 'id'>), id: 'c' + Date.now() }]
    return null
  }
  const { id, ...champs } = v as Client
  const { error } = id ? await supabase!.from('clients').update(champs).eq('id', id) : await supabase!.from('clients').insert(champs)
  return error ? 'Enregistrement impossible. Réessayez.' : null
}

/** Crée ou modifie un site. Renvoie un message d'erreur ou null. */
export async function enregistrerSite(s: Site | Omit<Site, 'id'>): Promise<string | null> {
  const v = nettoyer({ ...s })
  if (!v.client_id) return 'Choisissez le client.'
  if (!v.nom) return 'Le nom du site est obligatoire.'
  if (!v.adresse) return 'L’adresse du site est obligatoire.'
  if (modeDemo) {
    if ('id' in v && v.id) demoSites = demoSites.map((x) => (x.id === v.id ? (v as Site) : x))
    else demoSites = [...demoSites, { ...(v as Omit<Site, 'id'>), id: 's' + Date.now() }]
    return null
  }
  const { id, ...champs } = v as Site
  const { error } = id ? await supabase!.from('sites').update(champs).eq('id', id) : await supabase!.from('sites').insert(champs)
  return error ? 'Enregistrement impossible. Réessayez.' : null
}

export function adresseComplete(s: Pick<Site, 'adresse' | 'code_postal' | 'ville'>): string {
  return [s.adresse, [s.code_postal, s.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ')
}

export function lienItineraire(s: Pick<Site, 'adresse' | 'code_postal' | 'ville'>): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresseComplete(s))}`
}
