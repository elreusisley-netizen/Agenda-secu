import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { LuChevronRight, LuPlus, LuSearch, LuTriangleAlert, LuX } from 'react-icons/lu'
import { CadreAdmin } from '../../components/admin/CadreAdmin'
import { useAuth } from '../../auth/AuthContexte'
import { useDemo } from '../../demo/DemoContexte'
import { ajouterAgentDemo, enregistrerAgent, etatCarte, listerAgents, type Agent } from '../../lib/agents'
import { gererComptes, modeDemo } from '../../lib/supabase'
import { Lien, naviguer } from '../../lib/routeur'

export function BadgeCarte({ expiration }: { expiration: string | null }) {
  const etat = etatCarte(expiration)
  if (etat === 'expiree') return <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700">Carte pro expirée</span>
  if (etat === 'bientot') return <span className="rounded-full bg-attente/40 px-2 py-0.5 text-[11px] font-semibold text-attente-fonce">Carte pro bientôt expirée</span>
  return null
}

export function Initiales({ prenom, nom, grand }: { prenom: string; nom: string; grand?: boolean }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-nuit-900 font-bold text-or-500 ${grand ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm'}`}>
      {(prenom[0] ?? '').toUpperCase()}
      {(nom[0] ?? '').toUpperCase()}
    </span>
  )
}

function FormulaireAgent({ fermer, apresCreation }: { fermer: () => void; apresCreation: (id: string) => void }) {
  const [f, setF] = useState({ prenom: '', nom: '', email: '', telephone: '', matricule: '', motDePasse: '' })
  const [mode, setMode] = useState<'motdepasse' | 'invitation'>('motdepasse')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const maj = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    setErreur(null)
    if (mode === 'motdepasse' && (f.motDePasse.length < 8 || !/[a-zA-Z]/.test(f.motDePasse) || !/\d/.test(f.motDePasse))) {
      return setErreur('Mot de passe provisoire : 8 caractères minimum, avec lettres et chiffres.')
    }
    setEnCours(true)
    const res = await gererComptes({
      action: 'creer',
      role: 'agent',
      prenom: f.prenom,
      nom: f.nom,
      email: f.email,
      ...(mode === 'motdepasse' ? { motDePasse: f.motDePasse } : { redirectTo: window.location.origin + '/' }),
    })
    if (res.erreur || !res.id) {
      setEnCours(false)
      return setErreur(res.erreur ?? 'Création impossible.')
    }
    const agent: Agent = {
      id: res.id,
      prenom: f.prenom.trim(),
      nom: f.nom.trim(),
      email: f.email.trim().toLowerCase(),
      telephone: f.telephone || null,
      actif: true,
      matricule: f.matricule || null,
      carte_pro_numero: null,
      carte_pro_expiration: null,
      qualifications: [],
      type_contrat: null,
      notes_internes: null,
    }
    if (modeDemo) ajouterAgentDemo(agent)
    else if (f.telephone || f.matricule) {
      const err = await enregistrerAgent(agent)
      if (err) setErreur(`Compte créé, mais : ${err}`)
    }
    setEnCours(false)
    apresCreation(res.id)
  }

  const champ = 'mt-1 w-full rounded-lg border border-trait bg-white px-3 py-2.5 text-sm outline-none focus:border-or-500'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={fermer} role="dialog" aria-modal="true">
      <form onSubmit={valider} onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-nuit-900">Ajouter un agent</h2>
          <button type="button" onClick={fermer} aria-label="Fermer" className="p-1">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[13px] font-medium text-nuit-700">
          <label>
            Prénom
            <input required value={f.prenom} onChange={maj('prenom')} className={champ} autoComplete="off" />
          </label>
          <label>
            Nom
            <input required value={f.nom} onChange={maj('nom')} className={champ} autoComplete="off" />
          </label>
          <label className="col-span-2">
            Adresse e-mail
            <input required type="email" value={f.email} onChange={maj('email')} className={champ} autoComplete="off" />
          </label>
          <label>
            Téléphone
            <input type="tel" value={f.telephone} onChange={maj('telephone')} className={champ} placeholder="Facultatif" />
          </label>
          <label>
            Matricule
            <input value={f.matricule} onChange={maj('matricule')} className={champ} placeholder="Facultatif" />
          </label>
        </div>

        <fieldset className="mt-4 space-y-2 text-sm">
          <legend className="mb-2 text-[13px] font-medium text-nuit-700">Accès au compte</legend>
          <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === 'motdepasse' ? 'border-or-500 bg-or-300/15' : 'border-trait'}`}>
            <input type="radio" name="mode" checked={mode === 'motdepasse'} onChange={() => setMode('motdepasse')} className="mt-1 accent-[#ffc414]" />
            <span>
              <b className="block text-nuit-900">Mot de passe provisoire</b>
              <span className="text-nuit-600">Vous le communiquez à l’agent.</span>
            </span>
          </label>
          {mode === 'motdepasse' && (
            <input type="text" value={f.motDePasse} onChange={maj('motDePasse')} placeholder="8 caractères, lettres et chiffres" className={champ} autoComplete="new-password" />
          )}
          <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === 'invitation' ? 'border-or-500 bg-or-300/15' : 'border-trait'}`}>
            <input type="radio" name="mode" checked={mode === 'invitation'} onChange={() => setMode('invitation')} className="mt-1 accent-[#ffc414]" />
            <span>
              <b className="block text-nuit-900">Invitation par e-mail</b>
              <span className="text-nuit-600">L’agent reçoit un lien pour choisir son mot de passe.</span>
            </span>
          </label>
        </fieldset>

        {erreur && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[13px] text-red-800">
            <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {erreur}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={fermer} className="rounded-xl bg-fond px-4 py-2.5 text-sm font-semibold">
            Annuler
          </button>
          <button type="submit" disabled={enCours} className="rounded-xl bg-or-500 px-4 py-2.5 text-sm font-bold text-nuit-900 disabled:opacity-60">
            {enCours ? 'Création…' : 'Créer le compte'}
          </button>
        </div>
      </form>
    </div>
  )
}

