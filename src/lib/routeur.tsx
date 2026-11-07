/*
  Petit routeur maison.
  L'écran affiché est gardé en mémoire ; l'adresse du navigateur (…/#/agent/missions)
  est mise à jour quand c'est possible, mais l'application ne dépend jamais d'elle :
  elle fonctionne donc aussi dans un cadre restreint (aperçu, appli installée).
*/
import { useEffect, useState, type AnchorHTMLAttributes, type MouseEvent } from 'react'
import { lienAuth } from './lienAuth'

const ACCUEIL = lienAuth.type ? '/nouveau-mot-de-passe' : '/connexion'

function lireAdresse(): string | null {
  try {
    const h = window.location.hash.replace(/^#/, '')
    return h.startsWith('/') ? h : null
  } catch {
    return null
  }
}

let cheminCourant = lienAuth.type ? ACCUEIL : (lireAdresse() ?? ACCUEIL)
const pile: string[] = []
const abonnes = new Set<(c: string) => void>()

function appliquer(chemin: string) {
  cheminCourant = chemin
  abonnes.forEach((f) => f(chemin))
  try {
    window.scrollTo(0, 0)
  } catch {
    /* rien */
  }
}

function ecrireAdresse(chemin: string, remplacer: boolean) {
  try {
    if (remplacer) window.history.replaceState(null, '', '#' + chemin)
    else window.history.pushState(null, '', '#' + chemin)
  } catch {
    /* adresse non modifiable ici : sans importance */
  }
}

export function naviguer(chemin: string, remplacer = false) {
  if (chemin === cheminCourant) return
  if (!remplacer) pile.push(cheminCourant)
  ecrireAdresse(chemin, remplacer)
  appliquer(chemin)
}

/** Revient à l'écran précédent, ou à `secours` s'il n'y en a pas. */
export function retour(secours: string) {
  const precedent = pile.pop() ?? secours
  ecrireAdresse(precedent, true)
  appliquer(precedent)
}

export function useChemin(): string {
  const [chemin, setChemin] = useState(cheminCourant)
  useEffect(() => {
    abonnes.add(setChemin)
    // Boutons « précédent / suivant » du navigateur, quand l'adresse est disponible
    const surAdresse = () => {
      const a = lireAdresse()
      if (a && a !== cheminCourant) {
        pile.pop()
        appliquer(a)
      }
    }
    window.addEventListener('popstate', surAdresse)
    window.addEventListener('hashchange', surAdresse)
    return () => {
      abonnes.delete(setChemin)
      window.removeEventListener('popstate', surAdresse)
      window.removeEventListener('hashchange', surAdresse)
    }
  }, [])
  return chemin
}

/** Compare un chemin à un motif comme « /agent/missions/:id ». Renvoie les paramètres ou null. */
export function correspond(motif: string, chemin: string): Record<string, string> | null {
  const a = motif.split('/').filter(Boolean)
  const b = chemin.split('?')[0].split('/').filter(Boolean)
  if (a.length !== b.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < a.length; i++) {
    if (a[i].startsWith(':')) params[a[i].slice(1)] = decodeURIComponent(b[i])
    else if (a[i] !== b[i]) return null
  }
  return params
}

type LienProps = AnchorHTMLAttributes<HTMLAnchorElement> & { vers: string }

export function Lien({ vers, onClick, ...reste }: LienProps) {
  const clic = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return
    e.preventDefault()
    naviguer(vers)
  }
  return <a href={'#' + vers} onClick={clic} {...reste} />
}
