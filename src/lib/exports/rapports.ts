/*
  Exports des plannings et des heures : préparation des données, PDF et Excel.
  Seules les vacations CONFIRMÉES sont exportées.
*/
import { MOIS_NOMS_LONGS } from './constantes'
import { DocumentPdf, type Couleur } from './pdf'
import { creerXlsx, type CelluleXlsx } from './xlsx'
import { deux, joursDansMois } from '../dates'
import { nomAgent, type AgentCourt, type DonneesMois } from '../missions'

export interface Vacation {
  date: string
  hDebut: string
  hFin: string
  agentId: string
  agent: string
  siteId: string
  site: string
  ville: string | null
  client: string | null
  adresse: string | null
  consignes: string | null
  heures: number
  nuit: number
  dimanche: number
  ferie: number
}

// ---------- Jours fériés (France métropolitaine) ----------
function paques(y: number) {
  // Calcul de la date de Pâques (algorithme de Meeus / Jones / Butcher)
  const a = y % 19
  const b = Math.floor(y / 100)
  const c = y % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mois = Math.floor((h + l - 7 * m + 114) / 31)
  const jour = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(y, mois - 1, jour))
}
const cacheFeries = new Map<number, Set<string>>()
export function joursFeries(annee: number): Set<string> {
  let s = cacheFeries.get(annee)
  if (s) return s
  const p = paques(annee)
  const decale = (n: number) => new Date(p.getTime() + n * 864e5).toISOString().slice(0, 10)
  s = new Set([`${annee}-01-01`, decale(1), `${annee}-05-01`, `${annee}-05-08`, decale(39), decale(50), `${annee}-07-14`, `${annee}-08-15`, `${annee}-11-01`, `${annee}-11-11`, `${annee}-12-25`])
  cacheFeries.set(annee, s)
  return s
}

/** Découpe une vacation (heures de Paris) en heures totales, de nuit (21 h – 6 h), de dimanche et de jour férié. */
export function decompter(date: string, hDebut: string, hFin: string) {
  const min = (h: string) => Number(h.slice(0, 2)) * 60 + Number(h.slice(3, 5))
  const debut = min(hDebut)
  let fin = min(hFin)
  if (fin <= debut) fin += 1440
  const [a, m, j] = date.split('-').map(Number)
  let nuit = 0
  let dimanche = 0
  let ferie = 0
  for (let t = debut; t < fin; t++) {
    const jour = new Date(Date.UTC(a, m - 1, j + Math.floor(t / 1440)))
    const iso = jour.toISOString().slice(0, 10)
    const tod = t % 1440
    if (tod >= 21 * 60 || tod < 6 * 60) nuit++
    if (jour.getUTCDay() === 0) dimanche++
    if (joursFeries(jour.getUTCFullYear()).has(iso)) ferie++
  }
  return { heures: (fin - debut) / 60, nuit: nuit / 60, dimanche: dimanche / 60, ferie: ferie / 60 }
}

export interface InfosSite {
  id: string
  nom: string
  adresse: string
  code_postal: string | null
  ville: string | null
  client_id: string
}

