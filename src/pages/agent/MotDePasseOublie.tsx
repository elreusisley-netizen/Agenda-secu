import { useState, type FormEvent } from 'react'
import { LuMail } from 'react-icons/lu'
import { EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { useAuth } from '../../auth/AuthContexte'
import { modeDemo } from '../../lib/supabase'
import { Lien } from '../../lib/routeur'

export default function MotDePasseOublie() {
  const { envoyerLienReinitialisation } = useAuth()
  const [email, setEmail] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const envoyer = async (e: FormEvent) => {
    e.preventDefault()
    setEnCours(true)
    const probleme = await envoyerLienReinitialisation(email)
    setEnCours(false)
    if (probleme) setErreur(probleme)
    else setEnvoye(true)
  }

  return (
    <EcranAgent>
      <EnteteAgent titre="Mot de passe oublié" retourVers="/connexion" />
      <Feuille className="px-6 pt-6">
        {envoye ? (
          <div className="space-y-4">
            <p className="text-[15px] leading-relaxed text-nuit-700">
              Si un compte existe pour cette adresse, un e-mail vient d'être envoyé. Ouvrez le lien qu'il contient depuis ce téléphone pour choisir un nouveau mot de passe.
            </p>
            <p className="text-sm text-nuit-600">Pensez à vérifier les courriers indésirables.</p>
            {modeDemo && <p className="rounded-xl bg-fond p-3 text-xs text-nuit-600">Démo : aucun e-mail n'est réellement envoyé.</p>}
            <Lien vers="/connexion" className="block rounded-xl bg-or-500 py-3.5 text-center font-bold text-nuit-900">
              Retour à la connexion
            </Lien>
          </div>
        ) : (
          <form onSubmit={envoyer} className="space-y-4">
            <p className="text-[15px] leading-relaxed text-nuit-700">
              Saisissez l'adresse e-mail de votre compte. Vous recevrez un lien pour choisir un nouveau mot de passe.
            </p>
            <label className="flex items-center gap-3 rounded-xl border border-trait px-4 py-3.5">
              <LuMail className="h-5 w-5 text-nuit-600" />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent outline-none placeholder:text-nuit-600"
              />
            </label>
            {erreur && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                {erreur}
              </p>
            )}
            <button type="submit" disabled={enCours} className="w-full rounded-xl bg-or-500 py-3.5 font-bold text-nuit-900 disabled:opacity-70">
              {enCours ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
        )}
      </Feuille>
    </EcranAgent>
  )
}
