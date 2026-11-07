/*
  Connexion à Supabase.
  Les deux valeurs viennent des fichiers .env.* (publiques : adresse du projet et clé « publishable »).
  Sans ces valeurs, l'application fonctionne en MODE DÉMO (données fictives, connexion simulée).
*/
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const cle = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

export const modeDemo = !url || !cle

export const supabase: SupabaseClient | null = modeDemo
  ? null
  : createClient(url!, cle!, {
      auth: {
        persistSession: true, // la session reste ouverte sur le téléphone
        autoRefreshToken: true,
        detectSessionInUrl: true, // lit les liens d'invitation et de réinitialisation
        flowType: 'implicit', // nécessaire pour les invitations envoyées par l'administrateur
      },
    })

export type Role = 'admin' | 'chef' | 'agent'

export interface Profil {
  id: string
  role: Role
  prenom: string
  nom: string
  email: string
  telephone: string | null
  actif: boolean
}

/** Traduit les messages d'erreur de Supabase en français simple. */
export function messageErreur(e: unknown): string {
  const m = (e as { message?: string })?.message ?? String(e)
  if (/invalid login credentials/i.test(m)) return 'E-mail ou mot de passe incorrect.'
  if (/email not confirmed/i.test(m)) return 'Ce compte n’a pas encore été activé.'
  if (/rate limit|too many/i.test(m)) return 'Trop de tentatives. Patientez quelques minutes puis réessayez.'
  if (/password should be at least|weak password/i.test(m)) return 'Mot de passe trop faible : 8 caractères minimum, avec lettres et chiffres.'
  if (/same password|different from the old/i.test(m)) return 'Choisissez un mot de passe différent de l’ancien.'
  if (/failed to fetch|network/i.test(m)) return 'Pas de connexion internet. Vérifiez votre réseau.'
  if (/expired|invalid.*(token|link)|otp/i.test(m)) return 'Ce lien a expiré ou a déjà été utilisé. Demandez-en un nouveau.'
  return 'Une erreur est survenue. Réessayez.'
}
