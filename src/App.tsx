import { useEffect, type ReactNode } from 'react'
import { espaceDe, useAuth } from './auth/AuthContexte'
import { BadgeDemo } from './components/BadgeDemo'
import { Coche } from './components/Logo'
import { MessageFlash } from './components/MessageFlash'
import { RUBRIQUES, type RubriqueAdmin } from './components/admin/CadreAdmin'
import { autorise } from './lib/droits'
import { correspond, naviguer, useChemin } from './lib/routeur'
import { modeDemo, type Role } from './lib/supabase'
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
import Agents from './pages/admin/Agents'
import FicheAgent from './pages/admin/FicheAgent'
import Parametres from './pages/admin/Parametres'
import SitesClients from './pages/admin/SitesClients'
import PlanningMissions from './pages/admin/PlanningMissions'
import MissionsAdmin from './pages/admin/Missions'
import DisponibilitesEquipe from './pages/admin/DisponibilitesEquipe'
import Rapports from './pages/admin/Rapports'
import TableauDeBord from './pages/admin/TableauDeBord'

/*
  Liste des écrans, de leur adresse et de qui peut les ouvrir.
  acces : 'public' (sans connexion), ou liste des rôles autorisés.
*/
type Acces = 'public' | Role[]
const AGENT: Role[] = ['agent']
const GESTION: Role[] = ['admin', 'chef']

const ROUTES: { motif: string; acces: Acces; rubrique?: RubriqueAdmin; ecran: (p: Record<string, string>) => ReactNode }[] = [
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
  { motif: '/admin', acces: GESTION, rubrique: 'tableau', ecran: () => <TableauDeBord /> },
  { motif: '/admin/missions', acces: GESTION, rubrique: 'missions', ecran: () => <MissionsAdmin /> },
  { motif: '/admin/disponibilites', acces: GESTION, rubrique: 'disponibilites', ecran: () => <DisponibilitesEquipe /> },
  { motif: '/admin/plannings', acces: GESTION, rubrique: 'plannings', ecran: () => <PlanningMissions /> },
  { motif: '/admin/parametres', acces: ['admin'], rubrique: 'parametres', ecran: () => <Parametres /> },
  { motif: '/admin/agents', acces: GESTION, rubrique: 'agents', ecran: () => <Agents /> },
  { motif: '/admin/agents/:id', acces: GESTION, rubrique: 'agents', ecran: (p) => <FicheAgent id={p.id} /> },
  { motif: '/admin/sites', acces: GESTION, rubrique: 'sites', ecran: () => <SitesClients /> },
  { motif: '/admin/rapports', acces: GESTION, rubrique: 'rapports', ecran: () => <Rapports /> },
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
  const { pret, profil, droits, doitChoisirMotDePasse } = useAuth()

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
    } else if (route.rubrique) {
      // Un chef n'ouvre que les rubriques pour lesquelles il a le droit.
      const rubrique = route.rubrique
      const exigence = RUBRIQUES.find((r) => r.id === rubrique)?.exigence ?? null
      if (!autorise(exigence, profil, droits)) redirection = '/admin'
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
      {profil && modeDemo && <BadgeDemo />}
    </>
  )
}
