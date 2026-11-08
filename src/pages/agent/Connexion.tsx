import { useState, type FormEvent } from 'react'
import { LuEye, LuEyeOff, LuLock, LuMail } from 'react-icons/lu'
import { Coche } from '../../components/Logo'
import { espaceDe, useAuth } from '../../auth/AuthContexte'
import { modeDemo } from '../../lib/supabase'
import { Lien, naviguer } from '../../lib/routeur'
import { GuideInstallation, estInstallee } from '../../components/agent/Installation'

/** Illustration de fond (agent de dos, gilet « SÉCURITÉ ») — dessin original, remplaçable par une vraie photo. */
function IllustrationAgent() {
  return (
    <svg viewBox="0 0 400 520" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
      <defs>
        <radialGradient id="halo" cx="50%" cy="38%" r="60%">
          <stop offset="0%" stopColor="#3a4a66" />
          <stop offset="60%" stopColor="#141c2c" />
          <stop offset="100%" stopColor="#070b15" />
        </radialGradient>
        <linearGradient id="veste" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b3446" />
          <stop offset="100%" stopColor="#10151f" />
        </linearGradient>
        <linearGradient id="tete" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4a5468" />
          <stop offset="100%" stopColor="#1a2130" />
        </linearGradient>
        <linearGradient id="fondu" x1="0" y1="0" x2="0" y2="1">
          <stop offset="55%" stopColor="#0c1220" stopOpacity="0" />
          <stop offset="100%" stopColor="#0c1220" stopOpacity="1" />
        </linearGradient>
      </defs>
      <rect width="400" height="520" fill="url(#halo)" />
      <rect x="178" y="190" width="44" height="52" rx="16" fill="#1a2130" />
      <ellipse cx="155" cy="158" rx="8" ry="15" fill="#2a3346" />
      <ellipse cx="245" cy="158" rx="8" ry="15" fill="#2a3346" />
      <ellipse cx="200" cy="146" rx="45" ry="56" fill="url(#tete)" />
      <path d="M156 128 C160 92 240 92 244 128 C232 108 168 108 156 128 Z" fill="#141a26" />
      <path d="M40 520 C40 330 90 262 200 250 C310 262 360 330 360 520 Z" fill="url(#veste)" />
      <path d="M150 262 C170 280 230 280 250 262" stroke="#3b465c" strokeWidth="4" fill="none" />
      <text x="200" y="352" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontWeight="800" fontSize="44" fill="#8d97aa" letterSpacing="1">
        SÉCURITÉ
      </text>
      <rect width="400" height="520" fill="url(#fondu)" />
    </svg>
  )
}

export default function Connexion() {
  const [guide, setGuide] = useState(false)
  const [email, setEmail] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [visible, setVisible] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const { connexion, erreurLien } = useAuth()

  const seConnecter = async (e: FormEvent) => {
    e.preventDefault()
    if (!modeDemo && (!email.trim() || !motDePasse)) {
      setErreur('Saisissez votre e-mail et votre mot de passe.')
      return
    }
    setEnCours(true)
    setErreur(null)
    const probleme = await connexion(email, motDePasse)
    setEnCours(false)
    if (probleme) setErreur(probleme)
    else if (modeDemo) naviguer(espaceDe(email.toLowerCase().includes('admin') ? 'admin' : 'agent'), true)
    // En mode réel, l'application redirige d'elle-même vers l'espace du compte.
  }

  const message = erreur ?? erreurLien

  return (
    <div className="min-h-dvh bg-nuit-900 md:bg-nuit-950 md:py-8">
      <div className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col overflow-hidden bg-nuit-900 md:min-h-[calc(100dvh-4rem)] md:rounded-[2.25rem] md:shadow-2xl md:ring-1 md:ring-white/10">
        <div className="relative h-[60dvh] min-h-[420px] max-h-[560px]">
          <IllustrationAgent />
          <div className="relative flex justify-center pt-[calc(env(safe-area-inset-top)+4.5rem)]">
            <span className="inline-flex items-center gap-2.5">
              <Coche className="h-10 w-12" />
              <span className="text-[30px] font-bold tracking-tight text-white">AGENDA SECU</span>
            </span>
          </div>
          <h1 className="absolute inset-x-0 bottom-4 text-center text-[28px] font-bold text-white">Connexion</h1>
        </div>

        <form onSubmit={seConnecter} className="relative flex flex-1 flex-col gap-3 px-6 pb-8 pt-2">
          <label className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-nuit-900">
            <LuMail className="h-5 w-5 shrink-0 text-nuit-600" />
            <span className="sr-only">Email</span>
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-nuit-600"
            />
          </label>
          <label className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 text-nuit-900">
            <LuLock className="h-5 w-5 shrink-0 text-nuit-600" />
            <span className="sr-only">Mot de passe</span>
            <input
              type={visible ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Mot de passe"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full bg-transparent text-[15px] outline-none placeholder:text-nuit-600"
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              className="text-nuit-900"
            >
              {visible ? <LuEyeOff className="h-5 w-5" /> : <LuEye className="h-5 w-5" />}
            </button>
          </label>
          {message && (
            <p role="alert" className="rounded-xl bg-red-500/15 px-4 py-3 text-sm text-red-200">
              {message}
            </p>
          )}
          <button
            type="submit"
            disabled={enCours}
            className="mt-2 rounded-xl bg-or-500 py-3.5 text-[15px] font-bold text-nuit-900 active:bg-or-600 disabled:opacity-70"
          >
            {enCours ? 'Connexion…' : 'Se connecter'}
          </button>
          <Lien vers="/mot-de-passe-oublie" className="mt-3 text-center text-[15px] text-white">
            Mot de passe oublié ?
          </Lien>
          {!estInstallee() && (
            <button type="button" onClick={() => setGuide(true)} className="mt-4 text-center text-[14px] text-white/70 underline underline-offset-4">
              Installer l'application sur mon téléphone
            </button>
          )}
          {modeDemo && (
            <p className="mt-auto pt-6 text-center text-xs leading-relaxed text-white/50">
              Démo : laissez les champs vides pour l'espace agent,
              <br />
              ou saisissez « admin » dans l'e-mail pour l'espace administrateur.
            </p>
          )}
        </form>
      </div>
      {guide && <GuideInstallation fermer={() => setGuide(false)} />}
    </div>
  )
}
