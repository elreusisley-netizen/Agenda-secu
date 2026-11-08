/* Enregistrement d'un fichier : partage (téléphone) ou téléchargement (ordinateur). */
export async function telecharger(blob: Blob, nom: string): Promise<void> {
  const fichier = new File([blob], nom, { type: blob.type })
  const mobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent)
  try {
    if (mobile && navigator.canShare?.({ files: [fichier] })) {
      await navigator.share({ files: [fichier], title: nom })
      return
    }
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') return // l'utilisateur a fermé le menu de partage
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nom
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** Nom de fichier sans accents ni caractères spéciaux. */
export const nomFichier = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9_-]+/g, '_')
    .replace(/^_|_$/g, '')
