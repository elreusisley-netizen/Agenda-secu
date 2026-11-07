import { useEffect, type ReactNode } from 'react'
import { espaceDe, useAuth } from './auth/AuthContexte'
import { BadgeDemo } from './components/BadgeDemo'
import { Coche } from './components/Logo'
import { MessageFlash } from './components/MessageFlash'
import type { RubriqueAdmin } from './components/admin/CadreAdmin'
import { correspond, naviguer, useChemin } from './lib/routeur'
import type { Role } from './lib/supabase'
import AccueilAgent from './pages/agent/AccueilAgent'
import Connexion from './pages/agent/Connexion'
import Disponibilites from './pages/agent/Disponibilites'
import MissionDetail from './pages/agent/MissionDetail'
import Missions from './pages/agent/Missions'
import MonPlanning from './pages/agent/MonPlanning'
import MotDePasseOublie from './pages/agent/MotDePasseOublie'
import NouveauMotDePasse from './pages/agent/NouveauMotDePasse'
import Notifications from './pages/agent/Notifications'
import Profil from './pages/agent/Profil'
import EcranAVenir from './pages/admin/EcranAVenir'
import PlanningMissions from './pages/admin/PlanningMissions'
import TableauDeBord from './pages/admin/TableauDeBord'

/*
  Liste des écrans, de leur adresse et de qui peut les ouvrir.
  acces : 'public' (sans connexion), ou liste des rôles autorisés.
*/
type Acces = 'public' | Role[]
const AGENT: Role[] = ['agent']
const GESTION: Role[] = ['admin', 'chef']

const ROUTES: { motif: string; acces: Acces; ecran: (p: Record<string, string>) => ReactNode }[] = [
  { motif: '/connexion', acces: 'public', ecran: () => <Connexion /> },
  { motif: '/mot-de-passe-oublie', acces: 'public', ecran: () => <MotDePasseOublie /> },
  { motif: '/nouveau-mot-de-passe', acces: 'public', ecran: () => <NouveauMotDePasse /> },
  { motif: '/agent', acces: AGENT, ecran: () => <AccueilAgent /> },
  { motif: '/agent/disponibilites', acces: AGENT, ecran: () => <Disponibilites /> },
  { motif: '/agent/missions', acces: AGENT, ecran: () => <Missions /> },
  { motif: '/agent/missions/:id', acces: AGENT, ecran: (p) => <MissionDetail id={p.id} /> },
  { motif: '/agent/planning', acces: AGENT, ecran: () => <MonPlanning /> },
  { motif: '/agent/profil', acces: AGENT, ecran: () => <Profil /> },
  { motif: '/agent/notifications', acces: AGENT, ecran: () => <Notifications /> },
  { motif: '/admin', acces: GESTION, ecran: () => <TableauDeBord /> },
  { motif: '/admin/plannings', acces: GESTION, ecran: () => <PlanningMissions /> },
  ...(['agents', 'missions', 'disponibilites', 'sites', 'rapports', 'parametres'] as RubriqueAdmin[]).map((r) => ({
    motif: `/admin/${r}`,
    acces: (r === 'parametres' ? ['admin'] : GESTION) as Acces,
    ecran: () => <EcranAVenir rubrique={r} />,
  })),
]

function Chargement() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-nuit-900">
      <Coche className="h-12 w-14 animate-pulse" />
    </div>
  )
}

export default function App() {
  const chemin = useChemin()
  const { pret, profil, doitChoisirMotDePasse } = useAuth()

  let route = ROUTES.find((r) => correspond(r.motif, chemin))
  const params = route ? correspond(route.motif, chemin)! : {}
  if (!route) route = ROUTES[0]

  // Où faut-il rediriger ? (null = l'écran demandé peut s'afficher)
  let redirection: string | null = null
  if (pret) {
    if (doitChoisirMotDePasse && profil) {
      if (chemin !== '/nouveau-mot-de-passe') redirection = '/nouveau-mot-de-passe'
    } else if (route.acces === 'public') {
      if (profil && chemin !== '/nouveau-mot-de-passe') redirection = espaceDe(profil.role)
    } else if (!profil) {
      redirection = '/connexion'
    } else if (!route.acces.includes(profil.role)) {
      redirection = espaceDe(profil.role)
    }
  }

  useEffect(() => {
    if (redirection) naviguer(redirection, true)
  }, [redirection])

  if (!pret || redirection) return <Chargement />

  return (
    <>
      {route.ecran(params)}
      <MessageFlash />
      {profil && <BadgeDemo />}
    </>
  )
}
