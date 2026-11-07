/*
  Lecture d'un fichier Excel (.xlsx) directement dans le navigateur, sans bibliothèque externe.
  Un .xlsx est une archive ZIP de fichiers XML : on lit l'archive, puis les feuilles.
  Résultat : pour chaque feuille, une grille { "A8": valeur, ... } (texte ou nombre).
*/

export type Valeur = string | number
export interface Feuille {
  nom: string
  cellules: Map<string, Valeur> // clé « A8 »
  lignes: number[] // numéros de ligne qui contiennent au moins une valeur
}

// ---------- Archive ZIP ----------
async function inflater(donnees: Uint8Array): Promise<Uint8Array> {
  const flux = new Blob([donnees as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Uint8Array(await new Response(flux).arrayBuffer())
}

async function lireZip(buffer: ArrayBuffer): Promise<Map<string, () => Promise<Uint8Array>>> {
  const v = new DataView(buffer)
  const octets = new Uint8Array(buffer)
  // Fin du répertoire central (signature 0x06054b50), cherchée en partant de la fin.
  let fin = -1
  for (let i = octets.length - 22; i >= Math.max(0, octets.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      fin = i
      break
    }
  }
  if (fin < 0) throw new Error('zip')
  const nb = v.getUint16(fin + 10, true)
  let p = v.getUint32(fin + 16, true)
  const fichiers = new Map<string, () => Promise<Uint8Array>>()
  const decodeur = new TextDecoder()
  for (let k = 0; k < nb; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('zip')
    const methode = v.getUint16(p + 10, true)
    const taille = v.getUint32(p + 20, true)
    const lgNom = v.getUint16(p + 28, true)
    const lgExtra = v.getUint16(p + 30, true)
    const lgCom = v.getUint16(p + 32, true)
    const local = v.getUint32(p + 42, true)
    const nom = decodeur.decode(octets.subarray(p + 46, p + 46 + lgNom))
    fichiers.set(nom, async () => {
      const debut = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true)
      const brut = octets.subarray(debut, debut + taille)
      if (methode === 0) return brut
      if (methode === 8) return inflater(brut)
      throw new Error('zip')
    })
    p += 46 + lgNom + lgExtra + lgCom
  }
  return fichiers
}

// ---------- XML (formats simples et réguliers d'Excel) ----------
const decoderXml = (s: string) =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&amp;/g, '&')

const attribut = (balise: string, nom: string) => balise.match(new RegExp(`\\s${nom}="([^"]*)"`))?.[1]
const textes = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decoderXml(m[1])).join('')

/** Lit toutes les feuilles d'un fichier .xlsx. */
export async function lireExcel(buffer: ArrayBuffer): Promise<Feuille[]> {
  const zip = await lireZip(buffer)
  const lire = async (nom: string) => {
    const f = zip.get(nom)
    return f ? new TextDecoder().decode(await f()) : ''
  }
  if (!zip.has('xl/workbook.xml')) throw new Error('format')

  const partages = [...(await lire('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textes(m[1]))
  const liens = new Map<string, string>()
  for (const m of (await lire('xl/_rels/workbook.xml.rels')).matchAll(/<Relationship\b[^>]*>/g)) {
    const id = attribut(m[0], 'Id')
    const cible = attribut(m[0], 'Target')
    if (id && cible) liens.set(id, cible.replace(/^\/?(xl\/)?/, 'xl/'))
  }

  const feuilles: Feuille[] = []
  for (const m of (await lire('xl/workbook.xml')).matchAll(/<sheet\b[^>]*>/g)) {
    const nom = decoderXml(attribut(m[0], 'name') ?? '')
    const chemin = liens.get(attribut(m[0], 'r:id') ?? '')
    if (!chemin) continue
    const xml = await lire(chemin)
    const cellules = new Map<string, Valeur>()
    const lignes = new Set<number>()
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = attribut(c[0], 'r')
      const contenu = c[2] ?? ''
      if (!ref) continue
      const type = attribut(c[0], 't')
      const brut = contenu.match(/<v>([\s\S]*?)<\/v>/)?.[1]
      let valeur: Valeur | undefined
      if (type === 's' && brut !== undefined) valeur = partages[Number(brut)]
      else if (type === 'inlineStr') valeur = textes(contenu)
      else if ((type === 'str' || type === 'e') && brut !== undefined) valeur = decoderXml(brut)
      else if (type === 'b' && brut !== undefined) valeur = brut === '1' ? 'VRAI' : 'FAUX'
      else if (brut !== undefined && brut !== '') valeur = Number(brut)
      if (valeur === undefined || (typeof valeur === 'string' && valeur.trim() === '')) continue
      cellules.set(ref, typeof valeur === 'string' ? valeur.trim() : valeur)
      lignes.add(Number(ref.replace(/^[A-Z]+/, '')))
    }
    feuilles.push({ nom, cellules, lignes: [...lignes].sort((a, b) => a - b) })
  }
  return feuilles
}

export const colonneDe = (ref: string) => ref.replace(/\d+$/, '')
