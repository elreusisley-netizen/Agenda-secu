-- =====================================================================
-- AGENDA SECU — 1/3 : tables
-- À exécuter en premier dans l'éditeur SQL de Supabase.
-- =====================================================================

-- ---------- Types (listes de valeurs autorisées) ----------
create type public.role_utilisateur as enum ('admin', 'chef', 'agent');
create type public.statut_planning as enum ('brouillon', 'propositions_envoyees', 'publie');
create type public.statut_mission as enum ('ouverte', 'complete', 'annulee');
create type public.statut_affectation as enum ('proposee', 'acceptee', 'refusee', 'confirmee', 'annulee');
create type public.creneau as enum ('jour', 'nuit');
create type public.statut_dispo as enum ('disponible', 'indisponible', 'en_attente');
create type public.type_notification as enum (
  'nouveau_planning', 'nouvelle_proposition', 'modification_affectation',
  'changement_horaire', 'rappel_reponse', 'confirmation'
);

-- ---------- Comptes ----------
-- Un profil par compte de connexion Supabase (auth.users).
create table public.profils (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.role_utilisateur not null default 'agent',
  prenom      text not null default '',
  nom         text not null default '',
  email       text not null,
  telephone   text,
  actif       boolean not null default true,
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz not null default now()
);
create index profils_role_idx on public.profils (role);

-- Informations professionnelles propres aux agents.
create table public.agents (
  profil_id             uuid primary key references public.profils (id) on delete cascade,
  matricule             text unique,
  carte_pro_numero      text,
  carte_pro_expiration  date,
  qualifications        text[] not null default '{}',
  type_contrat          text,
  notes_internes        text,
  modifie_le            timestamptz not null default now()
);

-- Droits accordés à chaque chef (une case par droit).
create table public.permissions_chefs (
  chef_id              uuid primary key references public.profils (id) on delete cascade,
  voir_agents          boolean not null default false,
  voir_plannings       boolean not null default false,
  voir_disponibilites  boolean not null default false,
  gerer_affectations   boolean not null default false,
  suivre_reponses      boolean not null default false,
  voir_sites           boolean not null default false,
  exporter             boolean not null default false,
  modifie_le           timestamptz not null default now()
);

-- ---------- Clients et sites ----------
create table public.clients (
  id           uuid primary key default gen_random_uuid(),
  nom          text not null,
  adresse      text,
  contact_nom  text,
  telephone    text,
  email        text,
  notes        text,
  actif        boolean not null default true,
  infos        jsonb not null default '{}',   -- champs futurs, sans refaire la base
  cree_le      timestamptz not null default now(),
  modifie_le   timestamptz not null default now()
);

create table public.sites (
  id                 uuid primary key default gen_random_uuid(),
  client_id          uuid not null references public.clients (id) on delete restrict,
  nom                text not null,
  adresse            text not null,
  code_postal        text,
  ville              text,
  infos_acces        text,
  consignes          text,
  contact_nom        text,
  contact_telephone  text,
  actif              boolean not null default true,
  infos              jsonb not null default '{}',
  cree_le            timestamptz not null default now(),
  modifie_le         timestamptz not null default now()
);
create index sites_client_idx on public.sites (client_id);

-- ---------- Plannings, missions, affectations ----------
create table public.plannings (
  id          uuid primary key default gen_random_uuid(),
  mois        date not null unique check (extract(day from mois) = 1),  -- toujours le 1er du mois
  statut      public.statut_planning not null default 'brouillon',
  publie_le   timestamptz,
  publie_par  uuid references public.profils (id),
  version     integer not null default 1,
  infos       jsonb not null default '{}',
  cree_le     timestamptz not null default now(),
  modifie_le  timestamptz not null default now()
);

-- Une mission = une vacation sur un site (date et heure complètes : les nuits sont gérées).
create table public.missions (
  id                uuid primary key default gen_random_uuid(),
  planning_id       uuid not null references public.plannings (id) on delete cascade,
  site_id           uuid not null references public.sites (id) on delete restrict,
  debut             timestamptz not null,
  fin               timestamptz not null,
  nb_agents_requis  integer not null default 1 check (nb_agents_requis between 1 and 200),
  consignes         text,
  statut            public.statut_mission not null default 'ouverte',
  infos             jsonb not null default '{}',
  cree_par          uuid references public.profils (id),
  cree_le           timestamptz not null default now(),
  modifie_le        timestamptz not null default now(),
  check (fin > debut),
  check (fin - debut <= interval '24 hours')
);
create index missions_planning_idx on public.missions (planning_id);
create index missions_site_idx on public.missions (site_id);
create index missions_debut_idx on public.missions (debut);

-- Lien agent ↔ mission, avec tout le parcours de la proposition.
create table public.affectations (
  id           uuid primary key default gen_random_uuid(),
  mission_id   uuid not null references public.missions (id) on delete cascade,
  agent_id     uuid not null references public.profils (id) on delete cascade,
  statut       public.statut_affectation not null default 'proposee',
  propose_le   timestamptz not null default now(),
  repondu_le   timestamptz,
  confirme_le  timestamptz,
  motif_refus  text,
  modifie_le   timestamptz not null default now(),
  unique (mission_id, agent_id)
);
create index affectations_agent_idx on public.affectations (agent_id, statut);

-- ---------- Disponibilités (par jour et par créneau) ----------
create table public.disponibilites (
  agent_id     uuid not null references public.profils (id) on delete cascade,
  jour         date not null,
  creneau      public.creneau not null,
  statut       public.statut_dispo not null,
  commentaire  text,
  modifie_le   timestamptz not null default now(),
  primary key (agent_id, jour, creneau)
);
create index disponibilites_jour_idx on public.disponibilites (jour);

-- ---------- Notifications ----------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  destinataire_id uuid not null references public.profils (id) on delete cascade,
  type            public.type_notification not null,
  titre           text not null,
  message         text not null,
  lien            text,
  lue             boolean not null default false,
  cree_le         timestamptz not null default now()
);
create index notifications_destinataire_idx on public.notifications (destinataire_id, lue, cree_le desc);

-- Adresses d'envoi des notifications push (un agent peut avoir plusieurs appareils).
create table public.abonnements_push (
  id         uuid primary key default gen_random_uuid(),
  profil_id  uuid not null references public.profils (id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  appareil   text,
  cree_le    timestamptz not null default now()
);
create index abonnements_push_profil_idx on public.abonnements_push (profil_id);

-- ---------- Historique (rempli automatiquement) ----------
create table public.historique (
  id                bigint generated always as identity primary key,
  auteur_id         uuid,
  action            text not null,          -- INSERT, UPDATE, DELETE
  table_nom         text not null,
  enregistrement_id text,
  avant             jsonb,
  apres             jsonb,
  cree_le           timestamptz not null default now()
);
create index historique_table_idx on public.historique (table_nom, enregistrement_id);
create index historique_date_idx on public.historique (cree_le desc);

-- ---------- Réglages de l'entreprise (une seule ligne) ----------
create table public.parametres (
  id                     integer primary key default 1 check (id = 1),
  nom_entreprise         text not null default 'AGENDA SECU',
  delai_reponse_heures   integer not null default 48 check (delai_reponse_heures between 1 and 720),
  rappels_actifs         boolean not null default true,
  infos                  jsonb not null default '{}',
  modifie_le             timestamptz not null default now()
);
insert into public.parametres (id) values (1);
