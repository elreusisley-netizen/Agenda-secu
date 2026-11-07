import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { LuBuilding2, LuChevronRight, LuMapPin, LuPhone, LuPlus, LuSearch, LuTriangleAlert, LuX } from 'react-icons/lu'
import { CadreAdmin } from '../../components/admin/CadreAdmin'
import { useAuth } from '../../auth/AuthContexte'
import { useDemo } from '../../demo/DemoContexte'
import {
  CLIENT_VIDE,
  SITE_VIDE,
  adresseComplete,
  enregistrerClient,
  enregistrerSite,
  supprimerClient,
  supprimerSite,
  lienItineraire,
  listerClients,
  listerSites,
  type Client,
  type Site,
} from '../../lib/clients'

type Onglet = 'sites' | 'clients'

// ---------- Éléments communs ----------
function Fenetre({ titre, fermer, children }: { titre: string; fermer: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={fermer} role="dialog" aria-modal="true">
      <div onClick={(e) => e.stopPropagation()} className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-nuit-900">{titre}</h2>
          <button type="button" onClick={fermer} aria-label="Fermer" className="p-1">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const CHAMP = 'mt-1 w-full rounded-lg border border-trait bg-white px-3 py-2.5 text-sm text-nuit-900 outline-none focus:border-or-500 disabled:bg-fond'

function Champ({ libelle, children, large }: { libelle: string; children: ReactNode; large?: boolean }) {
  return (
    <label className={`text-[13px] font-medium text-nuit-700 ${large ? 'col-span-2' : 'col-span-2 sm:col-span-1'}`}>
      {libelle}
      {children}
    </label>
  )
}

function Erreur({ texte }: { texte: string | null }) {
  if (!texte) return null
  return (
    <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-[13px] text-red-800">
      <LuTriangleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {texte}
    </p>
  )
}

function Boutons({
  modifiable,
  enCours,
  fermer,
  archiver,
  actif,
  supprimer,
}: {
  modifiable: boolean
  enCours: boolean
  fermer: () => void
  archiver?: () => void
  actif?: boolean
  supprimer?: () => void
}) {
  const [confirmation, setConfirmation] = useState(false)
  if (!modifiable) {
    return (
      <div className="mt-4 flex justify-end">
        <button type="button" onClick={fermer} className="rounded-xl bg-fond px-4 py-2.5 text-sm font-semibold">
          Fermer
        </button>
      </div>
    )
  }
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
      {archiver ? (
        <div className="flex flex-wrap items-center gap-1">
          <button type="button" onClick={archiver} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-nuit-700">
            {actif ? 'Archiver' : 'Réactiver'}
          </button>
          {supprimer &&
            (confirmation ? (
              <span className="flex items-center gap-1 rounded-xl bg-red-50 px-2 py-1">
                <span className="text-[12px] text-red-800">Supprimer définitivement ?</span>
                <button type="button" onClick={supprimer} className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[12px] font-bold text-white">
                  Oui
                </button>
                <button type="button" onClick={() => setConfirmation(false)} className="rounded-lg px-2 py-1.5 text-[12px] font-semibold text-nuit-700">
                  Non
                </button>
              </span>
            ) : (
              <button type="button" onClick={() => setConfirmation(true)} className="rounded-xl px-3 py-2.5 text-sm font-semibold text-red-700">
                Supprimer
              </button>
            ))}
        </div>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <button type="button" onClick={fermer} className="rounded-xl bg-fond px-4 py-2.5 text-sm font-semibold">
          Annuler
        </button>
        <button type="submit" disabled={enCours} className="rounded-xl bg-or-500 px-4 py-2.5 text-sm font-bold text-nuit-900 disabled:opacity-60">
          {enCours ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}

// ---------- Formulaire site ----------
function FormulaireSite({
  site,
  clients,
  modifiable,
  fermer,
  apres,
}: {
  site: Site | Omit<Site, 'id'>
  clients: Client[]
  modifiable: boolean
  fermer: () => void
  apres: (message: string) => void
}) {
  const [f, setF] = useState(site)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const nouveau = !('id' in site)
  const maj = (k: keyof Site) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))

  const sauver = async (valeur: typeof f, message: string) => {
    setEnCours(true)
    setErreur(null)
    const err = await enregistrerSite(valeur)
    setEnCours(false)
    if (err) return setErreur(err)
    apres(message)
  }

  return (
    <Fenetre titre={nouveau ? 'Ajouter un site' : modifiable ? 'Modifier le site' : f.nom} fermer={fermer}>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          sauver(f, nouveau ? 'Site ajouté' : 'Site enregistré')
        }}
      >
        <fieldset disabled={!modifiable} className="grid grid-cols-2 gap-3">
          <Champ libelle="Client" large>
            <select value={f.client_id} onChange={maj('client_id')} className={CHAMP} required>
              <option value="">Choisir…</option>
              {clients
                .filter((c) => c.actif || c.id === f.client_id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom}
                  </option>
                ))}
            </select>
          </Champ>
          <Champ libelle="Nom du site" large>
            <input required value={f.nom} onChange={maj('nom')} className={CHAMP} placeholder="Ex. Centre commercial Nord" />
          </Champ>
          <Champ libelle="Adresse" large>
            <input required value={f.adresse} onChange={maj('adresse')} className={CHAMP} placeholder="Numéro et rue" />
          </Champ>
          <Champ libelle="Code postal">
            <input value={f.code_postal ?? ''} onChange={maj('code_postal')} className={CHAMP} inputMode="numeric" />
          </Champ>
          <Champ libelle="Ville">
            <input value={f.ville ?? ''} onChange={maj('ville')} className={CHAMP} />
          </Champ>
          <Champ libelle="Informations d’accès" large>
            <textarea rows={2} value={f.infos_acces ?? ''} onChange={maj('infos_acces')} className={CHAMP} placeholder="Entrée, badge, code, parking…" />
          </Champ>
          <Champ libelle="Consignes particulières" large>
            <textarea rows={3} value={f.consignes ?? ''} onChange={maj('consignes')} className={CHAMP} placeholder="Tenue, rondes, main courante…" />
          </Champ>
          <Champ libelle="Contact sur place">
            <input value={f.contact_nom ?? ''} onChange={maj('contact_nom')} className={CHAMP} />
          </Champ>
          <Champ libelle="Téléphone du contact">
            <input type="tel" value={f.contact_telephone ?? ''} onChange={maj('contact_telephone')} className={CHAMP} />
          </Champ>
        </fieldset>
        {f.adresse && (
          <a href={lienItineraire(f)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-or-600 underline">
            <LuMapPin className="h-4 w-4" /> Voir sur la carte
          </a>
        )}
        <Erreur texte={erreur} />
        <Boutons
          modifiable={modifiable}
          enCours={enCours}
          fermer={fermer}
          actif={f.actif}
          archiver={nouveau ? undefined : () => sauver({ ...f, actif: !f.actif }, f.actif ? 'Site archivé' : 'Site réactivé')}
          supprimer={
            nouveau
              ? undefined
              : async () => {
                  setEnCours(true)
                  const err = await supprimerSite((site as Site).id)
                  setEnCours(false)
                  if (err) return setErreur(err)
                  apres('Site supprimé')
                }
          }
        />
      </form>
    </Fenetre>
  )
}

