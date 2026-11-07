/*
  Import d'un planning Excel : choix du fichier → aperçu et vérifications → enregistrement.
  Rien n'est enregistré avant que l'administrateur appuie sur « Importer ».
*/
import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { LuCircleCheck, LuFileSpreadsheet, LuTriangleAlert } from 'react-icons/lu'
import { useDemo } from '../../demo/DemoContexte'
import { listerSites, type Site } from '../../lib/clients'
import { aujourdhuiIso, dateCourte } from '../../lib/dates'
import {
  chargerCorrespondances,
  importer,
  interpreter,
  memoriserCorrespondances,
  normaliser,
  trouverAgent,
  trouverSite,
  type PlanningLu,
  type ResultatImport,
} from '../../lib/importPlanning'
import { lireExcel } from '../../lib/lectureExcel'
import { ENGAGEES, bornes, chargerMois, nomAgent, seChevauchent, type AgentCourt, type Mission } from '../../lib/missions'
import { Alerte, Fenetre } from './missions'

type Etat = 'deja' | 'conflit' | 'probleme' | 'ok'
const CHAMP = 'mt-1 w-full rounded-lg border border-trait bg-white px-3 py-2.5 text-sm text-nuit-900 outline-none focus:border-or-500'

export function ImportExcel({ agents, fermer, apres }: { agents: AgentCourt[]; fermer: () => void; apres: (premiereDate: string) => void }) {
  const { afficherMessage } = useDemo()
  const [nomFichier, setNomFichier] = useState('')
  const [lu, setLu] = useState<PlanningLu | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [lecture, setLecture] = useState(false)
  const [sites, setSites] = useState<Site[]>([])
  const [correspondances, setCorrespondances] = useState<Record<string, string>>({})
  const [agentId, setAgentId] = useState('')
  const [choixSites, setChoixSites] = useState<Record<string, string>>({})
  const [statut, setStatut] = useState<'confirmee' | 'proposee'>('confirmee')
  const [consignes, setConsignes] = useState('')
  const [existantes, setExistantes] = useState<Mission[]>([])
  const [exclues, setExclues] = useState<Set<number>>(new Set())
  const [envoi, setEnvoi] = useState(false)
  const [resultats, setResultats] = useState<{ r: ResultatImport[]; lignes: number[] } | null>(null)

  useEffect(() => {
    Promise.all([listerSites(), chargerCorrespondances()])
      .then(([s, c]) => {
        setSites(s)
        setCorrespondances(c)
      })
      .catch(() => undefined)
  }, [])

  const actifs = agents.filter((a) => a.actif)

  const choisirFichier = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setErreur(null)
    setLu(null)
    setResultats(null)
    setNomFichier(f.name)
    if (/\.xls$/i.test(f.name)) return setErreur('Ce fichier est à l’ancien format Excel (.xls). Ouvrez-le dans Excel puis « Enregistrer sous » au format .xlsx.')
    setLecture(true)
    try {
      const p = interpreter(await lireExcel(await f.arrayBuffer()))
      setLu(p)
      setAgentId(trouverAgent(p.nomAgent, actifs)?.id ?? '')
      setConsignes(p.observations ? p.observations.charAt(0).toUpperCase() + p.observations.slice(1).toLowerCase() : '')
      // Missions déjà enregistrées sur les mois du fichier (pour repérer doublons et chevauchements).
      const mois = [...new Set(p.vacations.map((v) => v.date.slice(0, 7)))]
      const donnees = await Promise.all(mois.map((m) => chargerMois(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1)))
      setExistantes(donnees.flatMap((d) => d.missions))
    } catch (err) {
      const m = (err as Error)?.message
      setErreur(m && m.length > 20 ? m : 'Impossible de lire ce fichier. Vérifiez que c’est bien un fichier Excel (.xlsx).')
    } finally {
      setLecture(false)
    }
  }

  const lieux = useMemo(() => [...new Set((lu?.vacations ?? []).map((v) => v.lieu).filter(Boolean))], [lu])
  // Site choisi pour chaque lieu : choix manuel, sinon correspondance retrouvée automatiquement.
  const siteDe = (lieu: string) => choixSites[lieu] ?? trouverSite(lieu, sites, correspondances)?.id ?? ''

  const lignes = (lu?.vacations ?? []).map((v, i) => {
    const site = siteDe(v.lieu)
    let etat: Etat = 'ok'
    let detail = ''
    if (v.probleme) {
      etat = 'probleme'
      detail = v.probleme
    } else if (agentId && site) {
      const b = bornes(v.date, v.hDebut, v.hFin)
      const miennes = existantes.filter((m) => m.statut !== 'annulee' && m.affectations.some((a) => a.agent_id === agentId && a.statut !== 'annulee' && a.statut !== 'refusee'))
      if (miennes.some((m) => m.site_id === site && new Date(m.debut).getTime() === new Date(b.debut).getTime())) {
        etat = 'deja'
        detail = 'Déjà dans le planning'
      } else {
        const c = miennes.find((m) => m.affectations.some((a) => a.agent_id === agentId && ENGAGEES.includes(a.statut)) && seChevauchent(m, b))
        if (c) {
          etat = 'conflit'
          detail = `En même temps qu’une autre mission (${c.hDebut}–${c.hFin}, ${c.site_nom})`
        }
      }
    }
    return { v, i, site, etat, detail }
  })

  const importables = lignes.filter((l) => (l.etat === 'ok' || (l.etat === 'conflit' && statut === 'proposee')) && l.site && !exclues.has(l.i))
  const lieuxSansSite = lieux.filter((l) => !siteDe(l))

  const lancer = async () => {
    if (!agentId || importables.length === 0) return
    setEnvoi(true)
    setErreur(null)
    const { resultats: r, erreur: err } = await importer(
      agentId,
      statut,
      importables.map((l) => ({ site: l.site, date: l.v.date, hDebut: l.v.hDebut, hFin: l.v.hFin, consignes: [consignes, l.v.observation].filter(Boolean).join(' — ') })),
    )
    setEnvoi(false)
    if (err || !r) return setErreur(err ?? 'L’import a échoué. Réessayez.')
    // Mémorise les correspondances lieu → site pour les prochains fichiers.
    const nouvelles = Object.fromEntries(lieux.filter((l) => siteDe(l)).map((l) => [normaliser(l), siteDe(l)]))
    void memoriserCorrespondances(nouvelles)
    setResultats({ r, lignes: importables.map((l) => l.i) })
    const n = r.filter((x) => x.resultat === 'ajoutee').length
    if (n) afficherMessage(`${n} vacation${n > 1 ? 's importées' : ' importée'}`)
  }

  const basculer = (i: number) => setExclues((s) => {
    const c = new Set(s)
    if (c.has(i)) c.delete(i)
    else c.add(i)
    return c
  })

  const PUCES: Record<Etat, string> = {
    ok: 'bg-confirme-fond text-confirme-texte',
    deja: 'bg-fond text-nuit-600',
    conflit: 'bg-indispo/40 text-indispo-fonce',
    probleme: 'bg-attente/40 text-attente-fonce',
  }
  const agentChoisi = actifs.find((a) => a.id === agentId)

  // ---------- Résultat ----------
  if (resultats && lu) {
    const ajoutees = resultats.r.filter((x) => x.resultat === 'ajoutee').length
    const deja = resultats.r.filter((x) => x.resultat === 'deja').length
    const erreurs = resultats.r.filter((x) => x.resultat === 'erreur')
    const premiere = lu.vacations[resultats.lignes[0]]?.date ?? aujourdhuiIso()
    return (
      <Fenetre titre="Import terminé" fermer={fermer}>
        <p className="flex items-center gap-2 text-[15px] font-semibold text-nuit-900">
          <LuCircleCheck className="h-5 w-5 text-dispo-fonce" />
          {ajoutees} vacation{ajoutees > 1 ? 's ajoutées' : ' ajoutée'} au planning de {agentChoisi ? nomAgent(agentChoisi) : 'l’agent'}
        </p>
        {deja > 0 && <p className="mt-1 text-[13px] text-nuit-600">{deja} déjà présente{deja > 1 ? 's' : ''} : non recréée{deja > 1 ? 's' : ''}.</p>}
        {erreurs.length > 0 && (
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-[13px] text-red-800">
            <p className="font-semibold">Non importées :</p>
            {erreurs.map((x) => {
              const v = lu.vacations[resultats.lignes[x.index]]
              return (
                <p key={x.index}>
                  {v ? `${dateCourte(v.date)} ${v.hDebut}–${v.hFin}` : ''} : {x.message}
                </p>
              )
            })}
          </div>
        )}
        {statut === 'confirmee' && ajoutees > 0 && <p className="mt-3 text-[13px] text-nuit-600">L’agent a reçu une notification « Planning mis à jour ».</p>}
        {statut === 'proposee' && ajoutees > 0 && <p className="mt-3 text-[13px] text-nuit-600">L’agent a reçu les propositions : il doit les accepter dans son espace.</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={fermer} className="rounded-xl bg-fond px-4 py-2.5 text-sm font-semibold text-nuit-900">
            Fermer
          </button>
          <button onClick={() => apres(premiere)} className="rounded-xl bg-or-500 px-4 py-2.5 text-sm font-bold text-nuit-900">
            Voir le planning
          </button>
        </div>
      </Fenetre>
    )
  }

  // ---------- Choix du fichier et aperçu ----------
  return (
    <Fenetre titre="Importer un planning Excel" fermer={fermer}>
      <label className="flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-or-500 bg-or-300/10 p-4 active:bg-or-300/30">
        <LuFileSpreadsheet className="h-8 w-8 shrink-0 text-dispo-fonce" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-bold text-nuit-900">{nomFichier || 'Choisir un fichier Excel (.xlsx)'}</span>
          <span className="block text-[12px] text-nuit-600">{lecture ? 'Lecture du fichier…' : nomFichier ? 'Touchez pour choisir un autre fichier' : 'Depuis votre téléphone, iCloud, Drive ou l’ordinateur'}</span>
        </span>
        <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={choisirFichier} className="hidden" />
      </label>
      {!lu && !erreur && (
        <p className="mt-3 text-[12px] text-nuit-600">Format attendu : un titre « PLANNING … MOIS ANNÉE NOM DE L’AGENT », puis une ligne par vacation avec la date, le début, la fin et le lieu.</p>
      )}
      <Alerte texte={erreur} />

      {lu && (
        <div className="mt-4 space-y-4 text-[13px] text-nuit-700">
          {lu.titre && <p className="rounded-lg bg-fond p-3 font-semibold text-nuit-900">{lu.titre}</p>}

          <label className="block font-medium">
            Agent
            <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className={CHAMP}>
              <option value="">— Choisir l’agent —</option>
              {actifs.map((a) => (
                <option key={a.id} value={a.id}>
                  {nomAgent(a)}
                </option>
              ))}
            </select>
            {!agentId && (
              <span className="mt-1 block text-[12px] text-red-700">
                {lu.nomAgent ? `« ${lu.nomAgent} » n’a pas été reconnu.` : 'Nom de l’agent non trouvé dans le titre.'} Choisissez l’agent, ou créez d’abord son compte dans « Agents ».
              </span>
            )}
          </label>

          {lieux.length > 0 && (
            <div>
              <p className="font-medium">Sites</p>
              {lieux.map((l) => (
                <label key={l} className="mt-1.5 flex items-center gap-2">
                  <span className="w-[96px] shrink-0 truncate font-semibold text-nuit-900">{l}</span>
                  <span className="text-nuit-600">→</span>
                  <select value={siteDe(l)} onChange={(e) => setChoixSites((c) => ({ ...c, [l]: e.target.value }))} className={CHAMP + ' mt-0'}>
                    <option value="">— Choisir le site —</option>
                    {sites
                      .filter((s) => s.actif)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.nom}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
              {lieuxSansSite.length > 0 && <p className="mt-1 text-[12px] text-red-700">Indiquez le site de chaque lieu. Si un site manque, ajoutez-le dans « Sites / Clients ».</p>}
              {lieux.length > 0 && <p className="mt-1 text-[12px] text-nuit-600">Ce choix sera retenu pour les prochains fichiers.</p>}
            </div>
          )}

          <label className="block font-medium">
            Consignes pour ces vacations
            <textarea rows={2} value={consignes} onChange={(e) => setConsignes(e.target.value)} className={CHAMP} placeholder="Facultatif" />
          </label>

          <div>
            <p className="font-medium">Enregistrer les vacations comme</p>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {(
                [
                  ['confirmee', 'Confirmées', 'Planning définitif'],
                  ['proposee', 'Proposées', 'L’agent doit accepter'],
                ] as const
              ).map(([v, t, aide]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setStatut(v)}
                  className={`rounded-xl border-2 p-2.5 text-left ${statut === v ? 'border-or-500 bg-or-300/20' : 'border-trait bg-white'}`}
                >
                  <span className="block text-[14px] font-bold text-nuit-900">{t}</span>
                  <span className="block text-[12px] text-nuit-600">{aide}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="font-medium">
              Vacations lues ({lu.vacations.length}) <span className="font-normal text-nuit-600">— décochez celles à ne pas importer</span>
            </p>
            <ul className="mt-1.5 divide-y divide-trait rounded-lg border border-trait">
              {lignes.map(({ v, i, site, etat, detail }) => {
                const bloquee = etat === 'probleme' || etat === 'deja' || (etat === 'conflit' && statut === 'confirmee') || !site
                return (
                  <li key={i} className={`flex items-start gap-2.5 px-3 py-2 ${bloquee ? 'opacity-70' : ''}`}>
                    <input type="checkbox" disabled={bloquee} checked={!bloquee && !exclues.has(i)} onChange={() => basculer(i)} className="mt-1 h-4 w-4 accent-[var(--color-or-500)]" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-nuit-900">
                        {dateCourte(v.date)} · {v.hDebut ? `${v.hDebut}–${v.hFin}` : '—'}
                        {v.hFin && v.hFin <= v.hDebut && <span className="font-normal text-nuit-600"> (lendemain)</span>}
                      </span>
                      <span className="block text-[12px] text-nuit-600">
                        {v.lieu || 'Lieu ?'}
                        {v.date < aujourdhuiIso() && ' · date passée'}
                        {v.observation && ` · ${v.observation}`}
                      </span>
                      {detail && <span className="block text-[12px] text-nuit-700">{detail}</span>}
                    </span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${PUCES[etat]}`}>
                      {etat === 'ok' ? (site ? 'OK' : 'Site ?') : etat === 'deja' ? 'Déjà là' : etat === 'conflit' ? 'Conflit' : 'À vérifier'}
                    </span>
                  </li>
                )
              })}
            </ul>
            {lignes.some((l) => l.etat === 'conflit') && statut === 'confirmee' && (
              <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-indispo-fonce">
                <LuTriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Les vacations en conflit ne peuvent pas être confirmées. Choisissez « Proposées » ou réglez le conflit d’abord.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={fermer} className="rounded-xl bg-fond px-4 py-2.5 text-sm font-semibold text-nuit-900">
              Annuler
            </button>
            <button
              onClick={lancer}
              disabled={envoi || !agentId || importables.length === 0}
              className="rounded-xl bg-or-500 px-4 py-2.5 text-sm font-bold text-nuit-900 disabled:opacity-50"
            >
              {envoi ? 'Import en cours…' : `Importer ${importables.length} vacation${importables.length > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}
    </Fenetre>
  )
}
