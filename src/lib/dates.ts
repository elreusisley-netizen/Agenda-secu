// Outils de dates en français. Les dates sont manipulées au format « AAAA-MM-JJ ».

export const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
]
export const MOIS_COURTS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
export const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const JOURS_ABREGES = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.']
const JOURS_COURTS_DIM = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

/** Construit une date locale à midi (évite les décalages d'heure d'été). */
export function versDate(iso: string): Date {
  const [a, m, j] = iso.split('-').map(Number)
  return new Date(a, m - 1, j, 12)
}

export function versIso(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const j = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${j}`
}

export function aujourdhuiIso(): string {
  return versIso(new Date())
}

export function deux(n: number): string {
  return String(n).padStart(2, '0')
}

/** « Sam. 14 nov. » */
export function dateCourte(iso: string): string {
  const d = versDate(iso)
  return `${JOURS_ABREGES[d.getDay()]} ${deux(d.getDate())} ${MOIS_COURTS[d.getMonth()]}`
}

/** « Sam » */
export function jourSemaineCourt(iso: string): string {
  return JOURS_COURTS_DIM[versDate(iso).getDay()]
}

export function numeroJour(iso: string): string {
  return deux(versDate(iso).getDate())
}

export function titreMois(annee: number, mois: number): string {
  return `${MOIS[mois]} ${annee}`
}

export function joursDansMois(annee: number, mois: number): number {
  return new Date(annee, mois + 1, 0).getDate()
}

/** Cases du calendrier mensuel, semaine commençant le lundi (null = case vide). */
export function grilleMois(annee: number, mois: number): (string | null)[] {
  const premier = new Date(annee, mois, 1, 12)
  const decalage = (premier.getDay() + 6) % 7
  const cases: (string | null)[] = Array(decalage).fill(null)
  for (let j = 1; j <= joursDansMois(annee, mois); j++) cases.push(versIso(new Date(annee, mois, j, 12)))
  while (cases.length % 7 !== 0) cases.push(null)
  return cases
}

/** Les 7 jours (lundi → dimanche) de la semaine contenant `iso`. */
export function semaineDe(iso: string): string[] {
  const d = versDate(iso)
  const lundi = new Date(d)
  lundi.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(lundi)
    x.setDate(lundi.getDate() + i)
    return versIso(x)
  })
}

export function joursDuMois(annee: number, mois: number): string[] {
  return Array.from({ length: joursDansMois(annee, mois) }, (_, i) => versIso(new Date(annee, mois, i + 1, 12)))
}

export function ajouterJours(iso: string, n: number): string {
  const d = versDate(iso)
  d.setDate(d.getDate() + n)
  return versIso(d)
}

export function moisSuivant(annee: number, mois: number, sens: 1 | -1): [number, number] {
  const d = new Date(annee, mois + sens, 1)
  return [d.getFullYear(), d.getMonth()]
}

/** Convertit « 22:00 » en minutes. */
export function minutes(heure: string): number {
  const [h, m] = heure.split(':').map(Number)
  return h * 60 + m
}

/** Vrai si deux créneaux du même jour se chevauchent (gère les fins après minuit). */
export function chevauche(d1: string, f1: string, d2: string, f2: string): boolean {
  const a1 = minutes(d1)
  let b1 = minutes(f1)
  const a2 = minutes(d2)
  let b2 = minutes(f2)
  if (b1 <= a1) b1 += 1440
  if (b2 <= a2) b2 += 1440
  return a1 < b2 && a2 < b1
}
