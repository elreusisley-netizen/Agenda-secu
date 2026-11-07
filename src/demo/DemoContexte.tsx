/*
  État de démonstration gardé en mémoire (perdu si on recharge la page).
  À l'étape 3, ce fichier sera remplacé par les appels à Supabase.
*/
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CRENEAUX_INITIAUX,
  DISPONIBILITES_INITIALES,
  MISSIONS_AGENT_INITIALES,
  type CreneauPlanning,
  type Disponibilites,
  type MissionAgent,
  type StatutAffectation,
} from './donnees-demo'

interface Contexte {
  missions: MissionAgent[]
  repondre: (id: string, statut: StatutAffectation) => void
  disponibilites: Disponibilites
  setDisponibilites: (d: Disponibilites) => void
  creneaux: CreneauPlanning[]
  ajouterCreneau: (c: Omit<CreneauPlanning, 'id'>) => void
  reinitialiser: () => void
  message: string | null
  afficherMessage: (texte: string) => void
}

const Ctx = createContext<Contexte | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [missions, setMissions] = useState(MISSIONS_AGENT_INITIALES)
  const [disponibilites, setDisponibilites] = useState<Disponibilites>(DISPONIBILITES_INITIALES)
  const [creneaux, setCreneaux] = useState(CRENEAUX_INITIAUX)
  const [message, setMessage] = useState<string | null>(null)
  const minuteur = useRef<number | undefined>(undefined)

  const afficherMessage = useCallback((texte: string) => {
    setMessage(texte)
    window.clearTimeout(minuteur.current)
    minuteur.current = window.setTimeout(() => setMessage(null), 2600)
  }, [])

  const valeur = useMemo<Contexte>(
    () => ({
      missions,
      repondre: (id, statut) => setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, statut } : m))),
      disponibilites,
      setDisponibilites,
      creneaux,
      ajouterCreneau: (c) => setCreneaux((cs) => [...cs, { ...c, id: 'n' + Date.now() }]),
      reinitialiser: () => {
        setMissions(MISSIONS_AGENT_INITIALES)
        setDisponibilites(DISPONIBILITES_INITIALES)
        setCreneaux(CRENEAUX_INITIAUX)
      },
      message,
      afficherMessage,
    }),
    [missions, disponibilites, creneaux, message, afficherMessage],
  )

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>
}

export function useDemo(): Contexte {
  const c = useContext(Ctx)
  if (!c) throw new Error('useDemo doit être utilisé dans DemoProvider')
  return c
}
