import { LuCalendar, LuClipboardList, LuClock, LuDoorOpen, LuMapPin, LuPhone } from 'react-icons/lu'
import type { ReactNode } from 'react'
import { BarreNavigation, EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { BadgeStatut } from '../../components/agent/Badge'
import { BoutonsReponse } from '../../components/agent/CarteMission'
import { useAuth } from '../../auth/AuthContexte'
import { adresseComplete, lienItineraire } from '../../lib/clients'
import { dateCourte } from '../../lib/dates'
import { estPassee, useMesMissions } from '../../lib/espaceAgent'

function Ligne({ Icone, titre, children }: { Icone: typeof LuClock; titre: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 py-3">
      <Icone className="mt-0.5 h-5 w-5 shrink-0 text-nuit-900" />
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-nuit-600">{titre}</p>
        <div className="mt-0.5 whitespace-pre-line text-[15px] text-nuit-900">{children}</div>
      </div>
    </div>
  )
}

// Écran complémentaire (non dessiné sur les maquettes) : ouvert depuis une mission.
export default function MissionDetail({ id }: { id: string }) {
  const { profil } = useAuth()
  const { missions, erreur, recharger } = useMesMissions(profil?.id)
  const mission = missions?.find((m) => m.mission_id === id)

  if (!mission) {
    return (
      <EcranAgent>
        <EnteteAgent titre="Mission" retourVers="/agent/missions" />
        <Feuille>
          <p className="py-10 text-center text-sm text-nuit-600">{erreur ?? (missions ? 'Cette mission n’est plus disponible.' : 'Chargement…')}</p>
        </Feuille>
        <BarreNavigation actif="missions" />
      </EcranAgent>
    )
  }

  const s = mission.site
  const adresse = adresseComplete(s)
  const consignes = [mission.consignes, s.consignes].filter(Boolean).join('\n')
  const contact = [s.contact_nom, s.contact_telephone].filter(Boolean)

  return (
    <EcranAgent>
      <EnteteAgent titre={s.nom} retourVers="/agent/missions" />
      <Feuille className="pb-6">
        <div className="mb-1 px-1">
          {mission.mission_annulee ? <BadgeStatut statut="annulee" /> : <BadgeStatut statut={mission.statut} />}
        </div>
        <div className="divide-y divide-trait px-1">
          <Ligne Icone={LuCalendar} titre="Date">
            {dateCourte(mission.date)}
          </Ligne>
          <Ligne Icone={LuClock} titre="Horaires">
            {mission.hDebut} – {mission.hFin}
            {mission.hFin <= mission.hDebut && ' (fin le lendemain)'}
          </Ligne>
          {adresse && (
            <Ligne Icone={LuMapPin} titre="Adresse">
              <p>{adresse}</p>
              <a href={lienItineraire(s)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm font-semibold text-or-600 underline">
                Ouvrir l'itinéraire
              </a>
            </Ligne>
          )}
          {s.infos_acces && (
            <Ligne Icone={LuDoorOpen} titre="Accès">
              {s.infos_acces}
            </Ligne>
          )}
          {consignes && (
            <Ligne Icone={LuClipboardList} titre="Consignes">
              {consignes}
            </Ligne>
          )}
          {contact.length > 0 && (
            <Ligne Icone={LuPhone} titre="Contact sur place">
              {s.contact_nom && <p>{s.contact_nom}</p>}
              {s.contact_telephone && (
                <a href={`tel:${s.contact_telephone.replace(/\s/g, '')}`} className="font-semibold text-or-600 underline">
                  {s.contact_telephone}
                </a>
              )}
            </Ligne>
          )}
          {mission.statut === 'refusee' && mission.motif_refus && (
            <Ligne Icone={LuClipboardList} titre="Votre motif de refus">
              {mission.motif_refus}
            </Ligne>
          )}
        </div>
        {mission.statut === 'proposee' && !mission.mission_annulee && !estPassee(mission) && <BoutonsReponse mission={mission} apres={recharger} grand />}
        {mission.statut === 'acceptee' && <p className="mt-4 rounded-xl bg-fond p-3 text-[13px] text-nuit-700">Vous avez accepté cette mission. Vous serez prévenu dès qu’elle sera confirmée.</p>}
      </Feuille>
      <BarreNavigation actif="missions" />
    </EcranAgent>
  )
}
