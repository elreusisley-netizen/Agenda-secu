import type { ReactNode } from 'react'
import { LuArrowLeft, LuBriefcaseBusiness, LuCalendarCheck, LuHouse, LuUser } from 'react-icons/lu'
import { Lien, retour } from '../../lib/routeur'

/*
  Cadre commun des écrans agent : colonne de la largeur d'un téléphone.
  Sur ordinateur, la colonne est centrée sur fond bleu nuit.
*/
export function EcranAgent({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-nuit-900 md:bg-nuit-950 md:py-8">
      <div className="relative mx-auto flex min-h-dvh max-w-[430px] flex-col bg-nuit-900 md:min-h-[calc(100dvh-4rem)] md:overflow-hidden md:rounded-[2.25rem] md:shadow-2xl md:ring-1 md:ring-white/10">
        {children}
      </div>
    </div>
  )
}

/** En-tête bleu nuit avec flèche retour et titre (écrans Disponibilités, Missions, Planning). */
export function EnteteAgent({ titre, retourVers }: { titre: string; retourVers?: string }) {
  return (
    <header className="pt-securite flex items-center gap-4 px-5 pb-6 text-white">
      {retourVers && (
        <button onClick={() => retour(retourVers)} aria-label="Retour" className="-ml-1 rounded-full p-1">
          <LuArrowLeft className="h-6 w-6" />
        </button>
      )}
      <h1 className="text-[22px] font-bold tracking-tight">{titre}</h1>
    </header>
  )
}

/** Feuille blanche aux coins arrondis qui recouvre l'en-tête. */
export function Feuille({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <main className={`flex-1 rounded-t-[1.75rem] bg-white px-4 pt-4 ${className}`}>{children}</main>
}

type Onglet = 'accueil' | 'planning' | 'missions' | 'profil'

const ONGLETS: { id: Onglet; libelle: string; vers: string; Icone: typeof LuHouse }[] = [
  { id: 'accueil', libelle: 'Accueil', vers: '/agent', Icone: LuHouse },
  { id: 'planning', libelle: 'Planning', vers: '/agent/planning', Icone: LuCalendarCheck },
  { id: 'missions', libelle: 'Missions', vers: '/agent/missions', Icone: LuBriefcaseBusiness },
  { id: 'profil', libelle: 'Profil', vers: '/agent/profil', Icone: LuUser },
]

/** Barre de navigation du bas (Accueil, Planning, Missions, Profil). */
export function BarreNavigation({ actif }: { actif?: Onglet }) {
  return (
    <nav className="pb-securite sticky bottom-0 z-30 grid grid-cols-4 border-t border-trait bg-white pt-2">
      {ONGLETS.map(({ id, libelle, vers, Icone }) => {
        const estActif = id === actif
        return (
          <Lien
            key={id}
            vers={vers}
            className={`flex flex-col items-center gap-1 py-1 text-[11px] font-medium ${estActif ? 'text-or-500' : 'text-nuit-600'}`}
            aria-current={estActif ? 'page' : undefined}
          >
            <Icone className="h-[22px] w-[22px]" strokeWidth={estActif ? 2.2 : 1.8} />
            {libelle}
          </Lien>
        )
      })}
    </nav>
  )
}
