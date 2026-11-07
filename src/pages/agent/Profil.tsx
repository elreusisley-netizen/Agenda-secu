import { useState } from 'react'
import { LuChevronRight, LuLogOut, LuMail, LuPhone, LuSmartphone } from 'react-icons/lu'
import { BarreNavigation, EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { GuideInstallation, estInstallee } from '../../components/agent/Installation'
import { useAuth } from '../../auth/AuthContexte'
import { naviguer } from '../../lib/routeur'

export default function Profil() {
  const { profil, deconnexion } = useAuth()
  const [guide, setGuide] = useState(false)
  if (!profil) return null
  const initiales = `${profil.prenom[0] ?? ''}${profil.nom[0] ?? ''}`.toUpperCase() || '?'

  return (
    <EcranAgent>
      <EnteteAgent titre="Profil" />
      <Feuille className="pb-6">
        <div className="flex items-center gap-4 px-1 py-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-nuit-900 text-lg font-bold text-or-500">{initiales}</div>
          <div>
            <p className="text-lg font-bold text-nuit-900">
              {profil.prenom} {profil.nom}
            </p>
            <p className="text-sm text-nuit-600">Agent de sécurité</p>
          </div>
        </div>
        <div className="mt-2 divide-y divide-trait rounded-2xl border border-trait">
          <p className="flex items-center gap-3 px-4 py-3.5 text-[15px]">
            <LuMail className="h-5 w-5 text-nuit-600" /> {profil.email}
          </p>
          <p className="flex items-center gap-3 px-4 py-3.5 text-[15px]">
            <LuPhone className="h-5 w-5 text-nuit-600" /> {profil.telephone || 'Téléphone non renseigné'}
          </p>
        </div>
        {!estInstallee() && (
          <button onClick={() => setGuide(true)} className="mt-3 flex w-full items-center gap-3 rounded-2xl border border-trait px-4 py-3.5 text-left text-[15px] font-semibold">
            <LuSmartphone className="h-5 w-5 text-nuit-600" />
            <span className="flex-1">Installer l'application</span>
            <LuChevronRight className="h-5 w-5" />
          </button>
        )}
        <p className="mt-4 px-1 text-xs text-nuit-600">
          Réglages des notifications et historique personnel : bientôt disponibles.
        </p>
        <button
          onClick={async () => {
            await deconnexion()
            naviguer('/connexion', true)
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-fond py-3.5 font-semibold text-nuit-900"
        >
          <LuLogOut className="h-5 w-5" /> Se déconnecter
        </button>
      </Feuille>
      <BarreNavigation actif="profil" />
      {guide && <GuideInstallation fermer={() => setGuide(false)} />}
    </EcranAgent>
  )
}
