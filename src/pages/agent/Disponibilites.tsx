import { useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuMoon, LuSun, LuX } from 'react-icons/lu'
import { EcranAgent, EnteteAgent, Feuille } from '../../components/agent/EcranAgent'
import { useDemo } from '../../demo/DemoContexte'
import type { Creneau, Disponibilites as Dispos, Statut } from '../../demo/donnees-demo'
import { JOURS_COURTS, dateCourte, grilleMois, moisSuivant, titreMois, versDate } from '../../lib/dates'

const COULEUR: Record<Statut, string> = {
  dispo: 'bg-dispo',
  indispo: 'bg-indispo',
  attente: 'bg-attente',
}
const LIBELLE: Record<Statut, string> = {
  dispo: 'Disponible',
  indispo: 'Indisponible',
  attente: 'En attente',
}
const STATUTS: Statut[] = ['dispo', 'indispo', 'attente']
const CRENEAUX: { id: Creneau; libelle: string; Icone: typeof LuSun }[] = [
  { id: 'jour', libelle: 'Journée', Icone: LuSun },
  { id: 'nuit', libelle: 'Nuit', Icone: LuMoon },
]

/** Une case du calendrier. Si journée et nuit diffèrent, la case est coupée en deux (haut = journée, bas = nuit). */
function CaseJour({ iso, valeur, onClick }: { iso: string; valeur?: Partial<Record<Creneau, Statut>>; onClick: () => void }) {
  const jour = valeur?.jour
  const nuit = valeur?.nuit
  const rempli = Boolean(jour || nuit)
  const identique = jour === nuit
  return (
    <button
      onClick={onClick}
      className="relative mx-auto flex aspect-square w-full max-w-[42px] items-center justify-center overflow-hidden rounded-lg text-[14px] font-semibold text-nuit-900"
      aria-label={`${dateCourte(iso)} : journée ${jour ? LIBELLE[jour] : 'non renseignée'}, nuit ${nuit ? LIBELLE[nuit] : 'non renseignée'}`}
    >
      {rempli &&
        (identique && jour ? (
          <span className={`absolute inset-0 ${COULEUR[jour]}`} />
        ) : (
          <>
            <span className={`absolute inset-x-0 top-0 h-1/2 ${jour ? COULEUR[jour] : 'bg-fond'}`} />
            <span className={`absolute inset-x-0 bottom-0 h-1/2 ${nuit ? COULEUR[nuit] : 'bg-fond'}`} />
          </>
        ))}
      <span className="relative">{versDate(iso).getDate()}</span>
    </button>
  )
}

function FeuilleChoix({
  iso,
  valeur,
  changer,
  fermer,
}: {
  iso: string
  valeur: Partial<Record<Creneau, Statut>>
  changer: (v: Partial<Record<Creneau, Statut>>) => void
  fermer: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={fermer} role="dialog" aria-modal="true">
      <div className="pb-securite w-full max-w-[430px] rounded-t-[1.75rem] bg-white px-5 pt-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-nuit-900">{dateCourte(iso)}</h2>
          <button onClick={fermer} aria-label="Fermer" className="p-1 text-nuit-900">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        {CRENEAUX.map(({ id, libelle, Icone }) => (
          <div key={id} className="mb-4">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-nuit-900">
              <Icone className="h-4 w-4" /> {libelle}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {STATUTS.map((s) => {
                const actif = valeur[id] === s
                return (
                  <button
                    key={s}
                    onClick={() => changer({ ...valeur, [id]: actif ? undefined : s })}
                    className={`rounded-xl px-2 py-2.5 text-[13px] font-semibold ${actif ? `${COULEUR[s]} text-nuit-900 ring-2 ring-nuit-900` : 'bg-fond text-nuit-700'}`}
                  >
                    {LIBELLE[s]}
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

export default function Disponibilites() {
  const { disponibilites, setDisponibilites, afficherMessage } = useDemo()
  const [brouillon, setBrouillon] = useState<Dispos>(disponibilites)
  const [[annee, mois], setMois] = useState<[number, number]>([2026, 10])
  const [jourOuvert, setJourOuvert] = useState<string | null>(null)

  const cases = grilleMois(annee, mois)

  const changerJour = (iso: string, v: Partial<Record<Creneau, Statut>>) =>
    setBrouillon((b) => {
      const copie = { ...b }
      if (!v.jour && !v.nuit) delete copie[iso]
      else copie[iso] = v
      return copie
    })

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
              <span key={j}>{j === 'Dim' ? 'Dim' : j}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2.5">
            {cases.map((iso, i) =>
              iso ? (
                <CaseJour key={iso} iso={iso} valeur={brouillon[iso]} onClick={() => setJourOuvert(iso)} />
              ) : (
                <span key={'v' + i} />
              ),
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-nuit-900">
          {STATUTS.map((s) => (
            <span key={s} className="flex items-center gap-2">
              <span className={`h-3.5 w-3.5 rounded-full ${COULEUR[s]}`} />
              {LIBELLE[s]}
            </span>
          ))}
        </div>
        <p className="mt-2 text-center text-xs text-nuit-600">Touchez un jour pour choisir. Case coupée : haut = journée, bas = nuit.</p>

        <div className="mt-auto pt-8">
          <button
            onClick={() => {
              setDisponibilites(brouillon)
              afficherMessage('Disponibilités enregistrées (démo)')
            }}
            className="w-full rounded-xl bg-or-500 py-4 text-[15px] font-bold text-nuit-900 shadow-sm"
          >
            Enregistrer mes disponibilités
          </button>
        </div>
      </Feuille>
      {jourOuvert && (
        <FeuilleChoix
          iso={jourOuvert}
          valeur={brouillon[jourOuvert] ?? {}}
          changer={(v) => changerJour(jourOuvert, v)}
          fermer={() => setJourOuvert(null)}
        />
      )}
    </EcranAgent>
  )
}