type Filtre = 'actifs' | 'desactives' | 'tous'

export default function Agents() {
  const { profil } = useAuth()
  const { afficherMessage } = useDemo()
  const admin = profil?.role === 'admin'
  const [agents, setAgents] = useState<Agent[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [filtre, setFiltre] = useState<Filtre>('actifs')
  const [formulaire, setFormulaire] = useState(false)

  useEffect(() => {
    listerAgents()
      .then(setAgents)
      .catch(() => setErreur('Impossible de charger les agents. Vérifiez votre connexion.'))
  }, [])

  const visibles = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return (agents ?? [])
      .filter((a) => (filtre === 'tous' ? true : filtre === 'actifs' ? a.actif : !a.actif))
      .filter((a) => !q || [a.prenom, a.nom, a.email, a.matricule ?? '', a.telephone ?? ''].join(' ').toLowerCase().includes(q))
      .sort((a, b) => (a.nom + a.prenom).localeCompare(b.nom + b.prenom, 'fr'))
  }, [agents, recherche, filtre])

  const nb = (f: Filtre) => (agents ?? []).filter((a) => (f === 'tous' ? true : f === 'actifs' ? a.actif : !a.actif)).length

  return (
    <CadreAdmin actif="agents">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-nuit-900">Agents</h1>
        {admin && (
          <button onClick={() => setFormulaire(true)} className="flex items-center gap-1.5 rounded-lg bg-or-500 px-3.5 py-2 text-[13px] font-bold text-nuit-900 shadow-sm">
            <LuPlus className="h-4 w-4" /> Ajouter un agent
          </button>
        )}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-trait bg-white px-3 py-2.5 sm:w-auto sm:max-w-sm sm:flex-1">
          <LuSearch className="h-4 w-4 shrink-0 text-nuit-600" />
          <input
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Nom, e-mail, matricule…"
            className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-nuit-600"
          />
        </label>
        <div className="flex gap-1 text-[12px] font-semibold">
          {(['actifs', 'desactives', 'tous'] as Filtre[]).map((f) => (
            <button key={f} onClick={() => setFiltre(f)} className={`rounded-md px-3 py-1.5 ${filtre === f ? 'bg-or-500 text-nuit-900' : 'text-nuit-700 hover:bg-fond'}`}>
              {f === 'actifs' ? 'Actifs' : f === 'desactives' ? 'Désactivés' : 'Tous'} ({nb(f)})
            </button>
          ))}
        </div>
      </div>

      {erreur && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {!agents && !erreur && <p className="py-10 text-center text-sm text-nuit-600">Chargement…</p>}
      {agents && visibles.length === 0 && (
        <div className="rounded-2xl border border-dashed border-trait p-8 text-center text-sm text-nuit-600">
          {agents.length === 0 ? 'Aucun agent pour le moment.' : 'Aucun agent ne correspond à votre recherche.'}
        </div>
      )}

      {visibles.length > 0 && (
      <ul className="divide-y divide-trait overflow-hidden rounded-2xl border border-trait bg-white">
        {visibles.map((a) => (
          <li key={a.id}>
            <Lien vers={`/admin/agents/${a.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-fond/60">
              <Initiales prenom={a.prenom} nom={a.nom} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-nuit-900">
                  {a.prenom} {a.nom}
                  {a.matricule && <span className="ml-2 text-[12px] font-medium text-nuit-600">{a.matricule}</span>}
                </p>
                <p className="truncate text-[13px] text-nuit-600">
                  {a.email}
                  {a.telephone ? ` · ${a.telephone}` : ''}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {!a.actif && <span className="rounded-full bg-indispo/40 px-2 py-0.5 text-[11px] font-semibold text-indispo-fonce">Désactivé</span>}
                  <BadgeCarte expiration={a.carte_pro_expiration} />
                </div>
              </div>
              <LuChevronRight className="h-5 w-5 shrink-0 text-nuit-600" />
            </Lien>
          </li>
        ))}
      </ul>
      )}

      {formulaire && (
        <FormulaireAgent
          fermer={() => setFormulaire(false)}
          apresCreation={(id) => {
            setFormulaire(false)
            afficherMessage('Agent créé')
            naviguer(`/admin/agents/${id}`)
          }}
        />
      )}
    </CadreAdmin>
  )
}