/** Vacations confirmées du mois, avec les filtres choisis. */
export function preparerVacations(d: DonneesMois, sites: InfosSite[], clients: { id: string; nom: string }[], filtres: { agent?: string; site?: string } = {}): Vacation[] {
  const agents = new Map(d.agents.map((a) => [a.id, a]))
  const infosSite = new Map(sites.map((s) => [s.id, s]))
  const nomClient = new Map(clients.map((c) => [c.id, c.nom]))
  const res: Vacation[] = []
  for (const m of d.missions) {
    if (m.statut === 'annulee') continue
    if (filtres.site && m.site_id !== filtres.site) continue
    for (const a of m.affectations) {
      if (a.statut !== 'confirmee') continue
      if (filtres.agent && a.agent_id !== filtres.agent) continue
      const s = infosSite.get(m.site_id)
      res.push({
        date: m.date,
        hDebut: m.hDebut,
        hFin: m.hFin,
        agentId: a.agent_id,
        agent: nomAgent(agents.get(a.agent_id)),
        siteId: m.site_id,
        site: m.site_nom,
        ville: m.ville,
        client: s ? (nomClient.get(s.client_id) ?? null) : null,
        adresse: s ? [s.adresse, [s.code_postal, s.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') : null,
        consignes: m.consignes,
        ...decompter(m.date, m.hDebut, m.hFin),
      })
    }
  }
  return res.sort((x, y) => (x.date + x.hDebut + x.agent).localeCompare(y.date + y.hDebut + y.agent))
}

export interface LigneHeures {
  agentId: string
  agent: string
  vacations: number
  heures: number
  nuit: number
  dimanche: number
  ferie: number
}
export function recapHeures(vacations: Vacation[], agents: AgentCourt[], tousLesAgents: boolean): LigneHeures[] {
  const lignes = new Map<string, LigneHeures>()
  if (tousLesAgents) for (const a of agents.filter((x) => x.actif)) lignes.set(a.id, { agentId: a.id, agent: nomAgent(a), vacations: 0, heures: 0, nuit: 0, dimanche: 0, ferie: 0 })
  for (const v of vacations) {
    const l = lignes.get(v.agentId) ?? { agentId: v.agentId, agent: v.agent, vacations: 0, heures: 0, nuit: 0, dimanche: 0, ferie: 0 }
    l.vacations++
    l.heures += v.heures
    l.nuit += v.nuit
    l.dimanche += v.dimanche
    l.ferie += v.ferie
    lignes.set(v.agentId, l)
  }
  return [...lignes.values()].sort((a, b) => a.agent.localeCompare(b.agent))
}

// ---------- Mise en forme ----------
const JOURS = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.']
const JOURS_LETTRE = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
export const h2 = (n: number) => (Math.round(n * 100) / 100).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const jourDe = (iso: string) => new Date(iso + 'T12:00:00').getDay()
const titreMois = (a: number, m: number) => `${MOIS_NOMS_LONGS[m]} ${a}`
const genereLe = () => `Édité le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`

const NUIT: Couleur = [15, 23, 42]
const OR: Couleur = [245, 194, 49]
const GRIS: Couleur = [100, 116, 139]
const TRAIT: Couleur = [226, 232, 240]
const PALETTE: Couleur[] = [
  [79, 70, 229],
  [13, 148, 136],
  [22, 163, 74],
  [202, 138, 4],
  [219, 39, 119],
  [2, 132, 199],
  [147, 51, 234],
  [234, 88, 12],
]
const clair = (c: Couleur): Couleur => c.map((x) => Math.round(x + (255 - x) * 0.82)) as Couleur

function couleursSites(vacations: Vacation[]) {
  const ids = [...new Set(vacations.map((v) => v.siteId))].sort()
  return new Map(ids.map((id, i) => [id, PALETTE[i % PALETTE.length]]))
}

function entete(doc: DocumentPdf, titre: string, sousTitre: string) {
  doc.rect(0, 0, doc.largeur, 54, { fond: NUIT })
  doc.texte(24, 16, 'AGENDA SECU', { taille: 15, gras: true, couleur: OR })
  doc.texte(doc.largeur - 24, 14, titre, { taille: 13, gras: true, couleur: [255, 255, 255], aligner: 'droite' })
  doc.texte(doc.largeur - 24, 32, sousTitre, { taille: 9, couleur: [203, 213, 225], aligner: 'droite' })
}
function piedDePage(doc: DocumentPdf, page: number) {
  doc.texte(24, doc.hauteur - 22, genereLe(), { taille: 7.5, couleur: GRIS })
  doc.texte(doc.largeur - 24, doc.hauteur - 22, `Page ${page}`, { taille: 7.5, couleur: GRIS, aligner: 'droite' })
}

/** Tableau simple paginé. Renvoie le numéro de la dernière page. */
function tableau(
  doc: DocumentPdf,
  o: { y: number; colonnes: { titre: string; largeur: number; droite?: boolean }[]; lignes: (string | { t: string; gras?: boolean })[][]; page: number; titre: string; sousTitre: string; total?: string[] },
) {
  const x0 = 24
  const hLigne = 18
  let y = o.y
  let page = o.page
  const enTetes = () => {
    let x = x0
    doc.rect(x0, y, doc.largeur - 48, hLigne, { fond: [241, 245, 249] })
    for (const c of o.colonnes) {
      doc.texte(c.droite ? x + c.largeur - 5 : x + 5, y + 5, c.titre, { taille: 8, gras: true, couleur: [51, 65, 85], aligner: c.droite ? 'droite' : 'gauche', max: c.largeur - 8 })
      x += c.largeur
    }
    y += hLigne
  }
  enTetes()
  const lignes = o.total ? [...o.lignes, o.total.map((t) => ({ t, gras: true }))] : o.lignes
  lignes.forEach((l, i) => {
    if (y + hLigne > doc.hauteur - 40) {
      piedDePage(doc, page)
      doc.nouvellePage()
      page++
      entete(doc, o.titre, o.sousTitre)
      y = 70
      enTetes()
    }
    const estTotal = o.total && i === lignes.length - 1
    if (estTotal) doc.rect(x0, y, doc.largeur - 48, hLigne, { fond: [254, 249, 195] })
    else if (i % 2 === 1) doc.rect(x0, y, doc.largeur - 48, hLigne, { fond: [248, 250, 252] })
    let x = x0
    l.forEach((cell, ci) => {
      const c = o.colonnes[ci]
      const t = typeof cell === 'string' ? cell : cell.t
      const gras = typeof cell === 'string' ? false : cell.gras
      doc.texte(c.droite ? x + c.largeur - 5 : x + 5, y + 5, t, { taille: 8.5, gras, aligner: c.droite ? 'droite' : 'gauche', max: c.largeur - 8 })
      x += c.largeur
    })
    doc.ligne(x0, y + hLigne, doc.largeur - 24, y + hLigne, TRAIT)
    y += hLigne
  })
  return { page, y }
}

// ---------- PDF : planning du mois (agents × jours) + détail ----------
export function pdfPlanning(annee: number, mois: number, vacations: Vacation[], agents: AgentCourt[], filtreLibelle: string): Blob {
  const doc = new DocumentPdf(true)
  const titre = `Planning — ${titreMois(annee, mois)}`
  const sousTitre = `${filtreLibelle} · ${vacations.length} vacation${vacations.length > 1 ? 's' : ''} confirmée${vacations.length > 1 ? 's' : ''}`
  const n = joursDansMois(annee, mois)
  const jours = Array.from({ length: n }, (_, i) => `${annee}-${deux(mois + 1)}-${deux(i + 1)}`)
  const feries = joursFeries(annee)
  const couleurs = couleursSites(vacations)
  const ids = [...new Set(vacations.map((v) => v.agentId))]
  const lignes = ids.map((id) => ({ id, nom: vacations.find((v) => v.agentId === id)!.agent })).sort((a, b) => a.nom.localeCompare(b.nom))
  void agents

  const x0 = 24
  const largNoms = 112
  const largJour = (doc.largeur - 48 - largNoms) / n
  const hLigne = 26
  let page = 1
  let y = 0
  const enTetes = () => {
    entete(doc, titre, sousTitre)
    y = 66
    doc.rect(x0, y, doc.largeur - 48, 24, { fond: [241, 245, 249] })
    jours.forEach((j, i) => {
      const x = x0 + largNoms + i * largJour
      const dj = jourDe(j)
      if (dj === 0 || dj === 6 || feries.has(j)) doc.rect(x, y, largJour, 24, { fond: [226, 232, 240] })
      doc.texte(x + largJour / 2, y + 3, JOURS_LETTRE[dj], { taille: 6.5, couleur: GRIS, aligner: 'centre' })
      doc.texte(x + largJour / 2, y + 12, String(i + 1), { taille: 8, gras: true, aligner: 'centre' })
    })
    doc.texte(x0 + 5, y + 8, 'Agent', { taille: 8, gras: true, couleur: [51, 65, 85] })
    y += 24
  }
  enTetes()
  if (lignes.length === 0) doc.texte(doc.largeur / 2, y + 30, 'Aucune vacation confirmée sur cette période.', { taille: 11, couleur: GRIS, aligner: 'centre' })
  for (const l of lignes) {
    if (y + hLigne > doc.hauteur - 70) {
      piedDePage(doc, page)
      doc.nouvellePage()
      page++
      enTetes()
    }
    const total = vacations.filter((v) => v.agentId === l.id).reduce((t, v) => t + v.heures, 0)
    doc.texte(x0 + 5, y + 4, l.nom, { taille: 8, gras: true, max: largNoms - 10 })
    doc.texte(x0 + 5, y + 14, `${h2(total)} h`, { taille: 7, couleur: GRIS })
    jours.forEach((j, i) => {
      const x = x0 + largNoms + i * largJour
      const dj = jourDe(j)
      if (dj === 0 || dj === 6 || feries.has(j)) doc.rect(x, y, largJour, hLigne, { fond: [248, 250, 252] })
      const vs = vacations.filter((v) => v.agentId === l.id && v.date === j)
      if (vs.length) {
        const c = couleurs.get(vs[0].siteId) ?? PALETTE[0]
        doc.rect(x + 1, y + 1.5, largJour - 2, hLigne - 3, { fond: clair(c), trait: c, epaisseur: 0.6 })
        const court = (h: string) => (h.endsWith(':00') ? String(Number(h.slice(0, 2))) : h.replace(':', 'h'))
        doc.texte(x + largJour / 2, y + 4, `${court(vs[0].hDebut)}-${court(vs[0].hFin)}`, { taille: 6, gras: true, aligner: 'centre', max: largJour - 2 })
        doc.texte(x + largJour / 2, y + 13.5, vs.length > 1 ? `+${vs.length - 1}` : vs[0].site, { taille: 5, couleur: [51, 65, 85], aligner: 'centre', max: largJour - 3 })
      }
    })
    doc.ligne(x0, y + hLigne, doc.largeur - 24, y + hLigne, TRAIT)
    y += hLigne
  }
  // Légende des sites
  let lx = x0
  const ly = Math.min(y + 12, doc.hauteur - 56)
  for (const [id, c] of couleurs) {
    const nom = vacations.find((v) => v.siteId === id)!.site
    const w = doc.mesurer(nom, 8) + 22
    if (lx + w > doc.largeur - 24) break
    doc.rect(lx, ly + 1, 9, 9, { fond: clair(c), trait: c })
    doc.texte(lx + 13, ly + 1.5, nom, { taille: 8 })
    lx += w + 8
  }
  piedDePage(doc, page)

  // Détail des vacations
  if (vacations.length) {
    doc.nouvellePage()
    page++
    entete(doc, titre, 'Détail des vacations')
    const r = tableau(doc, {
      y: 70,
      page,
      titre,
      sousTitre: 'Détail des vacations',
      colonnes: [
        { titre: 'Date', largeur: 92 },
        { titre: 'Horaires', largeur: 84 },
        { titre: 'Durée', largeur: 48, droite: true },
        { titre: 'Agent', largeur: 150 },
        { titre: 'Site', largeur: 170 },
        { titre: 'Client', largeur: 120 },
        { titre: 'Consignes', largeur: doc.largeur - 48 - 664 },
      ],
      lignes: vacations.map((v) => [`${JOURS[jourDe(v.date)]} ${dateFr(v.date)}`, `${v.hDebut} – ${v.hFin}`, `${h2(v.heures)} h`, v.agent, v.site, v.client ?? '', v.consignes ?? '']),
      total: ['Total', '', `${h2(vacations.reduce((t, v) => t + v.heures, 0))} h`, '', '', '', ''],
    })
    piedDePage(doc, r.page)
  }
  return doc.terminer(titre)
}

// ---------- PDF : récapitulatif des heures ----------
export function pdfHeures(annee: number, mois: number, lignes: LigneHeures[], filtreLibelle: string): Blob {
  const doc = new DocumentPdf(false)
  const titre = `Heures — ${titreMois(annee, mois)}`
  entete(doc, titre, filtreLibelle)
  const tot = lignes.reduce((t, l) => ({ v: t.v + l.vacations, h: t.h + l.heures, n: t.n + l.nuit, d: t.d + l.dimanche, f: t.f + l.ferie }), { v: 0, h: 0, n: 0, d: 0, f: 0 })
  const r = tableau(doc, {
    y: 72,
    page: 1,
    titre,
    sousTitre: filtreLibelle,
    colonnes: [
      { titre: 'Agent', largeur: 177 },
      { titre: 'Vacations', largeur: 62, droite: true },
      { titre: 'Heures', largeur: 70, droite: true },
      { titre: 'dont nuit', largeur: 72, droite: true },
      { titre: 'dont dimanche', largeur: 82, droite: true },
      { titre: 'dont fériés', largeur: doc.largeur - 48 - 463, droite: true },
    ],
    lignes: lignes.map((l) => [l.agent, String(l.vacations), h2(l.heures), h2(l.nuit), h2(l.dimanche), h2(l.ferie)]),
    total: ['Total', String(tot.v), h2(tot.h), h2(tot.n), h2(tot.d), h2(tot.f)],
  })
  const notes = [
    'Seules les vacations confirmées sont comptées. Heures exprimées en heures décimales (7,5 = 7 h 30).',
    'Nuit : entre 21 h et 6 h. Dimanche et jours fériés : heures effectuées ces jours-là (de 0 h à 24 h).',
  ]
  let y = r.y + 14
  for (const n of notes) {
    for (const l of doc.couper(n, 8, doc.largeur - 48)) {
      doc.texte(24, y, l, { taille: 8, couleur: GRIS })
      y += 11
    }
  }
  piedDePage(doc, r.page)
  return doc.terminer(titre)
}

// ---------- PDF : planning personnel d'un agent ----------
export function pdfAgent(annee: number, mois: number, agent: string, vacations: Vacation[]): Blob {
  const doc = new DocumentPdf(false)
  const titre = `Mon planning — ${titreMois(annee, mois)}`
  entete(doc, titre, agent)
  const total = vacations.reduce((t, v) => t + v.heures, 0)
  doc.texte(24, 70, `${vacations.length} vacation${vacations.length > 1 ? 's' : ''} confirmée${vacations.length > 1 ? 's' : ''} · ${h2(total)} heures`, { taille: 11, gras: true })
  let y = 94
  let page = 1
  if (!vacations.length) doc.texte(24, y, 'Aucune vacation confirmée ce mois-ci.', { taille: 10, couleur: GRIS })
  for (const v of vacations) {
    const consignes = v.consignes ? doc.couper(v.consignes, 8.5, doc.largeur - 48 - 110) : []
    const h = 44 + consignes.length * 11
    if (y + h > doc.hauteur - 40) {
      piedDePage(doc, page)
      doc.nouvellePage()
      page++
      entete(doc, titre, agent)
      y = 72
    }
    doc.rect(24, y, doc.largeur - 48, h - 6, { fond: [248, 250, 252], trait: TRAIT })
    doc.rect(24, y, 4, h - 6, { fond: OR })
    doc.texte(36, y + 8, `${JOURS[jourDe(v.date)]} ${v.date.slice(8, 10)}`, { taille: 12, gras: true })
    doc.texte(36, y + 24, `${v.hDebut} – ${v.hFin}`, { taille: 9, couleur: [51, 65, 85] })
    doc.texte(134, y + 8, v.site, { taille: 10.5, gras: true, max: doc.largeur - 134 - 90 })
    doc.texte(doc.largeur - 34, y + 8, `${h2(v.heures)} h`, { taille: 10, gras: true, aligner: 'droite' })
    if (v.adresse) doc.texte(134, y + 23, v.adresse, { taille: 8.5, couleur: GRIS, max: doc.largeur - 134 - 34 })
    consignes.forEach((l, i) => doc.texte(134, y + 36 + i * 11, i === 0 ? `Consignes : ${l}` : l, { taille: 8.5, couleur: [51, 65, 85] }))
    y += h
  }
  piedDePage(doc, page)
  return doc.terminer(titre)
}

// ---------- Excel ----------
function feuilleVacations(vacations: Vacation[]) {
  const lignes: CelluleXlsx[][] = [
    ['Date', 'Jour', 'Début', 'Fin', 'Durée (h)', 'Nuit (h)', 'Dimanche (h)', 'Férié (h)', 'Agent', 'Site', 'Ville', 'Client', 'Consignes'].map((v) => ({ v, style: 'entete' as const })),
    ...vacations.map((v) => [dateFr(v.date), JOURS[jourDe(v.date)], v.hDebut, v.hFin, { v: v.heures, style: 'heure' as const }, { v: v.nuit, style: 'heure' as const }, { v: v.dimanche, style: 'heure' as const }, { v: v.ferie, style: 'heure' as const }, v.agent, v.site, v.ville ?? '', v.client ?? '', v.consignes ?? '']),
  ]
  return { nom: 'Vacations', lignes, largeurs: [11, 6, 7, 7, 9, 9, 11, 9, 24, 28, 16, 20, 40], figerLignes: 1 }
}

export function xlsxPlanning(annee: number, mois: number, vacations: Vacation[]): Blob {
  const n = joursDansMois(annee, mois)
  const jours = Array.from({ length: n }, (_, i) => `${annee}-${deux(mois + 1)}-${deux(i + 1)}`)
  const ids = [...new Set(vacations.map((v) => v.agentId))]
  const agents = ids.map((id) => ({ id, nom: vacations.find((v) => v.agentId === id)!.agent })).sort((a, b) => a.nom.localeCompare(b.nom))
  const grille: CelluleXlsx[][] = [
    [{ v: `Planning — ${titreMois(annee, mois)}`, style: 'titre' }],
    [],
    [{ v: 'Agent', style: 'entete' }, ...jours.map((j) => ({ v: `${JOURS[jourDe(j)]} ${j.slice(8, 10)}`, style: 'entete' as const })), { v: 'Total (h)', style: 'entete' }],
    ...agents.map((a) => [
      { v: a.nom, style: 'gras' as const },
      ...jours.map((j) =>
        vacations
          .filter((v) => v.agentId === a.id && v.date === j)
          .map((v) => `${v.hDebut}-${v.hFin}\n${v.site}`)
          .join('\n') || null,
      ),
      { v: vacations.filter((v) => v.agentId === a.id).reduce((t, v) => t + v.heures, 0), style: 'heure' as const },
    ]),
  ]
  return creerXlsx([{ nom: 'Planning', lignes: grille, largeurs: [24, ...jours.map(() => 13), 10], figerLignes: 3, figerColonnes: 1 }, feuilleVacations(vacations)])
}

export function xlsxHeures(annee: number, mois: number, lignes: LigneHeures[], vacations: Vacation[]): Blob {
  const tot = lignes.reduce((t, l) => ({ v: t.v + l.vacations, h: t.h + l.heures, n: t.n + l.nuit, d: t.d + l.dimanche, f: t.f + l.ferie }), { v: 0, h: 0, n: 0, d: 0, f: 0 })
  const feuille: CelluleXlsx[][] = [
    [{ v: `Heures — ${titreMois(annee, mois)}`, style: 'titre' }],
    ['Vacations confirmées uniquement. Nuit : 21 h – 6 h.'],
    [],
    ['Agent', 'Vacations', 'Heures', 'dont nuit', 'dont dimanche', 'dont fériés'].map((v) => ({ v, style: 'entete' as const })),
    ...lignes.map((l) => [l.agent, l.vacations, { v: l.heures, style: 'heure' as const }, { v: l.nuit, style: 'heure' as const }, { v: l.dimanche, style: 'heure' as const }, { v: l.ferie, style: 'heure' as const }]),
    [{ v: 'Total', style: 'gras' }, { v: tot.v, style: 'gras' }, { v: tot.h, style: 'heure' }, { v: tot.n, style: 'heure' }, { v: tot.d, style: 'heure' }, { v: tot.f, style: 'heure' }],
  ]
  return creerXlsx([{ nom: 'Heures', lignes: feuille, largeurs: [28, 11, 10, 10, 14, 11], figerLignes: 4 }, feuilleVacations(vacations)])
}
