/*
  Lu en tout premier au démarrage : repère si l'application a été ouverte
  depuis un lien reçu par e-mail (invitation ou mot de passe oublié),
  avant que Supabase ne nettoie l'adresse.
*/
function lire() {
  try {
    const h = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const type = h.get('type')
    const erreur = h.get('error_description') ?? h.get('error')
    return {
      type: type === 'invite' || type === 'recovery' ? (type as 'invite' | 'recovery') : null,
      erreur: erreur ? erreur.replace(/\+/g, ' ') : null,
    }
  } catch {
    return { type: null, erreur: null }
  }
}

export const lienAuth = lire()
