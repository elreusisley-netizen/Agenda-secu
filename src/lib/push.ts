/*
  Notifications sur le téléphone ou l'ordinateur (Web Push).
  Sur iPhone, elles ne fonctionnent que si l'application est installée sur l'écran d'accueil (iOS 16.4 ou plus).
*/
import { estInstallee } from '../components/agent/Installation'
import { modeDemo, supabase } from './supabase'

export const FONCTION_PUSH = 'envoyer-push'

export type EtatPush = 'non_supporte' | 'installer' | 'refuse' | 'actif' | 'inactif'

const estIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

async function enregistrement() {
  if (!('serviceWorker' in navigator)) return null
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register('/sw.js').catch(() => null))
}

/** Où en sont les notifications sur cet appareil ? */
export async function etatPush(): Promise<EtatPush> {
  const possible = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  if (!possible) return estIOS() && !estInstallee() ? 'installer' : 'non_supporte'
  if (Notification.permission === 'denied') return 'refuse'
  const reg = await enregistrement()
  const abo = await reg?.pushManager.getSubscription()
  return abo && Notification.permission === 'granted' ? 'actif' : 'inactif'
}

const versOctets = (b64: string) => {
  const t = atob(b64.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b64.length + 3) % 4))
  return Uint8Array.from(t, (c) => c.charCodeAt(0))
}
const versB64 = (buf: ArrayBuffer | null) => {
  if (!buf) return ''
  let s = ''
  for (const x of new Uint8Array(buf)) s += String.fromCharCode(x)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function nomAppareil() {
  const ua = navigator.userAgent
  if (/iphone/i.test(ua)) return 'iPhone'
  if (/ipad/i.test(ua)) return 'iPad'
  if (/android/i.test(ua)) return 'Android'
  if (/mac/i.test(ua)) return 'Mac'
  if (/windows/i.test(ua)) return 'PC Windows'
  return 'Navigateur'
}

/** Explication lisible de l'échec d'appel à la fonction « envoyer-push » (pour le diagnostic). */
async function detailErreur(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response } | null)?.context
  let statut = 0
  let texte = ''
  try {
    statut = ctx?.status ?? 0
    texte = ctx ? await ctx.clone().text() : ''
  } catch {
    /* rien */
  }
  let message = ''
  try {
    message = (JSON.parse(texte) as { erreur?: string; message?: string }).erreur ?? JSON.parse(texte).message ?? ''
  } catch {
    message = texte.slice(0, 160)
  }
  if (statut === 404) return 'La fonction « envoyer-push » est introuvable (code 404) : vérifiez son nom exact dans Supabase.'
  if (statut === 401) return 'Accès refusé (code 401) : désactivez « Verify JWT » dans les réglages de la fonction.'
  if (message) return `Détail : ${message}${statut ? ` (code ${statut})` : ''}`
  return statut ? `Code ${statut}.` : 'La fonction « envoyer-push » ne répond pas : est-elle bien déployée ?'
}

/** Active les notifications sur cet appareil (à appeler depuis un bouton). Renvoie un message d'erreur ou null. */
export async function activerPush(profilId: string): Promise<string | null> {
  if (modeDemo || !supabase) return 'Indisponible en mode démonstration.'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return 'Notifications refusées. Vous pouvez les autoriser dans les réglages du téléphone.'
  const reg = await enregistrement()
  if (!reg) return 'Votre navigateur ne permet pas les notifications.'
  const { data, error } = await supabase.functions.invoke(FONCTION_PUSH, { body: { action: 'cle' } })
  const cle = (data as { cle?: string } | null)?.cle
  if (error || !cle) return 'Service de notifications indisponible. ' + (await detailErreur(error))
  try {
    let abo = await reg.pushManager.getSubscription()
    if (abo) {
      // Abonnement créé avec une autre clé : on le renouvelle.
      const ancienne = versB64(abo.options.applicationServerKey ?? null)
      if (ancienne && ancienne !== cle) {
        await abo.unsubscribe()
        abo = null
      }
    }
    abo ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: versOctets(cle) })
    const { error: e } = await supabase.from('abonnements_push').upsert(
      { profil_id: profilId, endpoint: abo.endpoint, p256dh: versB64(abo.getKey('p256dh')), auth: versB64(abo.getKey('auth')), appareil: nomAppareil() },
      { onConflict: 'endpoint' },
    )
    if (e) return 'Impossible d’enregistrer cet appareil. Réessayez.'
    return null
  } catch {
    return 'Activation impossible sur cet appareil. Réessayez.'
  }
}

export async function desactiverPush(): Promise<void> {
  const reg = await enregistrement()
  const abo = await reg?.pushManager.getSubscription()
  if (!abo) return
  if (supabase) await supabase.from('abonnements_push').delete().eq('endpoint', abo.endpoint)
  await abo.unsubscribe()
}

/** Envoie une notification d'essai sur les appareils de l'utilisateur connecté. */
export async function testerPush(): Promise<string | null> {
  if (!supabase) return 'Indisponible en mode démonstration.'
  const { data, error } = await supabase.functions.invoke(FONCTION_PUSH, { body: { action: 'test' } })
  if (error) return 'L’essai a échoué. ' + (await detailErreur(error))
  const r = data as { appareils?: number; recus?: number }
  if (!r.appareils) return 'Aucun appareil enregistré. Activez d’abord les notifications.'
  if (!r.recus) return 'L’envoi a été refusé par le service de notifications. Désactivez puis réactivez les notifications.'
  return null
}
