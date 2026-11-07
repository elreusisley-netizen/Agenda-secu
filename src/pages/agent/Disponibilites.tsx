import { useEffect, useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuMoon, LuSun, LuX } from 'react-icons/lu'
import { EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { useAuth } from '../../auth/AuthContexte'
import { useDemo } from '../../demo/DemoContexte'
import { JOURS_COURTS, aujourdhuiIso, dateCourte, deux, grilleMois, moisSuivant, titreMois, versDate } from '../../lib/dates'
import {
  COULEUR_DISPO,
  LIBELLE_DISPO,
  STATUTS_DISPO,
  chargerMesDispos,
  differences,
  enregistrerMesDispos,
  type Creneau,
  type DispoMois,
  type StatutDispo,
  type ValeurJour,
} from '../../lib/disponibilites'

const CRENEAUX_AFFICHES: { id: Creneau; libelle: string; Icone: typeof LuSun }[] = [
  { id: 'jour', libelle: 'Journée', Icone: LuSun },
  { id: 'nuit', libelle: 'Nuit', Icone: LuMoon },
]

/** Une case du calendrier. Si journée et nuit diffèrent, la case est coupée en deux (haut = journée, bas = nuit). */
function CaseJour({ iso, valeur, passe, onClick }: { iso: string; valeur?: ValeurJour; passe: boolean; onClick: () => void }) {
  const jour = valeur?.jour
  const nuit = valeur?.nuit
  const rempli = Boolean(jour || nuit)
  const identique = jour === nuit
  return (
    <button
      onClick={onClick}
      disabled={passe}
      className={`relative mx-auto flex aspect-square w-full max-w-[42px] items-center justify-center overflow-hidden rounded-lg text-[14px] font-semibold text-nuit-900 ${passe ? 'opacity-35' : ''}`}
      aria-label={`${dateCourte(iso)} : journée ${jour ? LIBELLE_DISPO[jour] : 'non renseignée'}, nuit ${nuit ? LIBELLE_DISPO[nuit] : 'non renseignée'}`}
    >
      {rempli &&
        (identique && jour ? (
          <span className={`absolute inset-0 ${COULEUR_DISPO[jour]}`} />
        ) : (
          <>
            <span className={`absolute inset-x-0 top-0 h-1/2 ${jour ? COULEUR_DISPO[jour] : 'bg-fond'}`} />
            <span className={`absolute inset-x-0 bottom-0 h-1/2 ${nuit ? COULEUR_DISPO[nuit] : 'bg-fond'}`} />
          </>
        ))}
      <span className="relative">{versDate(iso).getDate()}</span>
    </button>
  )
}

function FeuilleChoix({ titre, valeur, changer, fermer }: { titre: string; valeur: ValeurJour; changer: (v: ValeurJour) => void; fermer: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={fermer} role="dialog" aria-modal="true">
      <div className="pb-securite w-full max-w-[430px] rounded-t-[1.75rem] bg-white px-5 pt-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-nuit-900">{titre}</h2>
          <button onClick={fermer} aria-label="Fermer" className="p-1 text-nuit-900">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        {CRENEAUX_AFFICHES.map(({ id, libelle, Icone }) => (
          <div key={id} className="mb-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-nuit-900">
              <Icone className="h-4 w-4" /> {libelle}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {STATUTS_DISPO.map((s) => {
                const actif = valeur[id] === s
                return (
                  <button
                    key={s}
                    onClick={() => changer({ ...valeur, [id]: actif ? undefined : s })}
                    className={`rounded-xl px-2 py-2.5 text-[13px] font-semibold ${actif ? `${COULEUR_DISPO[s]} text-nuit-900 ring-2 ring-nuit-900` : 'bg-fond text-nuit-700'}`}
                  >
                    {LIBELLE_DISPO[s]}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <div className="mb-3 flex gap-2">
          <button onClick={() => changer({})} className="flex-1 rounded-xl bg-fond py-3 text-sm font-semibold text-nuit-700">
            Effacer
          </button>
          <button onClick={fermer} className="flex-1 rounded-xl bg-or-500 py-3 text-sm font-bold text-nuit-900">
            Valider
          </button>
        </div>
      </div>
    </div>
  )
}

const nettoyer = (v: ValeurJour): ValeurJour | null => {
  const r: ValeurJour = {}
  if (v.jour) r.jour = v.jour
  if (v.nuit) r.nuit = v.nuit
  return r.jour || r.nuit ? r : null
}

export default function Disponibilites() {
  const { profil } = useAuth()
  const { afficherMessage } = useDemo()
  const ajd = aujourdhuiIso()
  const [[annee, mois], setMois] = useState<[number, number]>(() => [new Date().getFullYear(), new Date().getMonth()])
  // « original » = ce qui est enregistré ; « brouillon » = ce que l'agent est en train de modifier (tous mois confondus).
  const [original, setOriginal] = useState<DispoMois>({})
  const [brouillon, setBrouillon] = useState<DispoMois>({})
  const [charges, setCharges] = useState<string[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)
  const [jourOuvert, setJourOuvert] = useState<string | null>(null)
  const [remplir, setRemplir] = useState(false)

  const cle = `${annee}-${deux(mois + 1)}`
  const pret = charges.includes(cle)

  useEffect(() => {
    if (!profil || charges.includes(cle)) return
    chargerMesDispos(profil.id, annee, mois)
      .then((d) => {
        setOriginal((o) => ({ ...o, ...d }))
        setBrouillon((b) => ({ ...d, ...b }))
        setCharges((c) => [...c, cle])
        setErreur(null)
      })
      .catch(() => setErreur('Impossible de charger vos disponibilités. Vérifiez votre connexion.'))
  }, [profil, annee, mois, cle, charges])

  const cases = grilleMois(annee, mois)
  const changements = differences(original, brouillon).total

  const changerJour = (iso: string, v: ValeurJour) =>
    setBrouillon((b) => {
      const copie = { ...b }
      const propre = nettoyer(v)
      if (propre) copie[iso] = propre
      else delete copie[iso]
      return copie
    })

  /** Applique un choix à tous les jours à venir du mois qui ne sont pas encore renseignés. */
  const remplirMois = (v: ValeurJour) =>
    setBrouillon((b) => {
      const copie = { ...b }
      const propre = nettoyer(v)
      if (!propre) return b
      for (const iso of cases) {
        if (!iso || iso < ajd) continue
        copie[iso] = { ...propre, ...copie[iso] }
      }
      return copie
    })

  const enregistrer = async () => {
    if (!profil) return
    setEnvoi(true)
    const err = await enregistrerMesDispos(profil.id, original, brouillon)
    setEnvoi(false)
    if (err) return setErreur(err)
    setOriginal(brouillon)
    setErreur(null)
    afficherMessage('Disponibilités enregistrées')
  }

  return (
    <EcranAgent>
      <EnteteAgent titre="Mes disponibilités" retourVers="/agent" />
      <Feuille className="flex flex-col pb-6">
        <div className="rounded-2xl border border-trait px-3 pb-3 pt-3">
          <div className="mb-3 flex items-center justify-between px-1">
            <button onClick={() => setMois(moisSuivant(annee, mois, -1))} aria-label="Mois précédent" className="p-1.5">
              <LuChevronLeft className="h-5 w-5" />
            </button>
            <p className="text-[15px] font-bold text-nuit-900">{titreMois(annee, mois)}</p>
            <button onClick={() => setMois(moisSuivant(annee, mois, 1))} aria-label="Mois suivant" className="p-1.5">
              <LuChevronRight className="h-5 w-5" />
            </button>
          </div>
          <div className="mb-2 grid grid-cols-7 text-center text-[13px] text-nuit-700">
            {JOURS_COURTS.map((j) => (
              <span key={j}>{j}</span>
            ))}
          </div>
          <div className={`grid grid-cols-7 gap-y-2.5 ${pret ? '' : 'animate-pulse opacity-50'}`}>
            {cases.map((iso, i) =>
              iso ? (
                <CaseJour key={iso} iso={iso} valeur={brouillon[iso]} passe={iso < ajd || !pret} onClick={() => setJourOuvert(iso)} />
              ) : (
                <span key={'v' + i} />
              ),
            )}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-nuit-900">
          {STATUTS_DISPO.map((s) => (
            <span key={s} className="flex items-center gap-2">
              <span className={`h-3.5 w-3.5 rounded-full ${COULEUR_DISPO[s]}`} />
              {LIBELLE_DISPO[s]}
            </span>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-nuit-600">Touchez un jour pour choisir. Case coupée : haut = journée, bas = nuit.</p>
        {pret && cases.some((iso) => iso && iso >= ajd && !brouillon[iso]) && (
          <button onClick={() => setRemplir(true)} className="mx-auto mt-3 rounded-full border border-trait px-4 py-2 text-[13px] font-semibold text-nuit-900">
            Remplir les jours non renseignés…
          </button>
        )}

        {erreur && <p className="mt-4 rounded-xl bg-red-50 p-3 text-[13px] text-red-800">{erreur}</p>}

        <div className="mt-auto pt-8">
          <button
            onClick={enregistrer}
            disabled={envoi || changements === 0}
            className="w-full rounded-xl bg-or-500 py-4 text-[15px] font-bold text-nuit-900 shadow-sm disabled:opacity-50"
          >
            {envoi ? 'Enregistrement…' : changements ? `Enregistrer mes disponibilités (${changements})` : 'Disponibilités à jour'}
          </button>
        </div>
      </Feuille>
      {jourOuvert && <FeuilleChoix titre={dateCourte(jourOuvert)} valeur={brouillon[jourOuvert] ?? {}} changer={(v) => changerJour(jourOuvert, v)} fermer={() => setJourOuvert(null)} />}
      {remplir && (
        <FeuilleRemplir
          fermer={() => setRemplir(false)}
          appliquer={(v) => {
            remplirMois(v)
            setRemplir(false)
          }}
        />
      )}
    </EcranAgent>
  )
}

function FeuilleRemplir({ appliquer, fermer }: { appliquer: (v: ValeurJour) => void; fermer: () => void }) {
  const [v, setV] = useState<ValeurJour>({ jour: 'disponible', nuit: 'disponible' })
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={fermer} role="dialog" aria-modal="true">
      <div className="pb-securite w-full max-w-[430px] rounded-t-[1.75rem] bg-white px-5 pt-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-lg font-bold text-nuit-900">Remplir le mois</h2>
          <button onClick={fermer} aria-label="Fermer" className="p-1 text-nuit-900">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-[13px] text-nuit-600">S’applique aux jours à venir non renseignés. Les jours déjà remplis ne changent pas.</p>
        {CRENEAUX_AFFICHES.map(({ id, libelle, Icone }) => (
          <div key={id} className="mb-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-nuit-900">
              <Icone className="h-4 w-4" /> {libelle}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {STATUTS_DISPO.map((s: StatutDispo) => (
                <button
                  key={s}
                  onClick={() => setV({ ...v, [id]: v[id] === s ? undefined : s })}
                  className={`rounded-xl px-2 py-2.5 text-[13px] font-semibold ${v[id] === s ? `${COULEUR_DISPO[s]} text-nuit-900 ring-2 ring-nuit-900` : 'bg-fond text-nuit-700'}`}
                >
                  {LIBELLE_DISPO[s]}
                </button>
              ))}
            </div>
          </div>
        ))}
        <button onClick={() => appliquer(v)} disabled={!v.jour && !v.nuit} className="mb-3 w-full rounded-xl bg-or-500 py-3 text-sm font-bold text-nuit-900 disabled:opacity-50">
          Appliquer
        </button>
      </div>
    </div>
  )
}
