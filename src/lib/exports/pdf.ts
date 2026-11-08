/*
  Petit générateur de PDF (sans bibliothèque) : pages A4, textes Helvetica avec accents, rectangles, lignes.
  Les coordonnées sont données depuis le coin en haut à gauche, en points (1 pt = 1/72 pouce).
*/
import { LARGEURS } from './largeurs'

export type Couleur = [number, number, number] // 0 à 255
const SPECIAUX: Record<string, number> = { '€': 0x80, '‚': 0x82, 'ƒ': 0x83, '„': 0x84, '…': 0x85, '†': 0x86, '‡': 0x87, 'ˆ': 0x88, '‰': 0x89, 'Š': 0x8a, '‹': 0x8b, 'Œ': 0x8c, 'Ž': 0x8e, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97, '˜': 0x98, '™': 0x99, 'š': 0x9a, '›': 0x9b, 'œ': 0x9c, 'ž': 0x9e, 'Ÿ': 0x9f, ' ': 0x20, ' ': 0x20 }

function versWinAnsi(s: string): number[] {
  const r: number[] = []
  for (const ch of s.normalize('NFC')) {
    const c = ch.codePointAt(0)!
    if (c >= 32 && c < 127) r.push(c)
    else if (c >= 160 && c <= 255) r.push(c)
    else if (SPECIAUX[ch] !== undefined) r.push(SPECIAUX[ch])
    else {
      const simple = ch.normalize('NFD').replace(/[̀-ͯ]/g, '')
      const sc = simple.codePointAt(0) ?? 63
      r.push(sc >= 32 && sc < 127 ? sc : 63)
    }
  }
  return r
}

const f = (n: number) => (Math.round(n * 100) / 100).toString()
const coul = (c: Couleur) => c.map((x) => f(x / 255)).join(' ')

export class DocumentPdf {
  readonly largeur: number
  readonly hauteur: number
  private pages: string[] = []
  private courant: string[] = []

  constructor(paysage = false) {
    this.largeur = paysage ? 841.89 : 595.28
    this.hauteur = paysage ? 595.28 : 841.89
    this.nouvellePage()
  }

  nouvellePage() {
    if (this.courant.length) this.pages.push(this.courant.join('\n'))
    this.courant = []
    this.pages.length // (rien)
  }

  /** Largeur d'un texte en points. */
  mesurer(texte: string, taille: number, gras = false) {
    const t = LARGEURS[gras ? 1 : 0]
    return (versWinAnsi(texte).reduce((n, c) => n + (t[c - 32] ?? 556), 0) * taille) / 1000
  }

  /** Coupe le texte avec « … » pour qu'il tienne dans la largeur donnée. */
  ajuster(texte: string, taille: number, max: number, gras = false) {
    if (this.mesurer(texte, taille, gras) <= max) return texte
    let t = texte
    while (t.length > 1 && this.mesurer(t + '…', taille, gras) > max) t = t.slice(0, -1)
    return t.trimEnd() + '…'
  }

  /** Découpe un texte en lignes qui tiennent dans la largeur donnée. */
  couper(texte: string, taille: number, max: number, gras = false): string[] {
    const lignes: string[] = []
    let ligne = ''
    for (const mot of texte.split(/\s+/)) {
      const essai = ligne ? ligne + ' ' + mot : mot
      if (this.mesurer(essai, taille, gras) <= max || !ligne) ligne = essai
      else {
        lignes.push(ligne)
        ligne = mot
      }
    }
    if (ligne) lignes.push(ligne)
    return lignes
  }

  texte(x: number, y: number, texte: string, o: { taille?: number; gras?: boolean; couleur?: Couleur; aligner?: 'gauche' | 'centre' | 'droite'; max?: number } = {}) {
    const taille = o.taille ?? 10
    let t = o.max ? this.ajuster(texte, taille, o.max, o.gras) : texte
    if (!t) return
    const w = this.mesurer(t, taille, o.gras)
    const xx = o.aligner === 'centre' ? x - w / 2 : o.aligner === 'droite' ? x - w : x
    const hex = versWinAnsi(t)
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
    t = ''
    this.courant.push(`BT ${coul(o.couleur ?? [15, 23, 42])} rg /${o.gras ? 'F2' : 'F1'} ${f(taille)} Tf ${f(xx)} ${f(this.hauteur - y - taille * 0.8)} Td <${hex}> Tj ET`)
  }

  rect(x: number, y: number, w: number, h: number, o: { fond?: Couleur; trait?: Couleur; epaisseur?: number } = {}) {
    const op = o.fond && o.trait ? 'B' : o.fond ? 'f' : 'S'
    const parts = ['q']
    if (o.fond) parts.push(`${coul(o.fond)} rg`)
    if (o.trait) parts.push(`${coul(o.trait)} RG ${f(o.epaisseur ?? 0.5)} w`)
    parts.push(`${f(x)} ${f(this.hauteur - y - h)} ${f(w)} ${f(h)} re ${op} Q`)
    this.courant.push(parts.join(' '))
  }

  ligne(x1: number, y1: number, x2: number, y2: number, couleur: Couleur = [226, 232, 240], epaisseur = 0.5) {
    this.courant.push(`q ${coul(couleur)} RG ${f(epaisseur)} w ${f(x1)} ${f(this.hauteur - y1)} m ${f(x2)} ${f(this.hauteur - y2)} l S Q`)
  }

  /** Assemble le fichier PDF. */
  terminer(titre = 'AGENDA SECU'): Blob {
    if (this.courant.length || this.pages.length === 0) this.pages.push(this.courant.join('\n'))
    this.courant = []
    const objets: string[] = []
    const n = this.pages.length
    // 1 catalogue, 2 pages, 3 police normale, 4 police grasse, 5 infos, puis (page, contenu) par page
    objets[1] = '<< /Type /Catalog /Pages 2 0 R >>'
    objets[2] = `<< /Type /Pages /Count ${n} /Kids [${this.pages.map((_, i) => `${6 + i * 2} 0 R`).join(' ')}] >>`
    objets[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
    objets[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
    const titreHex = versWinAnsi(titre)
      .map((c) => c.toString(16).padStart(2, '0'))
      .join('')
    objets[5] = `<< /Title <${titreHex}> /Producer (AGENDA SECU) >>`
    this.pages.forEach((contenu, i) => {
      objets[6 + i * 2] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(this.largeur)} ${f(this.hauteur)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${7 + i * 2} 0 R >>`
      objets[7 + i * 2] = `<< /Length ${contenu.length} >>\nstream\n${contenu}\nendstream`
    })
    let sortie = '%PDF-1.4\n%âãÏÓ\n'
    const positions: number[] = []
    for (let i = 1; i < objets.length; i++) {
      positions[i] = sortie.length
      sortie += `${i} 0 obj\n${objets[i]}\nendobj\n`
    }
    const xref = sortie.length
    sortie += `xref\n0 ${objets.length}\n0000000000 65535 f \n${positions
      .slice(1)
      .map((p) => String(p).padStart(10, '0') + ' 00000 n \n')
      .join('')}trailer\n<< /Size ${objets.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF`
    // Tout le contenu est en ASCII (textes en hexadécimal) sauf l'en-tête : encodage octet par octet.
    const octets = new Uint8Array(sortie.length)
    for (let i = 0; i < sortie.length; i++) octets[i] = sortie.charCodeAt(i) & 0xff
    return new Blob([octets], { type: 'application/pdf' })
  }
}
