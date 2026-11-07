import { CadreAdmin, RUBRIQUES, type RubriqueAdmin } from '../../components/admin/CadreAdmin'
import { Lien } from '../../lib/routeur'

const ETAPES: Partial<Record<RubriqueAdmin, { etape: string; contenu: string }>> = {
  agents: { etape: 'Étape 7', contenu: 'Liste des agents, fiche agent, ajout, modification, désactivation et réactivation.' },
  missions: { etape: 'Étape 9', contenu: 'Liste des missions, création, envoi des propositions et suivi des réponses.' },
  disponibilites: { etape: 'Étape 11', contenu: 'Grille agents × jours en vert, rouge et orange, par journée et par nuit, avec relance des retardataires.' },
  sites: { etape: 'Étape 8', contenu: 'Onglets Clients et Sites, fiche site avec accès, consignes et contact sur place.' },
  rapports: { etape: 'Étape 13', contenu: 'Statistiques et exports PDF et Excel.' },
  parametres: { etape: 'Étapes 5 et 7', contenu: 'Comptes chefs et leurs droits, réglages de l’entreprise, historique complet.' },
}

/** Rubrique du menu dont l'écran n'a pas encore de maquette : page d'attente explicite, pas de faux contenu. */
export default function EcranAVenir({ rubrique }: { rubrique: RubriqueAdmin }) {
  const titre = RUBRIQUES.find((r) => r.id === rubrique)?.libelle ?? ''
  const info = ETAPES[rubrique]
  return (
    <CadreAdmin actif={rubrique}>
      <h1 className="mb-5 text-[22px] font-bold text-nuit-900">{titre}</h1>
      <div className="max-w-xl rounded-2xl border border-dashed border-trait bg-fond/60 p-6">
        <p className="text-xs font-bold uppercase tracking-wide text-or-600">{info?.etape ?? 'Plus tard'}</p>
        <p className="mt-2 text-[15px] text-nuit-900">{info?.contenu}</p>
        <p className="mt-3 text-sm text-nuit-600">
          Cet écran n’existe pas sur les maquettes : je le dessinerai dans le même style et te le montrerai avant de le développer.
        </p>
        <Lien vers="/admin/plannings" className="mt-5 inline-block rounded-lg bg-or-500 px-4 py-2 text-sm font-bold text-nuit-900">
          Voir le planning des missions
        </Lien>
      </div>
    </CadreAdmin>
  )
}
