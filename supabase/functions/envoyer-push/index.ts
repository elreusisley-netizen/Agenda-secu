// Fonction serveur « envoyer-push » (Supabase Edge Function) — AGENDA SECU
// Envoie les notifications sur les téléphones et ordinateurs des utilisateurs (Web Push).
// - appelée automatiquement par la base de données à chaque nouvelle notification ;
// - { action: "cle" } : donne la clé publique nécessaire pour s'abonner ;
// - { action: "test" } : envoie une notification d'essai à l'utilisateur connecté.
// Réglage obligatoire dans Supabase : « Verify JWT » désactivé (la fonction fait ses propres vérifications).
// Aucune clé secrète n'est à saisir : les clés d'envoi sont créées automatiquement et gardées dans la base.
import { createClient } from 'npm:@supabase/supabase-js@2'

// ---------- Web Push (RFC 8291 + VAPID RFC 8292) avec WebCrypto, sans bibliothèque ----------
const enc = new TextEncoder()
const b64 = {
  vers: (u: Uint8Array) => {
    let s = ''
    for (const x of u) s += String.fromCharCode(x)
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  },
  depuis: (s: string) => {
    const t = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
    return Uint8Array.from(t, (c) => c.charCodeAt(0))
  },
}
const concat = (...l: Uint8Array[]) => {
  const r = new Uint8Array(l.reduce((n, x) => n + x.length, 0))
  let p = 0
  for (const x of l) {
    r.set(x, p)
    p += x.length
  }
  return r
}
async function hkdf(sel: Uint8Array, ikm: Uint8Array, info: Uint8Array, longueur: number) {
  const k = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: sel, info }, k, longueur * 8))
}
const jwkDepuisBrut = (pub: Uint8Array, d?: Uint8Array): JsonWebKey => ({
  kty: 'EC',
  crv: 'P-256',
  x: b64.vers(pub.slice(1, 33)),
  y: b64.vers(pub.slice(33, 65)),
  ...(d ? { d: b64.vers(d) } : {}),
  ext: true,
})

/** Chiffre un message pour un abonnement (aes128gcm). « test » permet d'imposer la clé éphémère et le sel. */
async function chiffrer(message: Uint8Array, p256dh: string, auth: string, test?: { prive: Uint8Array; public: Uint8Array; sel: Uint8Array }) {
  const uaPublic = b64.depuis(p256dh)
  const secret = b64.depuis(auth)
  let asPrive: CryptoKey
  let asPublic: Uint8Array
  if (test) {
    asPrive = await crypto.subtle.importKey('jwk', jwkDepuisBrut(test.public, test.prive), { name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveBits'])
    asPublic = test.public
  } else {
    const paire = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
    asPrive = paire.privateKey
    asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey))
  }
  const cleUa = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: cleUa }, asPrive, 256))
  const ikm = await hkdf(secret, ecdh, concat(enc.encode('WebPush: info\0'), uaPublic, asPublic), 32)
  const sel = test?.sel ?? crypto.getRandomValues(new Uint8Array(16))
  const cek = await hkdf(sel, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(sel, ikm, enc.encode('Content-Encoding: nonce\0'), 12)
  const cle = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const chiffre = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, cle, concat(message, new Uint8Array([2]))))
  const entete = new Uint8Array(21)
  entete.set(sel, 0)
  new DataView(entete.buffer).setUint32(16, 4096)
  entete[20] = asPublic.length
  return concat(entete, asPublic, chiffre)
}

/** Paire de clés VAPID (à générer une seule fois). */
async function nouvellesClesVapid() {
  const paire = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])) as CryptoKeyPair
  return {
    public: b64.vers(new Uint8Array(await crypto.subtle.exportKey('raw', paire.publicKey))),
    prive: (await crypto.subtle.exportKey('jwk', paire.privateKey)) as JsonWebKey,
  }
}

