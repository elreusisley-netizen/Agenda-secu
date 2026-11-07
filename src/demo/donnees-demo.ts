/*
  ⚠️ DONNÉES DE DÉMONSTRATION — FICTIVES ⚠️
  Ce fichier sert uniquement à l'étape 2 (reproduction des maquettes).
  Aucune de ces données n'ira en production : à l'étape 3, elles seront
  remplacées par la vraie base Supabase et ce dossier « demo » sera supprimé.
*/

export type Statut = 'dispo' | 'indispo' | 'attente'
export type Creneau = 'jour' | 'nuit'
/** Disponibilités : date « AAAA-MM-JJ » → statut par créneau */
export type Disponibilites = Record<string, Partial<Record<Creneau, Statut>>>

export interface Site {
  id: string
  nom: string
  client: string
  adresse: string
  acces: string
  consignes: string
  contact: string
}

export type StatutAffectation = 'proposee' | 'acceptee' | 'refusee' | 'confirmee'

export interface MissionAgent {
  id: string
  date: string
  debut: string
  fin: string
  siteId: string
  statut: StatutAffectation
}

export interface AgentDemo {
  id: string
  nom: string
  initiales: string
  teinte: string
}

export interface CreneauPlanning {
  id: string
  agentId: string
  date: string
  debut: string
  fin: string
  siteId: string
  statut: 'confirmee' | 'proposee'
}

export const SITES: Site[] = [
  {
    id: 'centre',
    nom: 'Centre commercial',
    client: 'Client Démo A',
    adresse: '12 rue de la Démo, 75000 Paris (adresse fictive)',
    acces: 'Entrée du personnel côté parking, badge à retirer au PC sécurité.',
    consignes: 'Tenue complète. Ronde toutes les heures. Main courante à remplir en fin de vacation.',
    contact: 'Responsable sécurité — 01 00 00 00 01',
  },
  {
    id: 'evenement',
    nom: 'Événement privé',
    client: 'Client Démo B',
    adresse: '5 allée Fictive, 92000 Nanterre (adresse fictive)',
    acces: 'Accès par l’entrée des artistes. Se présenter 15 minutes avant.',
    consignes: 'Contrôle des invitations à l’entrée. Costume sombre exigé.',
    contact: 'Organisateur — 06 00 00 00 02',
  },
  {
    id: 'entrepot',
    nom: 'Entrepôt logistique',
    client: 'Client Démo C',
    adresse: 'ZA de l’Exemple, 93000 Bobigny (adresse fictive)',
    acces: 'Portail B, code communiqué le jour même.',
    consignes: 'Contrôle des entrées et sorties des véhicules. Registre obligatoire.',
    contact: 'Chef de quai — 06 00 00 00 03',
  },
]

export const site = (id: string): Site => SITES.find((s) => s.id === id) ?? SITES[0]

export const MISSIONS_AGENT_INITIALES: MissionAgent[] = [
  { id: 'c1', date: '2026-11-09', debut: '09:00', fin: '18:00', siteId: 'centre', statut: 'confirmee' },
  { id: 'c2', date: '2026-11-12', debut: '08:00', fin: '17:00', siteId: 'evenement', statut: 'confirmee' },
  { id: 'c3', date: '2026-11-19', debut: '09:00', fin: '18:00', siteId: 'entrepot', statut: 'confirmee' },
  { id: 'c4', date: '2026-12-03', debut: '09:00', fin: '18:00', siteId: 'centre', statut: 'confirmee' },
  { id: 'p1', date: '2026-11-14', debut: '08:00', fin: '17:00', siteId: 'evenement', statut: 'proposee' },
  { id: 'p2', date: '2026-11-15', debut: '14:00', fin: '22:00', siteId: 'centre', statut: 'proposee' },
  { id: 'p3', date: '2026-11-17', debut: '09:00', fin: '18:00', siteId: 'entrepot', statut: 'proposee' },
]

