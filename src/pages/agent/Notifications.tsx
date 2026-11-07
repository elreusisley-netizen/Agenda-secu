import { LuBell } from 'react-icons/lu'
import { BarreNavigation, EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { NOTIFICATIONS_AGENT } from '../../demo/donnees-demo'

// Écran complémentaire (non dessiné sur les maquettes) : ouvert par la cloche de l'accueil.
export default function Notifications() {
  return (
    <EcranAgent>
      <EnteteAgent titre="Notifications" retourVers="/agent" />
      <Feuille className="pb-6">
        <ul className="divide-y divide-trait">
          {NOTIFICATIONS_AGENT.map((n) => (
            <li key={n.id} className="flex gap-3 px-1 py-4">
              <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${n.lue ? 'bg-fond text-nuit-600' : 'bg-or-500 text-nuit-900'}`}>
                <LuBell className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[15px] text-nuit-900 ${n.lue ? 'font-medium' : 'font-bold'}`}>{n.titre}</p>
                <p className="text-sm text-nuit-700">{n.texte}</p>
                <p className="mt-1 text-xs text-nuit-600">{n.quand}</p>
              </div>
            </li>
          ))}
        </ul>
      </Feuille>
      <BarreNavigation />
    </EcranAgent>
  )
}
