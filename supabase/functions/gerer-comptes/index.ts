/*
  AGENDA SECU — fonction serveur « gerer-comptes »
  Réservée à l'administrateur. Elle utilise la clé secrète de Supabase, qui reste sur le serveur.

  Actions :
  - creer      : crée un compte chef ou agent (mot de passe provisoire, ou invitation par e-mail)
  - desactiver : bloque la connexion d'un compte (les données sont conservées)
  - reactiver  : débloque un compte désactivé
*/
import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function reponse(corps: unknown, statut = 200) {
  return new Response(JSON.stringify(corps), { status: statut, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

function traduire(message: string): string {
  if (/already been registered|already exists|duplicate/i.test(message)) return 'Un compte existe déjà avec cette adresse e-mail.'
  if (/Limite atteinte/i.test(message)) return 'Limite atteinte : 5 comptes chefs au maximum.'
  if (/administrateur actif/i.test(message)) return 'Impossible : il doit rester au moins un administrateur actif.'
  if (/rate limit/i.test(message)) return 'Trop d’e-mails envoyés récemment. Réessayez dans quelques minutes.'
  if (/sending|smtp|email/i.test(message)) return 'L’e-mail d’invitation n’a pas pu être envoyé. Utilisez un mot de passe provisoire.'
  return 'L’opération a échoué. Réessayez.'
}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return reponse({ erreur: 'Méthode non autorisée.' }, 405)

  try {
    const serveur = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false, autoRefreshToken: false },
    })

    // 1. Qui fait la demande ? Seul un administrateur actif est accepté.
    const jeton = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const { data: session, error: erreurSession } = await serveur.auth.getUser(jeton)
    if (erreurSession || !session.user) return reponse({ erreur: 'Session expirée. Reconnectez-vous.' }, 401)
    const { data: appelant } = await serveur.from('profils').select('role, actif').eq('id', session.user.id).maybeSingle()
    if (!appelant || appelant.role !== 'admin' || !appelant.actif) {
      return reponse({ erreur: 'Action réservée à l’administrateur.' }, 403)
    }

    const corps = await req.json().catch(() => ({}))

    // 2. Création d'un compte
    if (corps.action === 'creer') {
      const email = String(corps.email ?? '').trim().toLowerCase()
      const prenom = String(corps.prenom ?? '').trim().slice(0, 80)
      const nom = String(corps.nom ?? '').trim().slice(0, 80)
      const role = corps.role === 'chef' ? 'chef' : 'agent'
      const motDePasse = corps.motDePasse ? String(corps.motDePasse) : null

      if (!EMAIL.test(email)) return reponse({ erreur: 'Adresse e-mail invalide.' }, 400)
      if (!prenom || !nom) return reponse({ erreur: 'Le prénom et le nom sont obligatoires.' }, 400)
      if (motDePasse && (motDePasse.length < 8 || !/[a-zA-Z]/.test(motDePasse) || !/\d/.test(motDePasse))) {
        return reponse({ erreur: 'Mot de passe provisoire : 8 caractères minimum, avec lettres et chiffres.' }, 400)
      }
      if (role === 'chef') {
        const { count } = await serveur.from('profils').select('id', { count: 'exact', head: true }).eq('role', 'chef')
        if ((count ?? 0) >= 5) return reponse({ erreur: 'Limite atteinte : 5 comptes chefs au maximum.' }, 400)
      }

      let id: string
      if (motDePasse) {
        const { data, error } = await serveur.auth.admin.createUser({
          email,
          password: motDePasse,
          email_confirm: true,
          app_metadata: { role },
          user_metadata: { prenom, nom },
        })
        if (error || !data.user) return reponse({ erreur: traduire(error?.message ?? '') }, 400)
        id = data.user.id
      } else {
        const redirectTo = typeof corps.redirectTo === 'string' ? corps.redirectTo : undefined
        const { data, error } = await serveur.auth.admin.inviteUserByEmail(email, { data: { prenom, nom }, redirectTo })
        if (error || !data.user) return reponse({ erreur: traduire(error?.message ?? '') }, 400)
        id = data.user.id
        await serveur.auth.admin.updateUserById(id, { app_metadata: { role } })
      }

      // Le profil est créé automatiquement en « agent » : on fixe toujours le bon rôle et le nom.
      const { error: e } = await serveur.from('profils').update({ role, prenom, nom }).eq('id', id)
      if (e) {
        await serveur.auth.admin.deleteUser(id)
        return reponse({ erreur: traduire(e.message) }, 400)
      }
      if (role === 'chef') {
        await serveur.from('agents').delete().eq('profil_id', id)
        await serveur.from('permissions_chefs').upsert({ chef_id: id }, { onConflict: 'chef_id', ignoreDuplicates: true })
      } else {
        await serveur.from('agents').upsert({ profil_id: id }, { onConflict: 'profil_id', ignoreDuplicates: true })
      }
      return reponse({ ok: true, id })
    }

    // 3. Désactivation / réactivation
    if (corps.action === 'desactiver' || corps.action === 'reactiver') {
      const id = String(corps.id ?? '')
      if (!id) return reponse({ erreur: 'Compte non précisé.' }, 400)
      if (id === session.user.id) return reponse({ erreur: 'Vous ne pouvez pas désactiver votre propre compte.' }, 400)
      const actif = corps.action === 'reactiver'
      const { error } = await serveur.from('profils').update({ actif }).eq('id', id)
      if (error) return reponse({ erreur: traduire(error.message) }, 400)
      // Bloque aussi la connexion côté Supabase (et ferme les sessions ouvertes).
      await serveur.auth.admin.updateUserById(id, { ban_duration: actif ? 'none' : '876000h' })
      return reponse({ ok: true })
    }

    return reponse({ erreur: 'Action inconnue.' }, 400)
  } catch (_e) {
    return reponse({ erreur: 'Erreur du serveur. Réessayez.' }, 500)
  }
})
