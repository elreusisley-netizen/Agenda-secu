import { useState } from 'react'
import { LuCalendarDays, LuChevronLeft, LuChevronRight, LuDownload, LuMoon, LuSun } from 'react-icons/lu'
import { BarreNavigation, EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { useAuth } from '../../auth/AuthContexte'
import { dateCourte, moisSuivant, titreMois } from '../../lib/dates'
import { estPassee, useMesMissions } from '../../lib/espaceAgent'
import { nomFichier, telecharger } from '../../lib/exports/fichiers'
import { decompter, h2, pdfAgent } from '../../lib/exports/rapports'
import { premierDuMois } from '../../lib/missions'
import { Lien } from '../../lib/routeur'

/** Heures confirmées de l'agent pour le mois choisi : effectuées, à venir, nuit, dimanche, jours fériés. */
export default function MesHeures() {
  const { profil } = useAuth()
  const { missions, erreur } = useMesMissions(profil?.id)
  const [[annee, mois], setMois] = useState<[number, number]>(() => [new Date().getFullYear(), new Date().getMonth()])
  const prefixe = premierDuMois(annee, mois).slice(0, 7)

  const lignes = (missions ?? [])
    .filter((m) => m.statut === 'confirmee' && !m.mission_annulee && m.date.startsWith(prefixe))
    .map((m) => ({ m, ...decompter(m.date, m.hDebut, m.hFin), faite: estPassee(m) }))
  const somme = (cle: 'heures' | 'nuit' | 'dimanche' | 'ferie', filtre: (l: (typeof lignes)[number]) => boolean = () => true) =>
    lignes.filter(filtre).reduce((t, l) => t + l[cle], 0)
  const total = somme('heures')
  const faites = somme('heures', (l) => l.faite)
  const part = total ? Math.round((faites / total) * 100) : 0

  const exporter = () => {
    if (!profil) return
    const vacations = lignes.map(({ m, heures, nuit, dimanche, ferie }) => ({
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
      heures,
      nuit,
      dimanche,
      ferie,
    }))
    void telecharger(pdfAgent(annee, mois, `${profil.prenom} ${profil.nom}`, vacations), `Mes_heures_${nomFichier(titreMois(annee, mois))}.pdf`)
  }

  const Case = ({ libelle, valeur, Icone }: { libelle: string; valeur: number; Icone: typeof LuSun }) => (
    <div className="rounded-2xl border border-trait bg-white px-3 py-3">
      <p className="flex items-center gap-1.5 text-[12px] text-nuit-600">
        <Icone className="h-3.5 w-3.5" /> {libelle}
      </p>
      <p className="mt-1 text-[20px] font-bold text-nuit-900">{h2(valeur)} h</p>
    </div>
  )

  return (
    <EcranAgent>
      <EnteteAgent titre="Mes heures" retourVers="/agent" />
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

        {missions && (
          <>
            {/* Total du mois et avancement */}
            <div className="rounded-2xl bg-nuit-900 p-4 text-white">
              <p className="text-[13px] text-white/70">Total du mois (vacations confirmées)</p>
              <p className="mt-1 text-[34px] font-bold leading-none">
                {h2(total)} <span className="text-[18px] font-semibold">heures</span>
              </p>
              <p className="mt-1 text-[13px] text-white/70">
                {lignes.length} vacation{lignes.length > 1 ? 's' : ''}
              </p>
              <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-or-500" style={{ width: `${part}%` }} />
              </div>
              <div className="mt-2 flex justify-between text-[12px]">
                <span>
                  <b className="text-or-400">{h2(faites)} h</b> effectuées
                </span>
                <span className="text-white/70">{h2(total - faites)} h à venir</span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <Case libelle="Nuit" valeur={somme('nuit')} Icone={LuMoon} />
              <Case libelle="Dimanche" valeur={somme('dimanche')} Icone={LuSun} />
              <Case libelle="Fériés" valeur={somme('ferie')} Icone={LuCalendarDays} />
            </div>
            <p className="mt-2 px-1 text-[11px] text-nuit-600">Nuit : entre 21 h et 6 h. Heures décimales : 7,5 = 7 h 30.</p>

            <h2 className="mb-2 mt-5 px-1 text-[15px] font-bold text-nuit-900">Détail</h2>
            {lignes.length === 0 && <p className="py-8 text-center text-sm text-nuit-600">Aucune vacation confirmée ce mois-ci.</p>}
            <ul className="divide-y divide-trait rounded-2xl border border-trait bg-white">
              {lignes.map(({ m, heures, nuit, faite }) => (
                <li key={m.affectation_id}>
                  <Lien vers={`/agent/missions/${m.mission_id}`} className="flex items-center gap-3 px-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-nuit-900">
                        {dateCourte(m.date)} · {m.hDebut}–{m.hFin}
                      </p>
                      <p className="truncate text-[12px] text-nuit-600">
                        {m.site.nom}
                        {nuit > 0 && ` · dont ${h2(nuit)} h de nuit`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[15px] font-bold text-nuit-900">{h2(heures)} h</p>
                      <p className={`text-[11px] font-semibold ${faite ? 'text-dispo-fonce' : 'text-nuit-600'}`}>{faite ? 'Effectuée' : 'À venir'}</p>
                    </div>
                  </Lien>
                </li>
              ))}
            </ul>

            {lignes.length > 0 && (
              <button onClick={exporter} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-trait bg-white py-3 text-[14px] font-bold text-nuit-900 active:bg-fond">
                <LuDownload className="h-4 w-4" /> Télécharger le détail (PDF)
              </button>
            )}
          </>
        )}
      </Feuille>
      <BarreNavigation actif="planning" />
    </EcranAgent>
  )
}
