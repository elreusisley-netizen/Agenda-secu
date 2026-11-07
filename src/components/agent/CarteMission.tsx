import { useState, type ReactNode } from 'react'
import { LuCalendar, LuChevronRight, LuMapPin } from 'react-icons/lu'
import { useDemo } from '../../demo/DemoContexte'
import { repondre, type MaMission } from '../../lib/espaceAgent'
import { dateCourte } from '../../lib/dates'
import { Lien } from '../../lib/routeur'

/** Bloc date + horaires + site, cliquable vers le détail de la mission. */
export function ResumeMission({ mission, enfants }: { mission: MaMission; enfants?: ReactNode }) {
  return (
    <div>
      <Lien vers={`/agent/missions/${mission.mission_id}`} className="flex items-start gap-3 py-1">
        <LuCalendar className="mt-0.5 h-5 w-5 shrink-0 text-nuit-900" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-bold text-nuit-900">{dateCourte(mission.date)}</p>
          <p className="text-[15px] text-nuit-900">
            {mission.hDebut} – {mission.hFin}
            {mission.hFin <= mission.hDebut && <span className="text-[13px] text-nuit-600"> (lendemain)</span>}
          </p>
        </div>
        <LuChevronRight className="mt-2 h-5 w-5 shrink-0 text-nuit-900" />
      </Lien>
      <p className="mt-2.5 flex items-center gap-3 text-[13px] text-nuit-900">
        <LuMapPin className="h-5 w-5 shrink-0" />
        Site : {mission.site.nom}
      </p>
      {enfants}
    </div>
  )
}

/** Boutons « Refuser / Accepter » d'une proposition, avec motif facultatif en cas de refus. */
export function BoutonsReponse({ mission, apres, grand }: { mission: MaMission; apres: () => void | Promise<void>; grand?: boolean }) {
  const { afficherMessage } = useDemo()
  const [refus, setRefus] = useState(false)
  const [motif, setMotif] = useState('')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const envoyer = async (statut: 'acceptee' | 'refusee') => {
    setEnvoi(true)
    setErreur(null)
    const err = await repondre(mission, statut, motif)
    setEnvoi(false)
    if (err) return setErreur(err)
    afficherMessage(statut === 'acceptee' ? 'Mission acceptée — en attente de confirmation' : 'Mission refusée')
    setRefus(false)
    await apres()
  }

  const hauteur = grand ? 'py-3' : 'py-2.5'
  return (
    <div className="mt-3">
      {!refus ? (
        <div className="grid grid-cols-2 gap-3">
          <button disabled={envoi} onClick={() => setRefus(true)} className={`rounded-xl bg-fond ${hauteur} text-[14px] font-semibold text-nuit-900 disabled:opacity-50`}>
            Refuser
          </button>
          <button disabled={envoi} onClick={() => envoyer('acceptee')} className={`rounded-xl bg-or-500 ${hauteur} text-[14px] font-bold text-nuit-900 disabled:opacity-50`}>
            {envoi ? 'Envoi…' : 'Accepter'}
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-fond p-3">
          <label className="text-[13px] font-medium text-nuit-700">
            Motif du refus <span className="font-normal text-nuit-600">(facultatif)</span>
            <textarea
              value={motif}
              onChange={(e) => setMotif(e.target.value)}
              rows={2}
              maxLength={300}
              placeholder="Ex. : déjà pris ce jour-là"
              className="mt-1 w-full rounded-lg border border-trait bg-white px-3 py-2 text-[15px] text-nuit-900 outline-none focus:border-or-500"
            />
          </label>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <button disabled={envoi} onClick={() => setRefus(false)} className="rounded-xl bg-white py-2.5 text-[14px] font-semibold text-nuit-900">
              Retour
            </button>
            <button disabled={envoi} onClick={() => envoyer('refusee')} className="rounded-xl bg-nuit-900 py-2.5 text-[14px] font-bold text-white disabled:opacity-50">
              {envoi ? 'Envoi…' : 'Confirmer le refus'}
            </button>
          </div>
        </div>
      )}
      {erreur && <p className="mt-2 rounded-lg bg-red-50 p-2.5 text-[13px] text-red-800">{erreur}</p>}
    </div>
  )
}
