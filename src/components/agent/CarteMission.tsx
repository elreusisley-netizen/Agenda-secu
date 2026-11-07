import type { ReactNode } from 'react'
import { LuCalendar, LuChevronRight, LuMapPin } from 'react-icons/lu'
import { site, type MissionAgent } from '../../demo/donnees-demo'
import { dateCourte } from '../../lib/dates'
import { Lien } from '../../lib/routeur'

/** Bloc date + horaires + site, cliquable vers le détail de la mission. */
export function ResumeMission({ mission, enfants }: { mission: MissionAgent; enfants?: ReactNode }) {
  return (
    <div>
      <Lien vers={`/agent/missions/${mission.id}`} className="flex items-start gap-3 py-1">
        <LuCalendar className="mt-0.5 h-5 w-5 shrink-0 text-nuit-900" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-nuit-900">{dateCourte(mission.date)}</p>
          <p className="text-[15px] text-nuit-900">
            {mission.debut} – {mission.fin}
          </p>
        </div>
        <LuChevronRight className="mt-2 h-5 w-5 shrink-0 text-nuit-900" />
      </Lien>
      <p className="mt-2.5 flex items-center gap-3 text-[13px] text-nuit-900">
        <LuMapPin className="h-5 w-5 shrink-0" />
        Site : {site(mission.siteId).nom}
      </p>
      {enfants}
    </div>
  )
}
