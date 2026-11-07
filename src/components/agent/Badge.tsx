const STYLES: Record<string, { classe: string; texte: string }> = {
  confirmee: { classe: 'bg-confirme-fond text-confirme-texte', texte: 'Confirmée' },
  acceptee: { classe: 'bg-attente/40 text-attente-fonce', texte: 'En attente de confirmation' },
  proposee: { classe: 'bg-or-300/50 text-nuit-900', texte: 'Proposée' },
  refusee: { classe: 'bg-indispo/40 text-indispo-fonce', texte: 'Refusée' },
  annulee: { classe: 'bg-trait text-nuit-700', texte: 'Annulée' },
}

export function BadgeStatut({ statut }: { statut: string }) {
  const s = STYLES[statut] ?? { classe: 'bg-trait text-nuit-700', texte: statut }
  return <span className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${s.classe}`}>{s.texte}</span>
}