// ---------- Formulaire client ----------
function FormulaireClient({
  client,
  sites,
  modifiable,
  fermer,
  apres,
  ajouterSite,
  ouvrirSite,
}: {
  client: Client | Omit<Client, 'id'>
  sites: Site[]
  modifiable: boolean
  fermer: () => void
  apres: (message: string) => void
  ajouterSite: (clientId: string) => void
  ouvrirSite: (s: Site) => void
}) {
  const [f, setF] = useState(client)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)
  const nouveau = !('id' in client)
  const maj = (k: keyof Client) => (e: { target: { value: string } }) => setF((x) => ({ ...x, [k]: e.target.value }))
  const sesSites = 'id' in client ? sites.filter((s) => s.client_id === client.id) : []

  const sauver = async (valeur: typeof f, message: string) => {
    setEnCours(true)
    setErreur(null)
    const err = await enregistrerClient(valeur)
    setEnCours(false)
    if (err) return setErreur(err)
    apres(message)
  }

  return (
    <Fenetre titre={nouveau ? 'Ajouter un client' : modifiable ? 'Modifier le client' : f.nom} fermer={fermer}>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          sauver(f, nouveau ? 'Client ajouté' : 'Client enregistré')
        }}
      >
        <fieldset disabled={!modifiable} className="grid grid-cols-2 gap-3">
          <Champ libelle="Nom du client" large>
            <input required value={f.nom} onChange={maj('nom')} className={CHAMP} />
          </Champ>
          <Champ libelle="Adresse" large>
            <input value={f.adresse ?? ''} onChange={maj('adresse')} className={CHAMP} />
          </Champ>
          <Champ libelle="Contact">
            <input value={f.contact_nom ?? ''} onChange={maj('contact_nom')} className={CHAMP} placeholder="Nom de l’interlocuteur" />
          </Champ>
          <Champ libelle="Téléphone">
            <input type="tel" value={f.telephone ?? ''} onChange={maj('telephone')} className={CHAMP} />
          </Champ>
          <Champ libelle="E-mail" large>
            <input type="email" value={f.email ?? ''} onChange={maj('email')} className={CHAMP} />
          </Champ>
          <Champ libelle="Informations complémentaires" large>
            <textarea rows={2} value={f.notes ?? ''} onChange={maj('notes')} className={CHAMP} />
          </Champ>
        </fieldset>

        {!nouveau && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-nuit-900">Sites de ce client ({sesSites.length})</p>
              {modifiable && 'id' in client && (
                <button type="button" onClick={() => ajouterSite(client.id)} className="flex items-center gap-1 text-[13px] font-semibold text-or-600">
                  <LuPlus className="h-4 w-4" /> Ajouter un site
                </button>
              )}
            </div>
            {sesSites.length === 0 ? (
              <p className="text-[13px] text-nuit-600">Aucun site enregistré.</p>
            ) : (
              <ul className="divide-y divide-trait rounded-xl border border-trait">
                {sesSites.map((s) => (
                  <li key={s.id}>
                    <button type="button" onClick={() => ouvrirSite(s)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-nuit-900">{s.nom}</span>
                        <span className="block truncate text-[12px] text-nuit-600">{adresseComplete(s)}</span>
                      </span>
                      <LuChevronRight className="h-4 w-4 text-nuit-600" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <Erreur texte={erreur} />
        <Boutons
          modifiable={modifiable}
          enCours={enCours}
          fermer={fermer}
          actif={f.actif}
          archiver={nouveau ? undefined : () => sauver({ ...f, actif: !f.actif }, f.actif ? 'Client archivé' : 'Client réactivé')}
          supprimer={
            nouveau
              ? undefined
              : async () => {
                  setEnCours(true)
                  const err = await supprimerClient((client as Client).id)
                  setEnCours(false)
                  if (err) return setErreur(err)
                  apres(sesSites.length ? 'Client et ses sites supprimés' : 'Client supprimé')
                }
          }
        />
      </form>
    </Fenetre>
  )
}

// ---------- Page ----------
type Ouvert = { type: 'site'; valeur: Site | Omit<Site, 'id'> } | { type: 'client'; valeur: Client | Omit<Client, 'id'> } | null

export default function SitesClients() {
  const { profil } = useAuth()
  const { afficherMessage } = useDemo()
  const admin = profil?.role === 'admin'
  const [onglet, setOnglet] = useState<Onglet>('sites')
  const [clients, setClients] = useState<Client[] | null>(null)
  const [sites, setSites] = useState<Site[] | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [recherche, setRecherche] = useState('')
  const [archives, setArchives] = useState(false)
  const [ouvert, setOuvert] = useState<Ouvert>(null)

  const recharger = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([listerClients(), listerSites()])
      setClients(c)
      setSites(s)
      setErreur(null)
    } catch {
      setErreur('Impossible de charger les clients et les sites. Vérifiez votre connexion.')
    }
  }, [])

  useEffect(() => {
    recharger()
  }, [recharger])

  const nomClient = useCallback((id: string) => clients?.find((c) => c.id === id)?.nom ?? '', [clients])
  const q = recherche.trim().toLowerCase()

  const sitesVisibles = useMemo(
    () =>
      (sites ?? [])
        .filter((s) => archives || s.actif)
        .filter((s) => !q || [s.nom, s.adresse, s.ville ?? '', nomClient(s.client_id)].join(' ').toLowerCase().includes(q)),
    [sites, archives, q, nomClient],
  )
  const clientsVisibles = useMemo(
    () => (clients ?? []).filter((c) => archives || c.actif).filter((c) => !q || [c.nom, c.contact_nom ?? '', c.email ?? ''].join(' ').toLowerCase().includes(q)),
    [clients, archives, q],
  )

  const apres = (message: string) => {
    setOuvert(null)
    afficherMessage(message)
    recharger()
  }

  const ajouter = () => {
    if (onglet === 'clients') return setOuvert({ type: 'client', valeur: { ...CLIENT_VIDE } })
    if (!clients || clients.filter((c) => c.actif).length === 0) {
      afficherMessage('Ajoutez d’abord un client')
      setOnglet('clients')
      return
    }
    setOuvert({ type: 'site', valeur: { ...SITE_VIDE } })
  }

  const charge = clients && sites

  return (
    <CadreAdmin actif="sites">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[22px] font-bold text-nuit-900">Sites / Clients</h1>
        {admin && (
          <button onClick={ajouter} className="flex items-center gap-1.5 rounded-lg bg-or-500 px-3.5 py-2 text-[13px] font-bold text-nuit-900 shadow-sm">
            <LuPlus className="h-4 w-4" /> {onglet === 'sites' ? 'Ajouter un site' : 'Ajouter un client'}
          </button>
        )}
      </div>

      <nav className="mb-3 flex gap-1 border-b border-trait text-[13px] font-semibold">
        {(['sites', 'clients'] as Onglet[]).map((o) => (
          <button
            key={o}
            onClick={() => setOnglet(o)}
            className={`-mb-px border-b-2 px-3 py-2 ${onglet === o ? 'border-or-500 text-nuit-900' : 'border-transparent text-nuit-600'}`}
          >
            {o === 'sites' ? `Sites (${(sites ?? []).filter((s) => s.actif).length})` : `Clients (${(clients ?? []).filter((c) => c.actif).length})`}
          </button>
        ))}
      </nav>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex w-full min-w-0 items-center gap-2 rounded-xl border border-trait bg-white px-3 py-2.5 sm:w-auto sm:max-w-sm sm:flex-1">
          <LuSearch className="h-4 w-4 shrink-0 text-nuit-600" />
          <input value={recherche} onChange={(e) => setRecherche(e.target.value)} placeholder="Rechercher…" className="w-full min-w-0 bg-transparent text-sm outline-none placeholder:text-nuit-600" />
        </label>
        <label className="flex items-center gap-2 text-[13px] text-nuit-700">
          <input type="checkbox" checked={archives} onChange={(e) => setArchives(e.target.checked)} className="accent-[#ffc414]" /> Afficher les archivés
        </label>
      </div>

      {erreur && <p className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{erreur}</p>}
      {!charge && !erreur && <p className="py-10 text-center text-sm text-nuit-600">Chargement…</p>}

      {charge && onglet === 'sites' && (
        sitesVisibles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-trait p-8 text-center text-sm text-nuit-600">
            {sites!.length === 0 ? 'Aucun site enregistré pour le moment.' : 'Aucun site ne correspond.'}
          </div>
        ) : (
          <ul className="divide-y divide-trait overflow-hidden rounded-2xl border border-trait bg-white">
            {sitesVisibles.map((s) => (
              <li key={s.id}>
                <button onClick={() => setOuvert({ type: 'site', valeur: s })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-fond/60">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fond text-nuit-900">
                    <LuMapPin className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-nuit-900">
                      {s.nom}
                      {!s.actif && <span className="ml-2 rounded-full bg-trait px-2 py-0.5 text-[11px] text-nuit-700">Archivé</span>}
                    </span>
                    <span className="block truncate text-[13px] text-nuit-600">{nomClient(s.client_id)}</span>
                    <span className="block truncate text-[12px] text-nuit-600">{adresseComplete(s)}</span>
                  </span>
                  <LuChevronRight className="h-5 w-5 shrink-0 text-nuit-600" />
                </button>
              </li>
            ))}
          </ul>
        )
      )}

      {charge && onglet === 'clients' && (
        clientsVisibles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-trait p-8 text-center text-sm text-nuit-600">
            {clients!.length === 0 ? 'Aucun client enregistré pour le moment.' : 'Aucun client ne correspond.'}
          </div>
        ) : (
          <ul className="divide-y divide-trait overflow-hidden rounded-2xl border border-trait bg-white">
            {clientsVisibles.map((c) => {
              const nb = sites!.filter((s) => s.client_id === c.id && s.actif).length
              return (
                <li key={c.id}>
                  <button onClick={() => setOuvert({ type: 'client', valeur: c })} className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-fond/60">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-nuit-900 text-or-500">
                      <LuBuilding2 className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-nuit-900">
                        {c.nom}
                        {!c.actif && <span className="ml-2 rounded-full bg-trait px-2 py-0.5 text-[11px] text-nuit-700">Archivé</span>}
                      </span>
                      <span className="block truncate text-[13px] text-nuit-600">
                        {nb} site{nb > 1 ? 's' : ''}
                        {c.contact_nom ? ` · ${c.contact_nom}` : ''}
                      </span>
                      {c.telephone && (
                        <span className="flex items-center gap-1 text-[12px] text-nuit-600">
                          <LuPhone className="h-3 w-3" /> {c.telephone}
                        </span>
                      )}
                    </span>
                    <LuChevronRight className="h-5 w-5 shrink-0 text-nuit-600" />
                  </button>
                </li>
              )
            })}
          </ul>
        )
      )}

      {ouvert?.type === 'site' && charge && (
        <FormulaireSite key={'id' in ouvert.valeur ? ouvert.valeur.id : 'nouveau'} site={ouvert.valeur} clients={clients!} modifiable={admin} fermer={() => setOuvert(null)} apres={apres} />
      )}
      {ouvert?.type === 'client' && charge && (
        <FormulaireClient
          key={'id' in ouvert.valeur ? ouvert.valeur.id : 'nouveau'}
          client={ouvert.valeur}
          sites={sites!}
          modifiable={admin}
          fermer={() => setOuvert(null)}
          apres={apres}
          ajouterSite={(clientId) => setOuvert({ type: 'site', valeur: { ...SITE_VIDE, client_id: clientId } })}
          ouvrirSite={(s) => setOuvert({ type: 'site', valeur: s })}
        />
      )}
    </CadreAdmin>
  )
}
