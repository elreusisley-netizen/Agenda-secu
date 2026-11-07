/*
  Interprétation d'un planning Excel au format de l'entreprise :
    - un titre « PLANNING <SITE> <MOIS> <ANNÉE> <NOM DE L'AGENT> »
    - une ligne d'en-têtes (DEBUT, FIN DE SERVICE, OBSERVATIONS)
    - une ligne par vacation : date, heure de début, heure de fin, lieu.
  Puis rapprochement avec les agents et les sites enregistrés.
*/
import { colonneDe, type Feuille, type Valeur } from './lectureExcel'
import { modeDemo, supabase } from './supabase'
import { bornes, traduireErreur } from './missions'
import { deux } from './dates'

export interface VacationLue {
  ligne: number
  date: string // AAAA-MM-JJ
  hDebut: string // HH:MM
  hFin: string
  lieu: string
  observation: string | null
  probleme: string | null
}

export interface PlanningLu {
  feuille: string
  titre: string | null
  nomAgent: string | null
  observations: string | null
  vacations: VacationLue[]
}

const MOIS_NOMS = ['JANVIER', 'FEVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOUT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DECEMBRE']

/** Majuscules sans accents ni espaces superflus. */
export const normaliser = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()

/** Date Excel (nombre de jours depuis le 30/12/1899) ou texte « jj/mm/aa ». */
function lireDate(v: Valeur | undefined, anneeParDefaut: number): string | null {
  if (typeof v === 'number') {
    if (v < 20000 || v > 90000) return null
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 864e5)
    return d.toISOString().slice(0, 10)
  }
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/)
    if (!m) return null
    const j = Number(m[1])
    const mo = Number(m[2])
    let a = m[3] ? Number(m[3]) : anneeParDefaut
    if (a < 100) a += 2000
    if (mo < 1 || mo > 12 || j < 1 || j > 31) return null
    return `${a}-${deux(mo)}-${deux(j)}`
  }
  return null
}

/** Heure « 09H00 », « 9h », « 21H30 », « 09:00 », ou nombre Excel (fraction de jour). */
function lireHeure(v: Valeur | undefined): string | null {
  if (typeof v === 'number') {
    if (v >= 0 && v < 1) {
      const min = Math.round(v * 1440) % 1440
      return `${deux(Math.floor(min / 60))}:${deux(min % 60)}`
    }
    if (Number.isInteger(v) && v >= 0 && v <= 24) return `${deux(v % 24)}:00`
    return null
  }
  if (typeof v === 'string') {
    const m = v.trim().match(/^(\d{1,2})\s*(?:[hH:]\s*(\d{2})?)?\s*$/)
    if (!m) return null
    const h = Number(m[1])
    const mi = m[2] ? Number(m[2]) : 0
    if (h > 24 || mi > 59) return null
    return `${deux(h % 24)}:${deux(mi)}`
  }
  return null
}

function analyserFeuille(f: Feuille): PlanningLu {
  const cell = (col: string, ligne: number) => f.cellules.get(col + ligne)
  const cellulesLigne = (ligne: number) => [...f.cellules.entries()].filter(([r]) => Number(r.replace(/^[A-Z]+/, '')) === ligne).map(([r, v]) => ({ col: colonneDe(r), v }))
  const ordreCol = (c: string) => [...c].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0)

  // Titre
  let titre: string | null = null
  for (const [, v] of f.cellules) {
    if (typeof v === 'string' && normaliser(v).startsWith('PLANNING')) {
      titre = v.trim()
      break
    }
  }
  let nomAgent: string | null = null
  let annee = new Date().getFullYear()
  if (titre) {
    const t = normaliser(titre)
    const m = t.match(new RegExp(`\\b(${MOIS_NOMS.join('|')})\\b\\s*(\\d{4})?\\s*(.*)$`))
    if (m) {
      if (m[2]) annee = Number(m[2])
      nomAgent = m[3]?.trim() || null
    }
  }

  // Ligne d'en-têtes
  let ligneEntete = 0
  let colDebut = ''
  let colFin = ''
  let colObs = ''
  let colDate = ''
  for (const l of f.lignes) {
    const cs = cellulesLigne(l)
    const debut = cs.find((c) => typeof c.v === 'string' && /^(HEURE (DE )?)?DEBUT/.test(normaliser(c.v)))
    if (debut) {
      ligneEntete = l
      colDebut = debut.col
      colFin = cs.find((c) => typeof c.v === 'string' && /\bFIN\b/.test(normaliser(c.v)))?.col ?? ''
      colObs = cs.find((c) => typeof c.v === 'string' && normaliser(c.v).startsWith('OBSERV'))?.col ?? ''
      colDate = cs.find((c) => typeof c.v === 'string' && /\b(DATE|JOUR)\b/.test(normaliser(c.v)))?.col ?? ''
      break
    }
  }

  const vacations: VacationLue[] = []
  const observations: string[] = []
  const lignes = ligneEntete ? f.lignes.filter((l) => l > ligneEntete) : f.lignes
  for (const l of lignes) {
    const cs = cellulesLigne(l).sort((a, b) => ordreCol(a.col) - ordreCol(b.col))
    // Date : colonne « DATE » si elle existe, sinon la première valeur qui ressemble à une date.
    const cDate = colDate ? cs.find((c) => c.col === colDate) : cs.find((c) => lireDate(c.v, annee) && (!colDebut || ordreCol(c.col) < ordreCol(colDebut)))
    const date = cDate ? lireDate(cDate.v, annee) : null
    const obs = colObs ? cell(colObs, l) : undefined
    if (!date) {
      if (typeof obs === 'string') observations.push(obs)
      continue
    }
    const cDebut = colDebut ? cell(colDebut, l) : cs.find((c) => c !== cDate && lireHeure(c.v))?.v
    const cFin = colFin ? cell(colFin, l) : cs.filter((c) => c !== cDate && lireHeure(c.v))[1]?.v
    const hDebut = lireHeure(cDebut)
    const hFin = lireHeure(cFin)
    const lieu = cs.find((c) => typeof c.v === 'string' && c !== cDate && ![colDebut, colFin, colObs, colDate].includes(c.col) && !lireHeure(c.v))?.v as string | undefined
    let probleme: string | null = null
    if (!hDebut || !hFin) probleme = 'Horaires illisibles'
    else if (hDebut === hFin) probleme = 'Début et fin identiques'
    else if (!lieu) probleme = 'Lieu manquant'
    vacations.push({ ligne: l, date, hDebut: hDebut ?? '', hFin: hFin ?? '', lieu: (lieu ?? '').trim(), observation: typeof obs === 'string' ? obs : null, probleme })
  }

  return { feuille: f.nom, titre, nomAgent, observations: observations.join(' — ') || null, vacations: vacations.sort((a, b) => (a.date + a.hDebut).localeCompare(b.date + b.hDebut)) }
}

