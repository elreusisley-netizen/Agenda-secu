// Logo AGENDA SECU : coche jaune suivie du nom (validé à l'étape 1).

export function Coche({ className = 'h-8 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 36" className={className} aria-hidden="true">
      <path d="M2 19.5 10.5 13l7 9.2L36.8 2.5 42.5 8.6 17.8 33.5Z" fill="#ffc414" />
      <path d="M17.8 33.5 42.5 8.6 39.6 5.5 17.5 27.6Z" fill="#e9ad00" />
    </svg>
  )
}

export function Logo({ taille = 'normal', clair = true }: { taille?: 'petit' | 'normal' | 'grand'; clair?: boolean }) {
  const styles = {
    petit: { coche: 'h-5 w-6', texte: 'text-[15px]' },
    normal: { coche: 'h-7 w-8', texte: 'text-xl' },
    grand: { coche: 'h-10 w-12', texte: 'text-[28px]' },
  }[taille]
  return (
    <span className="inline-flex items-center gap-2">
      <Coche className={styles.coche} />
      <span className={`${styles.texte} font-extrabold tracking-tight ${clair ? 'text-white' : 'text-nuit-900'}`}>
        AGENDA SECU
      </span>
    </span>
  )
}
