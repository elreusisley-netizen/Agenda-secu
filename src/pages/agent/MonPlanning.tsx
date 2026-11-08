import { useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuDownload } from 'react-icons/lu'
import { telecharger, nomFichier } from '../../lib/exports/fichiers'
import { decompter, pdfAgent } from '../../lib/exports/rapports'
import { BarreNavigation, EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { BadgeStatut } from '../../components/agent/Badge'
import { useAuth } from '../../auth/AuthContexte'
import { jourSemaineCourt, moisSuivant, numeroJour, titreMois } from '../../lib/dates'
import { useMesMissions } from '../../lib/espaceAgent'
import { premierDuMois } from '../../lib/missions'
import { Lien } from '../../lib/routeur'

export default function MonPlanning() {
  const { profil } = useAuth()
  const { missions, erreur } = useMesMissions(profil?.id)
  const [[annee, mois], setMois] = useState<[number, number]>(() => [new Date().getFullYear(), new Date().getMonth()])
  const prefixe = premierDuMois(annee, mois).slice(0, 7)

  const duMois = (missions ?? []).filter((m) => m.statut === 'confirmee' && !m.mission_annulee && m.date.startsWith(prefixe))
  const heures = duMois.reduce((t, m) => t + (new Date(m.fin).getTime() - new Date(m.debut).getTime()) / 36e5, 0)

  return (
    <EcranAgent>
      <EnteteAgent titre="Mon planning" retourVers="/agent" />
      <Feuille className="pb-6">
        <div className="mb-4 flex items-center justify-between rounded-2xl border border-trait px-3 py-3">
          <button onClick={() => setMois(moisSuivant(annee, mois, -1))} aria-label="Mois précédent" className="p-1.5">
            <LuChevronLeft className="h-5 w-5" />
          </button>
          <p className="text-[15px] font-bold text-nuit-900">{titreMois(annee, mois)}</p>
          <button onClick={() => setMois(moisSuivant(annee, mois, 1))} aria-label="Mois suivant" className="p-1.5">
            <LuChevronRight className="h-5 w-5" />
          </button>
        </div>

        {erreur && <p className="mb-3 rounded-xl bg-red-50 p-3 text-[13px] text-red-800">{erreur}</p>}
        {!missions && !erreur && <p className="py-12 text-center text-sm text-nuit-600">Chargement…</p>}
        {missions && duMois.length === 0 && <p className="py-12 text-center text-sm text-nuit-600">Aucune mission confirmée ce mois-ci.</p>}
        {duMois.length > 0 && (
          <p className="mb-3 px-1 text-[13px] text-nuit-700">
            {duMois.length} vacation{duMois.length > 1 ? 's' : ''} · {Math.round(heures * 10) / 10} h
          </p>
        )}

        {duMois.length > 0 && profil && (
          <button
            onClick={() => {
              const vacations = duMois.map((m) => ({
                date: m.date,
                hDebut: m.hDebut,
                hFin: m.hFin,
                agentId: profil.id,
                agent: `${profil.prenom} ${profil.nom}`,
                siteId: m.site.nom,
                site: m.site.nom,
                ville: m.site.ville,
                client: null,
                adresse: [m.site.adresse, [m.site.code_postal, m.site.ville].filter(Boolean).join(' ')].filter(Boolean).join(', ') || null,
                consignes: [m.consignes, m.site.consignes].filter(Boolean).join(' — ') || null,
                ...decompter(m.date, m.hDebut, m.hFin),
              }))
              void telecharger(pdfAgent(annee, mois, `${profil.prenom} ${profil.nom}`, vacations), `Mon_planning_${nomFichier(titreMois(annee, mois))}.pdf`)
            }}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-trait py-3 text-[14px] font-bold text-nuit-900 active:bg-fond"
          >
            <LuDownload className="h-4 w-4" /> Télécharger mon planning (PDF)
          </button>
        )}

        <ul className="space-y-3">
          {duMois.map((m) => (
            <li key={m.affectation_id}>
              <Lien vers={`/agent/missions/${m.mission_id}`} className="flex items-center gap-3 rounded-2xl border border-trait bg-white px-3 py-3.5">
                <div className="w-12 shrink-0 text-center">
                  <p className="text-[13px] text-nuit-700">{jourSemaineCourt(m.date)}</p>
                  <p className="text-[22px] font-bold leading-tight text-nuit-900">{numeroJour(m.date)}</p>
                </div>
                <div className="min-w-0 flex-1 border-l border-trait pl-3">
                  <p className="text-[15px] font-bold text-nuit-900">
                    {m.hDebut} – {m.hFin}
                  </p>
                  <p className="truncate text-[13px] text-nuit-900">{m.site.nom}</p>
                </div>
                <BadgeStatut statut={m.statut} />
              </Lien>
            </li>
          ))}
        </ul>
      </Feuille>
      <BarreNavigation actif="planning" />
    </EcranAgent>
  )
}
