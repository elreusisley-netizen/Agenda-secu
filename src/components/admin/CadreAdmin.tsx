import { useState, type ReactNode } from 'react'
import {
  LuBell,
  LuBuilding2,
  LuCalendarCheck,
  LuCalendarDays,
  LuChartColumn,
  LuChevronDown,
  LuClipboardList,
  LuHouse,
  LuMenu,
  LuSettings,
  LuUsers,
  LuX,
} from 'react-icons/lu'
import { Logo } from '../Logo'
import { NOTIFICATIONS_ADMIN } from '../../demo/donnees-demo'
import { Lien, naviguer } from '../../lib/routeur'
import { useAuth } from '../../auth/AuthContexte'
import { modeDemo } from '../../lib/supabase'

export type RubriqueAdmin = 'tableau' | 'agents' | 'missions' | 'plannings' | 'disponibilites' | 'sites' | 'rapports' | 'parametres'

export const RUBRIQUES: { id: RubriqueAdmin; libelle: string; vers: string; Icone: typeof LuHouse }[] = [
  { id: 'tableau', libelle: 'Tableau de bord', vers: '/admin', Icone: LuHouse },
  { id: 'agents', libelle: 'Agents', vers: '/admin/agents', Icone: LuUsers },
  { id: 'missions', libelle: 'Missions', vers: '/admin/missions', Icone: LuClipboardList },
  { id: 'plannings', libelle: 'Plannings', vers: '/admin/plannings', Icone: LuCalendarDays },
  { id: 'disponibilites', libelle: 'Disponibilités', vers: '/admin/disponibilites', Icone: LuCalendarCheck },
  { id: 'sites', libelle: 'Sites / Clients', vers: '/admin/sites', Icone: LuBuilding2 },
  { id: 'rapports', libelle: 'Rapports', vers: '/admin/rapports', Icone: LuChartColumn },
  { id: 'parametres', libelle: 'Paramètres', vers: '/admin/parametres', Icone: LuSettings },
]

function Menu({ actif, auClic }: { actif: RubriqueAdmin; auClic?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {RUBRIQUES.map(({ id, libelle, vers, Icone }) => {
        const estActif = id === actif
        return (
          <Lien
            key={id}
            vers={vers}
            onClick={auClic}
            aria-current={estActif ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13.5px] font-medium ${
              estActif ? 'bg-or-500 font-semibold text-nuit-900' : 'text-white/90 hover:bg-white/5'
            }`}
          >
            <Icone className="h-[18px] w-[18px]" />
            {libelle}
          </Lien>
        )
      })}
    </nav>
  )
}

function MenuDeroulant({ ouvert, children }: { ouvert: boolean; children: ReactNode }) {
  if (!ouvert) return null
  return <div className="absolute right-0 top-11 z-40 w-72 rounded-2xl border border-trait bg-white p-2 text-sm shadow-xl">{children}</div>
}

export function CadreAdmin({ actif, children }: { actif: RubriqueAdmin; children: ReactNode }) {
  const [tiroir, setTiroir] = useState(false)
  const [cloche, setCloche] = useState(false)
  const [compte, setCompte] = useState(false)
  const { profil, deconnexion } = useAuth()
  const nomAffiche = profil?.role === 'chef' ? profil.prenom || 'Chef' : profil?.prenom || 'Admin'

  return (
    <div className="flex min-h-dvh bg-white">
      {/* Menu latéral (ordinateur et tablette) */}
      <aside className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col bg-nuit-900 px-4 py-6 lg:flex">
        <div className="mb-8 px-2">
          <Logo taille="petit" />
        </div>
        <Menu actif={actif} />
      </aside>

      {/* Menu en tiroir (petits écrans) */}
      {tiroir && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div className="flex w-[260px] flex-col bg-nuit-900 px-4 py-6">
            <div className="mb-8 flex items-center justify-between px-2">
              <Logo taille="petit" />
              <button onClick={() => setTiroir(false)} aria-label="Fermer le menu" className="text-white">
                <LuX className="h-5 w-5" />
              </button>
            </div>
            <Menu actif={actif} auClic={() => setTiroir(false)} />
          </div>
          <button className="flex-1 bg-black/50" onClick={() => setTiroir(false)} aria-label="Fermer le menu" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-trait bg-white px-4 py-3 lg:justify-end lg:px-8">
          <button onClick={() => setTiroir(true)} aria-label="Ouvrir le menu" className="rounded-lg p-1.5 text-nuit-900 lg:hidden">
            <LuMenu className="h-6 w-6" />
          </button>
          <span className="lg:hidden">
            <Logo taille="petit" clair={false} />
          </span>
          <div className="ml-auto flex items-center gap-5 lg:ml-0">
            <div className="relative">
              <button
                onClick={() => {
                  setCloche((o) => !o)
                  setCompte(false)
                }}
                aria-label="Notifications"
                className="relative p-1 text-nuit-900"
              >
                <LuBell className="h-5 w-5" />
                <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-red-600" />
              </button>
              <MenuDeroulant ouvert={cloche}>
                <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-nuit-600">Notifications (démo)</p>
                {NOTIFICATIONS_ADMIN.map((n) => (
                  <div key={n.id} className="rounded-lg px-2 py-2 hover:bg-fond">
                    <p className="text-nuit-900">{n.texte}</p>
                    <p className="text-xs text-nuit-600">{n.quand}</p>
                  </div>
                ))}
              </MenuDeroulant>
            </div>
            <div className="relative">
              <button
                onClick={() => {
                  setCompte((o) => !o)
                  setCloche(false)
                }}
                className="flex items-center gap-2 text-[13px] font-semibold text-nuit-900"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-nuit-700 text-xs font-bold text-white">{nomAffiche[0]?.toUpperCase()}</span>
                {nomAffiche}
                <LuChevronDown className="h-4 w-4" />
              </button>
              <MenuDeroulant ouvert={compte}>
                {profil && (
                  <p className="px-3 py-2 text-xs text-nuit-600">
                    {profil.email} · {profil.role === 'admin' ? 'Administrateur' : 'Chef d’équipe'}
                    {modeDemo && ' (démo)'}
                  </p>
                )}
                <button
                  onClick={async () => {
                    await deconnexion()
                    naviguer('/connexion', true)
                  }}
                  className="block w-full rounded-lg px-3 py-2 text-left hover:bg-fond"
                >
                  Se déconnecter
                </button>
              </MenuDeroulant>
            </div>
          </div>
        </header>
        <main className="min-w-0 flex-1 px-4 py-5 lg:px-8 lg:py-6">{children}</main>
      </div>
    </div>
  )
}