const joursVerts = [4, 5, 6, 10, 11, 17, 18, 19, 24, 25, 26, 27]
export const DISPONIBILITES_INITIALES: Disponibilites = Object.fromEntries(
  joursVerts.map((j) => [`2026-11-${String(j).padStart(2, '0')}`, { jour: 'dispo', nuit: 'dispo' }]),
)

export const AGENTS: AgentDemo[] = [
  { id: 'a1', nom: 'Agent 1', initiales: 'A1', teinte: '#6b7a99' },
  { id: 'a2', nom: 'Agent 2', initiales: 'A2', teinte: '#8a6b55' },
  { id: 'a3', nom: 'Agent 3', initiales: 'A3', teinte: '#556b5c' },
  { id: 'a4', nom: 'Agent 4', initiales: 'A4', teinte: '#7a5a6e' },
  { id: 'a5', nom: 'Agent 5', initiales: 'A5', teinte: '#4f6a86' },
  { id: 'a6', nom: 'Agent 6', initiales: 'A6', teinte: '#7c6f4f' },
]

export const CRENEAUX_INITIAUX: CreneauPlanning[] = [
  { id: 'g1', agentId: 'a1', date: '2026-11-04', debut: '09:00', fin: '18:00', siteId: 'centre', statut: 'confirmee' },
  { id: 'g2', agentId: 'a1', date: '2026-11-06', debut: '09:00', fin: '18:00', siteId: 'centre', statut: 'confirmee' },
  { id: 'g3', agentId: 'a2', date: '2026-11-03', debut: '09:00', fin: '18:00', siteId: 'entrepot', statut: 'confirmee' },
  { id: 'g4', agentId: 'a3', date: '2026-11-07', debut: '14:00', fin: '22:00', siteId: 'evenement', statut: 'proposee' },
  { id: 'g5', agentId: 'a3', date: '2026-11-08', debut: '14:00', fin: '22:00', siteId: 'evenement', statut: 'proposee' },
  { id: 'g6', agentId: 'a4', date: '2026-11-02', debut: '09:00', fin: '18:00', siteId: 'centre', statut: 'confirmee' },
  { id: 'g7', agentId: 'a4', date: '2026-11-06', debut: '09:00', fin: '18:00', siteId: 'entrepot', statut: 'confirmee' },
  { id: 'g8', agentId: 'a5', date: '2026-11-12', debut: '22:00', fin: '06:00', siteId: 'entrepot', statut: 'confirmee' },
  { id: 'g9', agentId: 'a6', date: '2026-11-14', debut: '08:00', fin: '17:00', siteId: 'evenement', statut: 'proposee' },
]

/** Indicateurs du tableau de bord (valeurs des maquettes, fictives). */
export const INDICATEURS = {
  agentsActifs: 42,
  missionsMois: 68,
  aPourvoir: 5,
  couvertes: 63,
}

/** Missions cumulées sur 30 jours (courbe du tableau de bord). */
export const COURBE_30_JOURS = [
  2, 4, 5, 7, 10, 11, 13, 16, 17, 19, 22, 24, 25, 28, 31, 32, 35, 37, 40, 41, 44, 47, 49, 51, 54, 57, 59, 62, 65, 68,
]

export const NOTIFICATIONS_AGENT = [
  { id: 'n1', titre: 'Nouvelles propositions', texte: '3 missions vous sont proposées pour novembre.', quand: 'Il y a 2 h', lue: false },
  { id: 'n2', titre: 'Planning publié', texte: 'Votre planning de novembre est disponible.', quand: 'Hier', lue: false },
  { id: 'n3', titre: 'Rappel', texte: 'Pensez à déclarer vos disponibilités de décembre.', quand: 'Il y a 3 j', lue: true },
]

export const NOTIFICATIONS_ADMIN = [
  { id: 'm1', texte: 'Agent 3 n’a pas encore répondu à 2 propositions.', quand: 'Il y a 1 h' },
  { id: 'm2', texte: '5 vacations restent à pourvoir en novembre.', quand: 'Aujourd’hui' },
  { id: 'm3', texte: 'Agent 1 a déclaré ses disponibilités de décembre.', quand: 'Hier' },
]
