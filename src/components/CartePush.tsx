/*
  Carte « Notifications sur ce téléphone » : activer, tester, désactiver.
  Utilisée dans le profil de l'agent et dans le menu du compte (administrateur / chef).
*/
import { useEffect, useState } from 'react'
import { LuBell, LuBellOff } from 'react-icons/lu'
import { useAuth } from '../auth/AuthContexte'
import { useDemo } from '../demo/DemoContexte'
import { activerPush, desactiverPush, etatPush, testerPush, type EtatPush } from '../lib/push'
import { GuideInstallation } from './agent/Installation'

export function CartePush({ seulementSiInactif }: { seulementSiInactif?: boolean }) {
  const { profil } = useAuth()
  const { afficherMessage } = useDemo()
  const [etat, setEtat] = useState<EtatPush | null>(null)
  const [occupe, setOccupe] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [guide, setGuide] = useState(false)

  useEffect(() => {
    etatPush().then(setEtat).catch(() => setEtat('non_supporte'))
  }, [])

  const agir = async (action: () => Promise<string | null | void>, succes: string) => {
    setOccupe(true)
    setErreur(null)
    const err = await action()
    setOccupe(false)
    if (err) setErreur(err)
    else afficherMessage(succes)
    setEtat(await etatPush().catch(() => 'non_supporte' as EtatPush))
  }

  if (!profil || etat === null) return null
  if (seulementSiInactif && etat !== 'inactif') return null
  const actif = etat === 'actif'

  return (
    <div className="rounded-2xl border border-trait p-4">
      <div className="flex items-start gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${actif ? 'bg-confirme-fond text-confirme-texte' : 'bg-fond text-nuit-600'}`}>
          {actif ? <LuBell className="h-5 w-5" /> : <LuBellOff className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-nuit-900">Notifications sur cet appareil</p>
          <p className="text-[13px] text-nuit-600">
            {etat === 'actif' && 'Activées : vous êtes prévenu même quand l’application est fermée.'}
            {etat === 'inactif' && 'Recevez une alerte pour chaque proposition, confirmation ou changement.'}
            {etat === 'installer' && 'Sur iPhone, installez d’abord l’application sur l’écran d’accueil, puis ouvrez-la depuis son icône.'}
            {etat === 'refuse' && 'Bloquées. Pour les autoriser : Réglages du téléphone → Notifications → AGENDA SECU.'}
            {etat === 'non_supporte' && 'Ce navigateur ne permet pas les notifications. Utilisez Safari (iPhone) ou Chrome.'}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {etat === 'inactif' && (
          <button disabled={occupe} onClick={() => agir(() => activerPush(profil.id), 'Notifications activées')} className="rounded-xl bg-or-500 px-4 py-2.5 text-[14px] font-bold text-nuit-900 disabled:opacity-50">
            {occupe ? 'Activation…' : 'Activer les notifications'}
          </button>
        )}
        {etat === 'installer' && (
          <button onClick={() => setGuide(true)} className="rounded-xl bg-or-500 px-4 py-2.5 text-[14px] font-bold text-nuit-900">
            Comment installer l’application
          </button>
        )}
        {actif && (
          <>
            <button disabled={occupe} onClick={() => agir(testerPush, 'Notification d’essai envoyée')} className="rounded-xl bg-fond px-4 py-2.5 text-[14px] font-semibold text-nuit-900 disabled:opacity-50">
              Envoyer un essai
            </button>
            <button disabled={occupe} onClick={() => agir(desactiverPush, 'Notifications désactivées')} className="rounded-xl bg-fond px-4 py-2.5 text-[14px] font-semibold text-nuit-700 disabled:opacity-50">
              Désactiver
            </button>
          </>
        )}
      </div>
      {erreur && <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-[13px] text-red-800">{erreur}</p>}
      {guide && <GuideInstallation fermer={() => setGuide(false)} />}
    </div>
  )
}
