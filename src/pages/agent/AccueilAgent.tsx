import { useState } from 'react'
import type { IconType } from 'react-icons'
import { LuBell, LuBriefcaseBusiness, LuCalendarCheck, LuCalendarCheck2, LuLogOut, LuMenu, LuSmartphone, LuUser, LuX } from 'react-icons/lu'
import { BarreNavigation, EcranAgent } from '../../components/agent/EcranAgent'
import { ResumeMission } from '../../components/agent/CarteMission'
import { Logo } from '../../components/Logo'
import { estPassee, propositionsOuvertes, useMesMissions, useNonLues } from '../../lib/espaceAgent'
import { useAuth } from '../../auth/AuthContexte'
import { CartePush } from '../../components/CartePush'
import { GuideInstallation, estInstallee } from '../../components/agent/Installation'
import { Lien, naviguer } from '../../lib/routeur'

function Tuile({ vers, libelle, Icone, pastille, large }: { vers: string; libelle: string; Icone: IconType; pastille?: number; large?: boolean }) {
  return (
    <Lien
      vers={vers}
      className={`relative flex min-h-[96px] flex-col justify-between rounded-2xl bg-white p-4 text-nuit-900 shadow-sm active:scale-[0.98] ${large ? 'col-span-2' : ''}`}
    >
      <Icone className="h-7 w-7" strokeWidth={1.6} />
      <span className="mt-3 text-[15px] font-semibold leading-tight">{libelle}</span>
      {pastille ? (
        <span className="absolute right-3 top-3 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
          {pastille}
        </span>
      ) : null}
    </Lien>
  )
}

function Tiroir({ fermer }: { fermer: () => void }) {
  const { deconnexion } = useAuth()
  const seDeconnecter = async () => {
    fermer()
    await deconnexion()
    naviguer('/connexion', true)
  }
  const liens = [
    { vers: '/agent', libelle: 'Accueil' },
    { vers: '/agent/planning', libelle: 'Mon planning' },
    { vers: '/agent/missions', libelle: 'Missions proposées' },
    { vers: '/agent/disponibilites', libelle: 'Mes disponibilités' },
    { vers: '/agent/notifications', libelle: 'Notifications' },
    { vers: '/agent/profil', libelle: 'Profil' },
  ]
  return (
    <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true">
      <div className="pt-securite flex w-[80%] max-w-[320px] flex-col bg-nuit-900 px-5 pb-6 text-white">
        <div className="mb-8 flex items-center justify-between">
          <Logo taille="petit" />
          <button onClick={fermer} aria-label="Fermer le menu" className="p-1">
            <LuX className="h-6 w-6" />
          </button>
        </div>
        <nav className="flex flex-col gap-1">
          {liens.map((l) => (
            <Lien key={l.vers} vers={l.vers} onClick={fermer} className="rounded-xl px-3 py-3 text-[15px] font-medium hover:bg-white/5">
              {l.libelle}
            </Lien>
          ))}
        </nav>
        <button onClick={seDeconnecter} className="mt-auto flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] text-white/70">
          <LuLogOut className="h-5 w-5" /> Se déconnecter
        </button>
      </div>
      <button className="flex-1 bg-black/50" onClick={fermer} aria-label="Fermer le menu" />
    </div>
  )
}

export default function AccueilAgent() {
  const [menu, setMenu] = useState(false)
  const [guide, setGuide] = useState(false)
  const { profil } = useAuth()
  const { missions: liste } = useMesMissions(profil?.id)
  const missions = liste ?? []
  const nonLues = useNonLues()
  const mobile = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  const propositions = propositionsOuvertes(missions).length
  const prochaine = missions.find((m) => m.statut === 'confirmee' && !m.mission_annulee && !estPassee(m))

  return (
    <EcranAgent>
      {menu && <Tiroir fermer={() => setMenu(false)} />}
      <header className="pt-securite px-5 pb-5 text-white">
        <div className="flex items-center justify-between">
          <button onClick={() => setMenu(true)} aria-label="Ouvrir le menu" className="-ml-1 p-1">
            <LuMenu className="h-6 w-6" />
          </button>
          <Lien vers="/agent/notifications" aria-label="Notifications" className="relative p-1">
            <LuBell className="h-6 w-6" />
            {nonLues > 0 && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-600 ring-2 ring-nuit-900" />}
          </Lien>
        </div>
        <h1 className="mt-5 text-[26px] font-bold tracking-tight">Bonjour, {profil?.prenom || 'Agent'} 👋</h1>
        <p className="mt-2 text-[15px] text-white/85">Voici votre activité</p>
      </header>

      <section className="grid grid-cols-2 gap-3 px-4 pb-5">
        <Tuile vers="/agent/planning" libelle="Mon planning" Icone={LuCalendarCheck} />
        <Tuile vers="/agent/missions" libelle="Missions proposées" Icone={LuBriefcaseBusiness} pastille={propositions} />
        <Tuile vers="/agent/disponibilites" libelle="Mes disponibilités" Icone={LuCalendarCheck2} large />
      </section>

      <main className="flex-1 rounded-t-[1.75rem] bg-fond px-4 pt-5">
        {mobile && !estInstallee() && (
          <button onClick={() => setGuide(true)} className="mb-4 flex w-full items-center gap-3 rounded-2xl bg-nuit-900 px-4 py-3 text-left text-white">
            <LuSmartphone className="h-6 w-6 shrink-0 text-or-500" />
            <span className="flex-1 text-sm">
              <b className="block">Installer l'application</b>
              <span className="text-white/75">Pour l'ouvrir comme une appli et recevoir les notifications.</span>
            </span>
          </button>
        )}
        <div className="mb-4 empty:hidden [&>div]:bg-white">
          <CartePush seulementSiInactif />
        </div>
        <h2 className="mb-3 px-1 text-[17px] font-bold text-nuit-900">Prochaine mission</h2>
        {prochaine ? (
          <div className="rounded-2xl border border-trait bg-white p-4">
            <ResumeMission mission={prochaine} />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-trait bg-white p-5 text-center text-sm text-nuit-600">
            <LuUser className="mx-auto mb-2 h-6 w-6" />
            Aucune mission confirmée à venir.
          </div>
        )}
        <div className="h-6" />
      </main>
      <BarreNavigation actif="accueil" />
      {guide && <GuideInstallation fermer={() => setGuide(false)} />}
    </EcranAgent>
  )
}
