/* Création d'une archive ZIP simple (sans compression) — utilisée pour les fichiers Excel. */
const TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return t
})()
function crc32(d: Uint8Array) {
  let c = 0xffffffff
  for (const x of d) c = TABLE[(c ^ x) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

export function creerZip(fichiers: { nom: string; contenu: string | Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder()
  const morceaux: Uint8Array[] = []
  const central: Uint8Array[] = []
  let decalage = 0
  for (const f of fichiers) {
    const nom = enc.encode(f.nom)
    const data = typeof f.contenu === 'string' ? enc.encode(f.contenu) : f.contenu
    const crc = crc32(data)
    const local = new Uint8Array(30 + nom.length)
    const v = new DataView(local.buffer)
    v.setUint32(0, 0x04034b50, true)
    v.setUint16(4, 20, true)
    v.setUint16(6, 0x0800, true) // noms en UTF-8
    v.setUint16(8, 0, true) // sans compression
    v.setUint16(10, 0, true)
    v.setUint16(12, 0x21, true)
    v.setUint32(14, crc, true)
    v.setUint32(18, data.length, true)
    v.setUint32(22, data.length, true)
    v.setUint16(26, nom.length, true)
    local.set(nom, 30)
    const c = new Uint8Array(46 + nom.length)
    const w = new DataView(c.buffer)
    w.setUint32(0, 0x02014b50, true)
    w.setUint16(4, 20, true)
    w.setUint16(6, 20, true)
    w.setUint16(8, 0x0800, true)
    w.setUint16(12, 0, true)
    w.setUint16(14, 0x21, true)
    w.setUint32(16, crc, true)
    w.setUint32(20, data.length, true)
    w.setUint32(24, data.length, true)
    w.setUint16(28, nom.length, true)
    w.setUint32(42, decalage, true)
    c.set(nom, 46)
    morceaux.push(local, data)
    central.push(c)
    decalage += local.length + data.length
  }
  const tailleCentral = central.reduce((n, c) => n + c.length, 0)
  const fin = new Uint8Array(22)
  const e = new DataView(fin.buffer)
  e.setUint32(0, 0x06054b50, true)
  e.setUint16(8, fichiers.length, true)
  e.setUint16(10, fichiers.length, true)
  e.setUint32(12, tailleCentral, true)
  e.setUint32(16, decalage, true)
  const tout = [...morceaux, ...central, fin]
  const r = new Uint8Array(tout.reduce((n, x) => n + x.length, 0))
  let p = 0
  for (const x of tout) {
    r.set(x, p)
    p += x.length
  }
  return r
}
