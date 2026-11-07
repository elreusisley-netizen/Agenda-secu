/*
  Gestion de la connexion : session, profil de la personne connectée,
  connexion, déconnexion, mot de passe oublié, choix d'un nouveau mot de passe.
  En mode démo (sans Supabase), la connexion est simulée.
*/
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { lienAuth } from '../lib/lienAuth'
import { AUCUN_DROIT, TOUS_LES_DROITS, type Droits } from '../lib/droits'
import { messageErreur, modeDemo, supabase, type Profil } from '../lib/supabase'

interface Auth {
  pret: boolean
  profil: Profil | null
  /** Droits de la personne connectée (tous pour l'admin, cochés pour un chef, aucun pour un agent). */
  droits: Droits | null
  /** Vrai si la personne arrive par un lien d'invitation ou de réinitialisation. */
  doitChoisirMotDePasse: boolean
  erreurLien: string | null
  connexion: (email: string, motDePasse: string) => Promise<string | null>
  deconnexion: () => Promise<void>
  envoyerLienReinitialisation: (email: string) => Promise<string | null>
  changerMotDePasse: (motDePasse: string) => Promise<string | null>
}

const Ctx = createContext<Auth | null>(null)

const PROFIL_DEMO = (admin: boolean): Profil => ({
  id: 'demo',
  role: admin ? 'admin' : 'agent',
  prenom: admin ? 'Admin' : 'Agent',
  nom: 'Démo',
  email: admin ? 'admin@demo.fr' : 'agent@demo.fr',
  telephone: '06 00 00 00 00',
  actif: true,
})

async function chargerDroits(p: Profil): Promise<Droits> {
  if (p.role === 'admin') return TOUS_LES_DROITS
  if (p.role !== 'chef') return AUCUN_DROIT
  const { data } = await supabase!.from('permissions_chefs').select('*').eq('chef_id', p.id).maybeSingle()
  if (!data) return AUCUN_DROIT
  const d = { ...AUCUN_DROIT }
  for (const k of Object.keys(d) as (keyof Droits)[]) d[k] = Boolean((data as Record<string, unknown>)[k])
  return d
}

async function chargerProfil(id: string): Promise<Profil | null> {
  const { data, error } = await supabase!
    .from('profils')
    .select('id, role, prenom, nom, email, telephone, actif')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as Profil
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [pret, setPret] = useState(modeDemo)
  const [profil, setProfil] = useState<Profil | null>(null)
  const [droits, setDroits] = useState<Droits | null>(null)
  const [doitChoisirMotDePasse, setDoitChoisir] = useState(Boolean(lienAuth.type))
  const [erreurLien, setErreurLien] = useState<string | null>(lienAuth.erreur ? messageErreur({ message: lienAuth.erreur }) : null)

  // Applique la session : charge le profil, refuse les comptes désactivés.
  const appliquerSession = useCallback(async (userId: string | null) => {
    if (!userId) {
      setProfil(null)
      setDroits(null)
      setPret(true)
      return
    }
    const p = await chargerProfil(userId)
    if (!p || !p.actif) {
      await supabase!.auth.signOut()
      setProfil(null)
      setDroits(null)
      setErreurLien(p ? 'Ce compte est désactivé. Contactez votre responsable.' : 'Compte introuvable. Contactez votre responsable.')
    } else {
      setDroits(await chargerDroits(p))
      setProfil(p)
    }
    setPret(true)
  }, [])

  useEffect(() => {
    if (modeDemo) return
    let actif = true
    supabase!.auth.getSession().then(({ data }) => {
      if (actif) appliquerSession(data.session?.user.id ?? null)
    })
    const { data } = supabase!.auth.onAuthStateChange((evenement, session) => {
      if (evenement === 'PASSWORD_RECOVERY') setDoitChoisir(true)
      // Recommandation Supabase : ne pas attendre d'appel réseau dans ce rappel.
      if (evenement === 'SIGNED_IN' || evenement === 'SIGNED_OUT' || evenement === 'USER_UPDATED') {
        setTimeout(() => appliquerSession(session?.user.id ?? null), 0)
      }
    })
    return () => {
      actif = false
      data.subscription.unsubscribe()
    }
  }, [appliquerSession])

  const valeur = useMemo<Auth>(
    () => ({
      pret,
      profil,
      droits,
      doitChoisirMotDePasse,
      erreurLien,
      connexion: async (email, motDePasse) => {
        setErreurLien(null)
        if (modeDemo) {
          const p = PROFIL_DEMO(email.toLowerCase().includes('admin'))
          setDroits(p.role === 'admin' ? TOUS_LES_DROITS : AUCUN_DROIT)
          setProfil(p)
          return null
        }
        const { data, error } = await supabase!.auth.signInWithPassword({ email: email.trim(), password: motDePasse })
        if (error) return messageErreur(error)
        await appliquerSession(data.user.id)
        return null
      },
      deconnexion: async () => {
        if (!modeDemo) await supabase!.auth.signOut()
        setProfil(null)
        setDroits(null)
        setDoitChoisir(false)
      },
      envoyerLienReinitialisation: async (email) => {
        if (modeDemo) return null
        const { error } = await supabase!.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin + '/',
        })
        // Par sécurité, on ne dit pas si l'adresse existe ; seules les erreurs techniques sont signalées.
        if (error && /rate limit|too many|fetch|network/i.test(error.message)) return messageErreur(error)
        return null
      },
      changerMotDePasse: async (motDePasse) => {
        if (modeDemo) return null
        const { error } = await supabase!.auth.updateUser({ password: motDePasse })
        if (error) return messageErreur(error)
        setDoitChoisir(false)
        return null
      },
    }),
    [pret, profil, droits, doitChoisirMotDePasse, erreurLien, appliquerSession],
  )

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>
}

export function useAuth(): Auth {
  const c = useContext(Ctx)
  if (!c) throw new Error('useAuth doit être utilisé dans AuthProvider')
  return c
}

/** Écran d'accueil de chaque rôle. */
export function espaceDe(role: Profil['role']): string {
  return role === 'agent' ? '/agent' : '/admin'
}
