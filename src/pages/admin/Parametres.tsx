import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { LuPlus, LuTriangleAlert, LuX } from 'react-icons/lu'
import { CadreAdmin } from '../../components/admin/CadreAdmin'
import { useDemo } from '../../demo/DemoContexte'
import { AUCUN_DROIT, DROITS, type Droit, type Droits } from '../../lib/droits'
import { gererComptes, modeDemo, supabase } from '../../lib/supabase'

const MAX_CHEFS = 5

interface Chef {
  id: string
  prenom: string
  nom: string
  email: string
  actif: boolean
  droits: Droits
}

async function chargerChefs(): Promise<Chef[]> {
  const { data: profils, error } = await supabase!
    .from('profils')
    .select('id, prenom, nom, email, actif')
    .eq('role', 'chef')
    .order('nom')
  if (error) throw error
  const ids = (profils ?? []).map((p) => p.id)
  const { data: perms } = ids.length
    ? await supabase!.from('permissions_chefs').select('*').in('chef_id', ids)
    : { data: [] as Record<string, unknown>[] }
  return (profils ?? []).map((p) => {
    const ligne = (perms ?? []).find((x) => x.chef_id === p.id) as Record<string, unknown> | undefined
    const droits = { ...AUCUN_DROIT }
    for (const d of DROITS) droits[d.id] = Boolean(ligne?.[d.id])
    return { ...p, droits } as Chef
  })
}

