import { useEffect, useMemo, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuClock, LuFileSpreadsheet, LuFileText, LuLoaderCircle } from 'react-icons/lu'
import { CadreAdmin } from '../../components/admin/CadreAdmin'
import { memoriserMois, moisCourant } from '../../components/admin/missions'
import { useDemo } from '../../demo/DemoContexte'
import { listerClients, listerSites, type Client, type Site } from '../../lib/clients'
import { moisSuivant, titreMois } from '../../lib/dates'
import { nomFichier, telecharger } from '../../lib/exports/fichiers'
import { h2, pdfHeures, pdfPlanning, preparerVacations, recapHeures, xlsxHeures, xlsxPlanning } from '../../lib/exports/rapports'
import { chargerMois, nomAgent, type DonneesMois } from '../../lib/missions'

const CHAMP = 'w-full rounded-lg border border-trait bg-white px-3 py-2.5 text-sm text-nuit-900 outline-none focus:border-or-500'

export default function Rapports() {
  const { afficherMessage } = useDemo()
  const [[annee, mois], setMois] = useState<[number, number]>(moisCourant())
  const [donnees, setDonnees] = useState<DonneesMois | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [agent, setAgent] = useState('')
  const [site, setSite] = useState('')
  const [enCours, setEnCours] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listerSites(), listerClients()])
      .then(([s, c]) => {
        setSites(s)
        setClients(c)
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    setDonnees(null)
    memoriserMois(annee, mois)
    chargerMois(annee, mois)
      .then((d) => {
        setDonnees(d)
        setErreur(null)
      })
      .catch(() => setErreur('Impossible de charger les données. Vérifiez votre connexion.'))
  }, [annee, mois])

  const vacations = useMemo(() => (donnees ? preparerVacations(donnees, sites, clients, { agent: agent || undefined, site: site || undefined }) : []), [donnees, sites, clients, agent, site])
  const heures = useMemo(() => recapHeures(vacations, donnees?.agents ?? [], !agent && !site), [vacations, donnees, agent, site])
  const total = vacations.reduce((t, v) => t + v.heures, 0)

  const agentChoisi = donnees?.agents.find((a) => a.id === agent)
  const siteChoisi = sites.find((s) => s.id === site)
  const filtre = [agentChoisi ? nomAgent(agentChoisi) : 'Tous les agents', siteChoisi ? siteChoisi.nom : 'tous les sites'].join(' · ')
  const suffixe = nomFichier([titreMois(annee, mois), agentChoisi ? nomAgent(agentChoisi) : '', siteChoisi?.nom ?? ''].filter(Boolean).join(' '))

  const exporter = async (cle: string, faire: () => { blob: Blob; nom: string }) => {
    setEnCours(cle)
    try {
      await new Promise((r) => setTimeout(r, 30)) // laisse l'écran afficher « en cours »
      const { blob, nom } = faire()
      await telecharger(blob, nom)
      afficherMessage('Fichier prêt')
    } catch {
      afficherMessage('La création du fichier a échoué. Réessayez.')
    } finally {
      setEnCours(null)
    }
  }

  const Bouton = ({ cle, libelle, Icone, faire }: { cle: string; libelle: string; Icone: typeof LuFileText; faire: () => { blob: Blob; nom: string } }) => (
    <button
      disabled={!donnees || enCours !== null}
      onClick={() => exporter(cle, faire)}
      className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-trait bg-white px-3 py-3 text-[14px] font-bold text-nuit-900 shadow-sm active:bg-fond disabled:opacity-50"
    >
      {enCours === cle ? <LuLoaderCircle className="h-5 w-5 animate-spin" /> : <Icone className={`h-5 w-5 ${libelle === 'Excel' ? 'text-dispo-fonce' : 'text-red-600'}`} />}
      {libelle}
    </button>
  )

  return (
    <CadreAdmin actif="rapports">
      <h1 className="mb-1 text-[22px] font-bold text-nuit-900">Comptage des heures</h1>
      <p className="mb-4 text-[13px] text-nuit-600">Plannings et heures du mois, en PDF (à imprimer ou envoyer) ou en Excel (pour la paie). Seules les vacations confirmées sont exportées.</p>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-lg border border-trait bg-white">
          <button onClick={() => setMois(moisSuivant(annee, mois, -1))} aria-label="Mois précédent" className="p-2 hover:bg-fond">
            <LuChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[140px] text-center text-[13px] font-semibold text-nuit-900">{titreMois(annee, mois)}</span>
          <button onClick={() => setMois(moisSuivant(annee, mois, 1))} aria-label="Mois suivant" className="p-2 hover:bg-fond">
            <LuChevronRight className="h-4 w-4" />
          </button>
        </div>
        <select value={agent} onChange={(e) => setAgent(e.target.value)} className={CHAMP + ' max-w-[220px] flex-1'}>
          <option value="">Tous les agents</option>
          {(donnees?.agents ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {nomAgent(a)}
            </option>
          ))}
        </select>
        <select value={site} onChange={(e) => setSite(e.target.value)} className={CHAMP + ' max-w-[220px] flex-1'}>
          <option value="">Tous les sites</option>
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nom}
            </option>
          ))}
        </select>
      </div>

      {erreur && <p className="mb-4 rounded-xl bg-red-50 p-4 text-[13px] text-red-800">{erreur}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-trait bg-white p-4 shadow-sm">
          <h2 className="text-[16px] font-bold text-nuit-900">Planning du mois</h2>
          <p className="mt-0.5 text-[13px] text-nuit-600">Tableau agents × jours avec les horaires et les sites, puis le détail de chaque vacation.</p>
          <p className="mt-2 text-[13px] font-semibold text-nuit-900">{donnees ? `${vacations.length} vacation${vacations.length > 1 ? 's' : ''} · ${h2(total)} h` : 'Chargement…'}</p>
          <div className="mt-3 flex gap-2">
            <Bouton cle="planning-pdf" libelle="PDF" Icone={LuFileText} faire={() => ({ blob: pdfPlanning(annee, mois, vacations, donnees!.agents, filtre), nom: `Planning_${suffixe}.pdf` })} />
            <Bouton cle="planning-xlsx" libelle="Excel" Icone={LuFileSpreadsheet} faire={() => ({ blob: xlsxPlanning(annee, mois, vacations), nom: `Planning_${suffixe}.xlsx` })} />
          </div>
        </section>

        <section className="rounded-2xl border border-trait bg-white p-4 shadow-sm">
          <h2 className="text-[16px] font-bold text-nuit-900">Récapitulatif des heures</h2>
          <p className="mt-0.5 text-[13px] text-nuit-600">Par agent : heures totales, dont nuit (21 h – 6 h), dimanche et jours fériés.</p>
          <div className="mt-3 flex gap-2">
            <Bouton cle="heures-pdf" libelle="PDF" Icone={LuFileText} faire={() => ({ blob: pdfHeures(annee, mois, heures, filtre), nom: `Heures_${suffixe}.pdf` })} />
            <Bouton cle="heures-xlsx" libelle="Excel" Icone={LuFileSpreadsheet} faire={() => ({ blob: xlsxHeures(annee, mois, heures, vacations), nom: `Heures_${suffixe}.xlsx` })} />
          </div>
        </section>
      </div>

      {/* Aperçu des heures à l'écran */}
      {donnees && (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-trait bg-white shadow-sm">
          <table className="w-full min-w-[520px] text-[13px]">
            <thead>
              <tr className="bg-fond text-left text-[12px] text-nuit-700">
                <th className="px-3 py-2 font-semibold">Agent</th>
                <th className="px-3 py-2 text-right font-semibold">Vacations</th>
                <th className="px-3 py-2 text-right font-semibold">Heures</th>
                <th className="px-3 py-2 text-right font-semibold">Nuit</th>
                <th className="px-3 py-2 text-right font-semibold">Dimanche</th>
                <th className="px-3 py-2 text-right font-semibold">Fériés</th>
              </tr>
            </thead>
            <tbody>
              {heures.map((l) => (
                <tr key={l.agentId} className="border-t border-trait">
                  <td className="px-3 py-2 font-semibold text-nuit-900">{l.agent}</td>
                  <td className="px-3 py-2 text-right">{l.vacations}</td>
                  <td className="px-3 py-2 text-right font-semibold">{h2(l.heures)}</td>
                  <td className="px-3 py-2 text-right">{h2(l.nuit)}</td>
                  <td className="px-3 py-2 text-right">{h2(l.dimanche)}</td>
                  <td className="px-3 py-2 text-right">{h2(l.ferie)}</td>
                </tr>
              ))}
              {heures.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-nuit-600">
                    Aucune vacation confirmée pour ces critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <p className="flex items-center gap-1.5 border-t border-trait px-3 py-2 text-[12px] text-nuit-600">
            <LuClock className="h-3.5 w-3.5" /> Heures décimales : 7,5 = 7 h 30.
          </p>
        </div>
      )}
    </CadreAdmin>
  )
}