/** En-tête d'autorisation VAPID pour un point d'envoi. */
async function enteteVapid(endpoint: string, clePublique: string, clePrivee: JsonWebKey, contact: string) {
  const entete = b64.vers(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const corps = b64.vers(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: contact })))
  const cle = await crypto.subtle.importKey('jwk', { ...clePrivee, key_ops: ['sign'] }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, cle, enc.encode(`${entete}.${corps}`)))
  return `vapid t=${entete}.${corps}.${b64.vers(sig)}, k=${clePublique}`
}

/** Envoie un message à un abonnement. Renvoie le code HTTP du service d'envoi (201 = reçu). */
async function envoyer(abo: { endpoint: string; p256dh: string; auth: string }, donnees: unknown, vapid: { public: string; prive: JsonWebKey; contact: string }) {
  const corps = await chiffrer(enc.encode(JSON.stringify(donnees)), abo.p256dh, abo.auth)
  const r = await fetch(abo.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await enteteVapid(abo.endpoint, vapid.public, vapid.prive, vapid.contact),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'high',
    },
    body: corps,
  })
  return r.status
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const reponse = (corps: unknown, statut = 200) => new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } })
const CONTACT = 'https://agenda-secu.elreusisley.workers.dev'

const serveur = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

/** Clés d'envoi : créées une seule fois, puis relues dans la base. */
async function clesVapid(): Promise<{ public: string; prive: JsonWebKey; contact: string }> {
  const lire = () => serveur.from('cles_push').select('public, prive').eq('id', 1).maybeSingle()
  let { data } = await lire()
  if (!data) {
    const k = await nouvellesClesVapid()
    await serveur.from('cles_push').upsert({ id: 1, public: k.public, prive: k.prive }, { onConflict: 'id', ignoreDuplicates: true })
    data = (await lire()).data
  }
  if (!data) throw new Error('Clés d’envoi indisponibles : avez-vous installé le fichier 9 dans Supabase ?')
  return { public: data.public, prive: data.prive as JsonWebKey, contact: CONTACT }
}

/** Envoie à tous les appareils d'un utilisateur ; supprime les abonnements expirés. */
async function envoyerA(profilId: string, contenu: { titre: string; message: string; lien: string | null }) {
  const { data: abos } = await serveur.from('abonnements_push').select('id, endpoint, p256dh, auth').eq('profil_id', profilId)
  if (!abos?.length) return { appareils: 0, recus: 0 }
  const vapid = await clesVapid()
  let recus = 0
  for (const a of abos) {
    try {
      const statut = await envoyer(a, contenu, vapid)
      if (statut >= 200 && statut < 300) recus++
      else if (statut === 404 || statut === 410) await serveur.from('abonnements_push').delete().eq('id', a.id)
      else console.log('envoi refusé', statut, new URL(a.endpoint).host)
    } catch (e) {
      console.log('erreur envoi', String(e))
    }
  }
  return { appareils: abos.length, recus }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const corps = await req.json().catch(() => ({}))

    if (corps.action === 'cle') return reponse({ cle: (await clesVapid()).public })

    if (corps.action === 'test') {
      const jeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
      const { data } = await serveur.auth.getUser(jeton)
      if (!data?.user) return reponse({ erreur: 'Connexion requise.' }, 401)
      const r = await envoyerA(data.user.id, { titre: 'AGENDA SECU', message: 'Les notifications fonctionnent sur cet appareil ✅', lien: null })
      return reponse(r)
    }

    if (corps.notification) {
      // On « réserve » la notification : elle n'est envoyée qu'une fois, et seulement si elle est récente.
      const { data: n } = await serveur
        .from('notifications')
        .update({ push_envoye_le: new Date().toISOString() })
        .eq('id', corps.notification)
        .is('push_envoye_le', null)
        .gte('cree_le', new Date(Date.now() - 10 * 60e3).toISOString())
        .select('destinataire_id, titre, message, lien')
        .maybeSingle()
      if (!n) return reponse({ ignore: true })
      return reponse(await envoyerA(n.destinataire_id, { titre: n.titre, message: n.message, lien: n.lien }))
    }

    return reponse({ erreur: 'Action inconnue.' }, 400)
  } catch (e) {
    return reponse({ erreur: String((e as Error)?.message ?? e) }, 500)
  }
})
