import { LuClock } from 'react-icons/lu'
import { CadreAdmin, RUBRIQUES, type RubriqueAdmin } from '../../components/admin/CadreAdmin'
import { Lien } from '../../lib/routeur'

// Ce que chaque rubrique permettra (texte destiné aux utilisateurs).
const DESCRIPTIONS: Partial<Record<RubriqueAdmin, string>> = {
  agents: 'Retrouvez ici la liste de vos agents, leur fiche, et gérez l’ajout, la modification ou la désactivation des comptes.',
  missions: 'Créez vos missions, proposez-les aux agents et suivez leurs réponses.',
  disponibilites: 'Consultez d’un coup d’œil les disponibilités de chaque agent, en journée et de nuit.',
  sites: 'Enregistrez vos clients et leurs sites : adresse, accès, consignes et contact sur place.',
  rapports: 'Statistiques d’activité et export des plannings en PDF ou Excel.',
  parametres: 'Comptes des chefs d’équipe et leurs droits, réglages de l’entreprise et historique des modifications.',
}

/** Rubrique pas encore active : message « Bientôt disponible ». */
export default function EcranAVenir({ rubrique }: { rubrique: RubriqueAdmin }) {
  const titre = RUBRIQUES.find((r) => r.id === rubrique)?.libelle ?? ''
  return (
    <CadreAdmin actif={rubrique}>
      <h1 className="mb-5 text-[22px] font-bold text-nuit-900">{titre}</h1>
      <div className="max-w-xl rounded-2xl border border-trait bg-fond/60 p-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-or-500 px-3 py-1 text-xs font-bold text-nuit-900">
          <LuClock className="h-3.5 w-3.5" /> Bientôt disponible
        </span>
        <p className="mt-4 text-[15px] text-nuit-900">{DESCRIPTIONS[rubrique]}</p>
        <Lien vers="/admin/plannings" className="mt-5 inline-block rounded-lg bg-nuit-900 px-4 py-2 text-sm font-bold text-white">
          Voir le planning des missions
        </Lien>
      </div>
    </CadreAdmin>
  )
}