/** Choisit la feuille qui contient le plus de vacations. */
export function interpreter(feuilles: Feuille[]): PlanningLu {
  const resultats = feuilles.map(analyserFeuille).sort((a, b) => b.vacations.length - a.vacations.length)
  if (!resultats.length || resultats[0].vacations.length === 0) {
    throw new Error('Aucune vacation trouvée dans ce fichier. Vérifiez qu’il contient bien une colonne de dates et les heures de début et de fin.')
  }
  return resultats[0]
}

// ---------- Rapprochements ----------
const mots = (s: string) => normaliser(s).split(' ').filter((m) => m.length >= 2)

/** Agent dont le nom correspond le mieux au nom lu dans le titre (null si aucun). */
export function trouverAgent<T extends { id: string; prenom: string; nom: string }>(nomLu: string | null, agents: T[]): T | null {
  if (!nomLu) return null
  const lus = new Set(mots(nomLu))
  let meilleur: T | null = null
  let score = 0
  for (const a of agents) {
    const ms = [...new Set(mots(`${a.prenom} ${a.nom}`))]
    const s = ms.filter((m) => lus.has(m)).length
    if (s > score) {
      score = s
      meilleur = a
    }
  }
  return meilleur
}

/** Site correspondant à un lieu (« BOURGET ») : correspondance enregistrée, sinon nom du site qui contient le mot. */
export function trouverSite<T extends { id: string; nom: string; actif: boolean }>(lieu: string, sites: T[], correspondances: Record<string, string>): T | null {
  const cle = normaliser(lieu)
  const memorise = sites.find((s) => s.id === correspondances[cle] && s.actif)
  if (memorise) return memorise
  const candidats = sites.filter((s) => s.actif && ` ${normaliser(s.nom)} `.includes(` ${cle} `))
  return candidats.length === 1 ? candidats[0] : null
}

// ---------- Correspondances mémorisées (paramètres de l'entreprise) ----------
let demoCorrespondances: Record<string, string> = {}

export async function chargerCorrespondances(): Promise<Record<string, string>> {
  if (modeDemo) return { ...demoCorrespondances }
  const { data } = await supabase!.from('parametres').select('infos').maybeSingle()
  return ((data?.infos as Record<string, unknown> | undefined)?.correspondances_lieux as Record<string, string>) ?? {}
}

export async function memoriserCorrespondances(nouvelles: Record<string, string>): Promise<void> {
  if (modeDemo) {
    demoCorrespondances = { ...demoCorrespondances, ...nouvelles }
    return
  }
  const { data } = await supabase!.from('parametres').select('infos').maybeSingle()
  const infos = (data?.infos as Record<string, unknown>) ?? {}
  const avant = (infos.correspondances_lieux as Record<string, string>) ?? {}
  await supabase!
    .from('parametres')
    .update({ infos: { ...infos, correspondances_lieux: { ...avant, ...nouvelles } } })
    .eq('id', 1)
}

// ---------- Enregistrement ----------
export interface ResultatImport {
  index: number
  resultat: 'ajoutee' | 'deja' | 'erreur'
  message?: string
}

export async function importer(
  agentId: string,
  statut: 'confirmee' | 'proposee',
  vacations: { site: string; date: string; hDebut: string; hFin: string; consignes: string }[],
): Promise<{ resultats: ResultatImport[] | null; erreur: string | null }> {
  const lignes = vacations.map((v) => ({ site: v.site, ...bornes(v.date, v.hDebut, v.hFin), consignes: v.consignes }))
  if (modeDemo) return { resultats: lignes.map((_, index) => ({ index, resultat: 'ajoutee' as const })), erreur: null }
  const { data, error } = await supabase!.rpc('importer_vacations', { p_agent: agentId, p_statut: statut, p_vacations: lignes })
  if (error) return { resultats: null, erreur: traduireErreur(error) }
  return { resultats: (data as ResultatImport[]) ?? [], erreur: null }
}
