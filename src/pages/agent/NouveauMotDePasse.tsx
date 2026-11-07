import { useState, type FormEvent } from 'react'
import { LuEye, LuEyeOff, LuLock } from 'react-icons/lu'
import { EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { espaceDe, useAuth } from '../../auth/AuthContexte'
import { lienAuth } from '../../lib/lienAuth'
import { Lien, naviguer } from '../../lib/routeur'

/** Contrôle simple de la solidité du mot de passe. */
function probleme(mdp: string, confirmation: string): string | null {
  if (mdp.length < 8) return 'Au moins 8 caractères.'
  if (!/[a-zA-Z]/.test(mdp) || !/\d/.test(mdp)) return 'Au moins une lettre et un chiffre.'
  if (mdp !== confirmation) return 'Les deux mots de passe ne sont pas identiques.'
  return null
}

/** Ouvert depuis le lien d'invitation (première connexion) ou de mot de passe oublié. */
export default function NouveauMotDePasse() {
  const { profil, pret, changerMotDePasse, erreurLien } = useAuth()
  const [mdp, setMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [visible, setVisible] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const invitation = lienAuth.type === 'invite'

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    const p = probleme(mdp, confirmation)
    if (p) return setErreur(p)
    setEnCours(true)
    const err = await changerMotDePasse(mdp)
    setEnCours(false)
    if (err) return setErreur(err)
    naviguer(profil ? espaceDe(profil.role) : '/connexion', true)
  }

  const champ = 'flex items-center gap-3 rounded-xl border border-trait px-4 py-3.5'

  return (
    <EcranAgent>
      <EnteteAgent titre={invitation ? 'Bienvenue' : 'Nouveau mot de passe'} />
      <Feuille className="px-6 pt-6">
        {!pret ? (
          <p className="py-10 text-center text-sm text-nuit-600">Vérification du lien…</p>
        ) : !profil ? (
          <div className="space-y-4">
            <p className="text-[15px] leading-relaxed text-nuit-700">
              {erreurLien ?? 'Ce lien a expiré ou a déjà été utilisé.'}
            </p>
            <Lien vers="/mot-de-passe-oublie" className="block rounded-xl bg-or-500 py-3.5 text-center font-bold text-nuit-900">
              Recevoir un nouveau lien
            </Lien>
            <Lien vers="/connexion" className="block py-2 text-center text-sm font-semibold text-nuit-700">
              Retour à la connexion
            </Lien>
          </div>
        ) : (
          <form onSubmit={valider} className="space-y-4">
            <p className="text-[15px] leading-relaxed text-nuit-700">
              {invitation ? `Bonjour ${profil.prenom || ''}, choisissez votre mot de passe pour activer votre compte.` : 'Choisissez votre nouveau mot de passe.'}
            </p>
            <p className="text-xs text-nuit-600">8 caractères minimum, avec au moins une lettre et un chiffre.</p>
            <label className={champ}>
              <LuLock className="h-5 w-5 text-nuit-600" />
              <input
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Nouveau mot de passe"
                value={mdp}
                onChange={(e) => setMdp(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-nuit-600"
              />
              <button type="button" onClick={() => setVisible((v) => !v)} aria-label={visible ? 'Masquer' : 'Afficher'}>
                {visible ? <LuEyeOff className="h-5 w-5" /> : <LuEye className="h-5 w-5" />}
              </button>
            </label>
            <label className={champ}>
              <LuLock className="h-5 w-5 text-nuit-600" />
              <input
                type={visible ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Confirmer le mot de passe"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-nuit-600"
              />
            </label>
            {erreur && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                {erreur}
              </p>
            )}
            <button type="submit" disabled={enCours} className="w-full rounded-xl bg-or-500 py-3.5 font-bold text-nuit-900 disabled:opacity-70">
              {enCours ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        )}
      </Feuille>
    </EcranAgent>
  )
}