function Interrupteur({ actif, onChange, libelle }: { actif: boolean; onChange: () => void; libelle: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={actif}
      aria-label={libelle}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${actif ? 'bg-or-500' : 'bg-trait'}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${actif ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

function FormulaireChef({ fermer, apresCreation }: { fermer: () => void; apresCreation: (c: Chef) => void }) {
  const [prenom, setPrenom] = useState('')
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [mode, setMode] = useState<'motdepasse' | 'invitation'>('motdepasse')
  const [motDePasse, setMotDePasse] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const valider = async (e: FormEvent) => {
    e.preventDefault()
    setErreur(null)
    if (mode === 'motdepasse' && (motDePasse.length < 8 || !/[a-zA-Z]/.test(motDePasse) || !/\d/.test(motDePasse))) {
      return setErreur('Mot de passe provisoire : 8 caractères minimum, avec lettres et chiffres.')
    }
    setEnCours(true)
    const res = await gererComptes({
      action: 'creer',
      role: 'chef',
      prenom,
      nom,
      email,
      ...(mode === 'motdepasse' ? { motDePasse } : { redirectTo: window.location.origin + '/' }),
    })
    setEnCours(false)
    if (res.erreur) return setErreur(res.erreur)
    apresCreation({ id: res.id ?? 'nouveau', prenom, nom, email: email.trim().toLowerCase(), actif: true, droits: { ...AUCUN_DROIT } })
  }

  const champ = 'mt-1 w-full rounded-lg border border-trait bg-white px-3 py-2.5 text-sm outline-none focus:border-or-500'

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={fermer} role="dialog" aria-modal="true">
      <form onSubmit={valider} onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-nuit-900">Ajouter un chef d’équipe</h2>
          <button type="button" onClick={fermer} aria-label="Fermer" className="p-1">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 text-[13px] font-medium text-nuit-700">
          <label>
            Prénom
            <input required value={prenom} onChange={(e) => setPrenom(e.target.value)} className={champ} autoComplete="off" />
          </label>
          <label>
            Nom
            <input required value={nom} onChange={(e) => setNom(e.target.value)} className={champ} autoComplete="off" />
          </label>
          <label className="col-span-2">
            Adresse e-mail
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={champ} autoComplete="off" />
          </label>
        </div>

        <fieldset className="mt-4 space-y-2 text-sm">
          <legend className="mb-2 text-[13px] font-medium text-nuit-700">Accès au compte</legend>
          <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === 'motdepasse' ? 'border-or-500 bg-or-300/15' : 'border-trait'}`}>
            <input type="radio" name="mode" checked={mode === 'motdepasse'} onChange={() => setMode('motdepasse')} className="mt-1 accent-[#ffc414]" />
            <span>
              <b className="block text-nuit-900">Mot de passe provisoire</b>
              <span className="text-nuit-600">Vous le communiquez au chef, qui pourra le changer avec « Mot de passe oublié ».</span>
            </span>
          </label>
          {mode === 'motdepasse' && (
            <input
              type="text"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              placeholder="8 caractères, lettres et chiffres"
              className={champ}
              autoComplete="new-password"
            />
          )}
          <label className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${mode === 'invitation' ? 'border-or-500 bg-or-300/15' : 'border-trait'}`}>
            <input type="radio" name="mode" checked={mode === 'invitation'} onChange={() => setMode('invitation')} className="mt-1 accent-[#ffc414]" />
            <span>
              <b className="block text-nuit-900">Invitation par e-mail</b>
              <span className="text-nuit-600">Le chef reçoit un lien pour choisir lui-même son mot de passe.</span>
            </span>
          </label>
        </fieldset>

        {erreur && (
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[13px] text-red-800">
            <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {erreur}
          </p>
        )}
        <p className="mt-3 text-xs text-nuit-600">Le nouveau chef n’a aucun droit au départ : cochez ensuite ce qu’il peut voir et faire.</p>
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

export default function Parametres() {
  const { afficherMessage } = useDemo()
  const [chefs, setChefs] = useState<Chef[]>([])
  const [chargement, setChargement] = useState(!modeDemo)
  const [erreur, setErreur] = useState<string | null>(null)
  const [formulaire, setFormulaire] = useState(false)

  const recharger = useCallback(async () => {
    if (modeDemo) return
    try {
      setChefs(await chargerChefs())
      setErreur(null)
    } catch {
      setErreur('Impossible de charger les chefs d’équipe. Vérifiez votre connexion.')
    } finally {
      setChargement(false)
    }
  }, [])

  useEffect(() => {
    recharger()
  }, [recharger])

  const basculerDroit = async (chef: Chef, droit: Droit) => {
    const valeur = !chef.droits[droit]
    setChefs((cs) => cs.map((c) => (c.id === chef.id ? { ...c, droits: { ...c.droits, [droit]: valeur } } : c)))
    if (modeDemo) return
    const { error } = await supabase!.from('permissions_chefs').update({ [droit]: valeur }).eq('chef_id', chef.id)
    if (error) {
      setChefs((cs) => cs.map((c) => (c.id === chef.id ? { ...c, droits: { ...c.droits, [droit]: !valeur } } : c)))
      afficherMessage('Modification non enregistrée')
    }
  }

  const basculerActif = async (chef: Chef) => {
    const res = await gererComptes({ action: chef.actif ? 'desactiver' : 'reactiver', id: chef.id })
    if (res.erreur) return afficherMessage(res.erreur)
    setChefs((cs) => cs.map((c) => (c.id === chef.id ? { ...c, actif: !c.actif } : c)))
    afficherMessage(chef.actif ? 'Compte désactivé' : 'Compte réactivé')
  }

  const complet = chefs.length >= MAX_CHEFS

  return (
    <CadreAdmin actif="parametres">
      <h1 className="mb-5 text-[22px] font-bold text-nuit-900">Paramètres</h1>

      <section className="max-w-4xl">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[17px] font-bold text-nuit-900">Chefs d’équipe</h2>
            <p className="text-[13px] text-nuit-600">
              {chefs.length} / {MAX_CHEFS} comptes — chaque droit s’applique immédiatement.
            </p>
          </div>
          <button
            onClick={() => setFormulaire(true)}
            disabled={complet}
            className="flex items-center gap-1.5 rounded-lg bg-or-500 px-3.5 py-2 text-[13px] font-bold text-nuit-900 shadow-sm disabled:opacity-50"
            title={complet ? 'Limite de 5 chefs atteinte' : undefined}
          >
            <LuPlus className="h-4 w-4" /> Ajouter un chef
          </button>
        </div>

        {erreur && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
        {chargement && <p className="py-8 text-center text-sm text-nuit-600">Chargement…</p>}
        {!chargement && chefs.length === 0 && !erreur && (
          <div className="rounded-2xl border border-dashed border-trait p-8 text-center text-sm text-nuit-600">
            Aucun chef d’équipe pour le moment.
          </div>
        )}

        <div className="space-y-4">
          {chefs.map((chef) => (
            <article key={chef.id} className={`rounded-2xl border border-trait bg-white p-4 ${chef.actif ? '' : 'opacity-70'}`}>
              <header className="mb-3 flex flex-wrap items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-nuit-900 text-sm font-bold text-or-500">
                  {(chef.prenom[0] ?? '').toUpperCase()}
                  {(chef.nom[0] ?? '').toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-nuit-900">
                    {chef.prenom} {chef.nom}
                  </p>
                  <p className="truncate text-[13px] text-nuit-600">{chef.email}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${chef.actif ? 'bg-confirme-fond text-confirme-texte' : 'bg-indispo/40 text-indispo-fonce'}`}>
                  {chef.actif ? 'Actif' : 'Désactivé'}
                </span>
                <button onClick={() => basculerActif(chef)} className="rounded-lg bg-fond px-3 py-1.5 text-[13px] font-semibold text-nuit-900">
                  {chef.actif ? 'Désactiver' : 'Réactiver'}
                </button>
              </header>
              <ul className="grid gap-x-6 sm:grid-cols-2">
                {DROITS.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3 border-t border-trait py-2.5">
                    <span>
                      <span className="block text-sm font-semibold text-nuit-900">{d.libelle}</span>
                      <span className="block text-xs text-nuit-600">{d.aide}</span>
                    </span>
                    <Interrupteur actif={chef.droits[d.id]} onChange={() => basculerDroit(chef, d.id)} libelle={`${d.libelle} — ${chef.prenom} ${chef.nom}`} />
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-trait bg-fond/60 p-4 text-sm text-nuit-700">
          <b className="text-nuit-900">Réglages de l’entreprise et historique des modifications</b> : bientôt disponibles.
        </div>
      </section>

      {formulaire && (
        <FormulaireChef
          fermer={() => setFormulaire(false)}
          apresCreation={(c) => {
            setFormulaire(false)
            afficherMessage('Chef créé : cochez maintenant ses droits')
            if (modeDemo) setChefs((cs) => [...cs, c])
            else recharger()
          }}
        />
      )}
    </CadreAdmin>
  )
}
