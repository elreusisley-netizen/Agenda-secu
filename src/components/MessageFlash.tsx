import { LuCheck } from 'react-icons/lu'
import { useDemo } from '../demo/DemoContexte'

/** Petit message de confirmation affiché quelques secondes en bas de l'écran. */
export function MessageFlash() {
  const { message } = useDemo()
  if (!message) return null
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4" role="status">
      <div className="flex items-center gap-2 rounded-full bg-nuit-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg">
        <LuCheck className="h-4 w-4 text-or-500" />
        {message}
      </div>
    </div>
  )
}
