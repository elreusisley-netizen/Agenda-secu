-- AGENDA SECU — INSTALLATION COMPLÈTE DE LA BASE (fichiers 1/3 + 2/3 + 3/3 réunis)
-- À coller en une seule fois dans Supabase > SQL Editor, puis cliquer sur Run.

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

-- =====================================================================
-- AGENDA SECU — 2/3 : fonctions de contrôle et garde-fous automatiques
-- À exécuter après le fichier 1/3.
-- =====================================================================

-- ---------- Qui est connecté ? ----------
-- (security definer : ces fonctions lisent les profils sans être bloquées par les règles RLS)

create or replace function public.mon_role()
returns public.role_utilisateur
language sql stable security definer set search_path = ''
as $$
  select role from public.profils where id = auth.uid() and actif
$$;

create or replace function public.est_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce(public.mon_role() = 'admin', false)
$$;

-- Vrai si la personne connectée est un chef actif disposant du droit demandé.
create or replace function public.chef_peut(droit text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select case droit
      when 'voir_agents'         then pc.voir_agents
      when 'voir_plannings'      then pc.voir_plannings
      when 'voir_disponibilites' then pc.voir_disponibilites
      when 'gerer_affectations'  then pc.gerer_affectations
      when 'suivre_reponses'     then pc.suivre_reponses
      when 'voir_sites'          then pc.voir_sites
      when 'exporter'            then pc.exporter
      else false
    end
    from public.permissions_chefs pc
    join public.profils p on p.id = pc.chef_id
    where pc.chef_id = auth.uid() and p.role = 'chef' and p.actif
  ), false)
$$;

-- Vrai pour les traitements serveur (éditeur SQL, fonctions serveur avec la clé secrète).
-- Les utilisateurs connectés ont toujours un identifiant ; les visiteurs anonymes n'ont aucun accès aux tables.
create or replace function public.contexte_serveur()
returns boolean
language sql stable set search_path = ''
as $$
  select auth.uid() is null
$$;

-- L'agent connecté est-il concerné par cette mission ?
create or replace function public.agent_sur_mission(m uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.affectations a
    where a.mission_id = m and a.agent_id = auth.uid() and a.statut <> 'annulee'
  )
$$;

-- L'agent connecté a-t-il une mission (proposée, acceptée ou confirmée) sur ce site ?
create or replace function public.agent_sur_site(s uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.affectations a
    join public.missions mi on mi.id = a.mission_id
    where mi.site_id = s and a.agent_id = auth.uid()
      and a.statut in ('proposee', 'acceptee', 'confirmee')
  )
$$;

-- ---------- Date de dernière modification ----------
create or replace function public.maj_modifie_le()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.modifie_le := now();
  return new;
end $$;

create trigger profils_modifie before update on public.profils for each row execute function public.maj_modifie_le();
create trigger agents_modifie before update on public.agents for each row execute function public.maj_modifie_le();
create trigger permissions_modifie before update on public.permissions_chefs for each row execute function public.maj_modifie_le();
create trigger clients_modifie before update on public.clients for each row execute function public.maj_modifie_le();
create trigger sites_modifie before update on public.sites for each row execute function public.maj_modifie_le();
create trigger plannings_modifie before update on public.plannings for each row execute function public.maj_modifie_le();
create trigger missions_modifie before update on public.missions for each row execute function public.maj_modifie_le();
create trigger affectations_modifie before update on public.affectations for each row execute function public.maj_modifie_le();
create trigger disponibilites_modifie before update on public.disponibilites for each row execute function public.maj_modifie_le();
create trigger parametres_modifie before update on public.parametres for each row execute function public.maj_modifie_le();

-- ---------- Création automatique du profil à chaque nouveau compte ----------
-- Le rôle est lu dans les métadonnées « app » (modifiables uniquement côté serveur).
create or replace function public.creer_profil()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  r public.role_utilisateur := coalesce(nullif(new.raw_app_meta_data ->> 'role', ''), 'agent')::public.role_utilisateur;
begin
  insert into public.profils (id, email, role, prenom, nom)
  values (
    new.id,
    coalesce(new.email, ''),
    r,
    coalesce(new.raw_user_meta_data ->> 'prenom', ''),
    coalesce(new.raw_user_meta_data ->> 'nom', '')
  );
  if r = 'agent' then
    insert into public.agents (profil_id) values (new.id);
  elsif r = 'chef' then
    insert into public.permissions_chefs (chef_id) values (new.id);
  end if;
  return new;
end $$;

create trigger nouveau_compte
after insert on auth.users
for each row execute function public.creer_profil();

-- ---------- Protection des profils ----------
-- Un utilisateur ne peut modifier que son téléphone. Le dernier administrateur actif ne peut pas être retiré.
create or replace function public.proteger_profil()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and not (public.contexte_serveur() or public.est_admin()) then
    if new.id <> auth.uid() then
      raise exception 'Vous ne pouvez modifier que votre propre profil.';
    end if;
    if (new.role, new.prenom, new.nom, new.email, new.actif, new.cree_le)
       is distinct from (old.role, old.prenom, old.nom, old.email, old.actif, old.cree_le) then
      raise exception 'Seul l''administrateur peut modifier ces informations.';
    end if;
  end if;

  if old.role = 'admin' and old.actif
     and (tg_op = 'DELETE' or new.role <> 'admin' or not new.actif)
     and (select count(*) from public.profils where role = 'admin' and actif) <= 1 then
    raise exception 'Impossible : il doit rester au moins un administrateur actif.';
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

create trigger profils_protection
before update or delete on public.profils
for each row execute function public.proteger_profil();

-- ---------- 5 chefs au maximum ----------
create or replace function public.limiter_chefs()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.role = 'chef' and (tg_op = 'INSERT' or old.role <> 'chef') then
    perform pg_advisory_xact_lock(4242);
    if (select count(*) from public.profils where role = 'chef' and id <> new.id) >= 5 then
      raise exception 'Limite atteinte : 5 comptes chefs au maximum.';
    end if;
  end if;
  return new;
end $$;

create trigger profils_limite_chefs
before insert or update of role on public.profils
for each row execute function public.limiter_chefs();

-- Les droits de chef ne s'attribuent qu'à un compte chef.
create or replace function public.verifier_permissions_chef()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.profils where id = new.chef_id and role = 'chef') then
    raise exception 'Ces droits ne peuvent être attribués qu''à un compte chef.';
  end if;
  return new;
end $$;

create trigger permissions_verification
before insert or update on public.permissions_chefs
for each row execute function public.verifier_permissions_chef();

-- ---------- Règles des affectations ----------
-- • un agent ne peut qu'accepter ou refuser une proposition qui lui est faite ;
-- • on ne propose rien à un compte désactivé ;
-- • pas de chevauchement entre deux missions acceptées ou confirmées d'un même agent ;
-- • pas plus d'agents confirmés que le nombre requis.
create or replace function public.controler_affectation()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  gestion boolean := public.contexte_serveur() or public.est_admin() or public.chef_peut('gerer_affectations');
  m_debut timestamptz;
  m_fin   timestamptz;
  requis  integer;
begin
  if tg_op = 'INSERT' then
    if not gestion then
      raise exception 'Action réservée à l''administrateur et aux chefs autorisés.';
    end if;
    if not exists (select 1 from public.profils where id = new.agent_id and role = 'agent' and actif) then
      raise exception 'Ce compte n''est pas un agent actif.';
    end if;
  elsif not gestion then
    if old.agent_id <> auth.uid() then
      raise exception 'Cette affectation ne vous concerne pas.';
    end if;
    if not (old.statut = 'proposee' and new.statut in ('acceptee', 'refusee')) then
      raise exception 'Vous pouvez seulement accepter ou refuser une proposition en attente.';
    end if;
    if (new.mission_id, new.agent_id, new.propose_le) is distinct from (old.mission_id, old.agent_id, old.propose_le) then
      raise exception 'Modification non autorisée.';
    end if;
    new.confirme_le := old.confirme_le;
  end if;

  if new.statut in ('acceptee', 'refusee') and (tg_op = 'INSERT' or old.statut <> new.statut) then
    new.repondu_le := now();
  end if;
  if new.statut = 'confirmee' and (tg_op = 'INSERT' or old.statut <> 'confirmee') then
    new.confirme_le := now();
  end if;
  if new.statut <> 'refusee' then
    new.motif_refus := null;
  end if;

  if new.statut in ('acceptee', 'confirmee') then
    perform pg_advisory_xact_lock(hashtextextended(new.agent_id::text, 0));
    select debut, fin into m_debut, m_fin from public.missions where id = new.mission_id;
    if exists (
      select 1
      from public.affectations a
      join public.missions mi on mi.id = a.mission_id
      where a.agent_id = new.agent_id
        and a.id <> new.id
        and a.statut in ('acceptee', 'confirmee')
        and tstzrange(mi.debut, mi.fin) && tstzrange(m_debut, m_fin)
    ) then
      raise exception 'Chevauchement : cet agent a déjà une mission sur ce créneau.';
    end if;
  end if;

  if new.statut = 'confirmee' and (tg_op = 'INSERT' or old.statut <> 'confirmee') then
    select nb_agents_requis into requis from public.missions where id = new.mission_id for update;
    if (select count(*) from public.affectations
        where mission_id = new.mission_id and statut = 'confirmee' and id <> new.id) >= requis then
      raise exception 'Le nombre d''agents requis est déjà atteint pour cette mission.';
    end if;
  end if;

  return new;
end $$;

create trigger affectations_controle
before insert or update on public.affectations
for each row execute function public.controler_affectation();

-- Si les horaires d'une mission changent, on revérifie les chevauchements des agents déjà engagés.
create or replace function public.controler_horaires_mission()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.affectations a
    join public.affectations b on b.agent_id = a.agent_id and b.id <> a.id
    join public.missions mb on mb.id = b.mission_id
    where a.mission_id = new.id
      and a.statut in ('acceptee', 'confirmee')
      and b.statut in ('acceptee', 'confirmee')
      and tstzrange(mb.debut, mb.fin) && tstzrange(new.debut, new.fin)
  ) then
    raise exception 'Chevauchement : ces nouveaux horaires entrent en conflit avec une autre mission d''un agent engagé.';
  end if;
  return new;
end $$;

create trigger missions_controle_horaires
after update of debut, fin on public.missions
for each row execute function public.controler_horaires_mission();

-- ---------- Notifications automatiques ----------
create or replace function public.notifier_affectation()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  d timestamptz;
  nom_site text;
begin
  select mi.debut, s.nom into d, nom_site
  from public.missions mi join public.sites s on s.id = mi.site_id
  where mi.id = new.mission_id;

  if tg_op = 'INSERT' and new.statut = 'proposee' then
    insert into public.notifications (destinataire_id, type, titre, message, lien)
    values (new.agent_id, 'nouvelle_proposition', 'Nouvelle proposition',
            'Mission proposée le ' || to_char(d at time zone 'Europe/Paris', 'DD/MM à HH24:MI') || ' — ' || nom_site,
            '/agent/missions/' || new.mission_id);
  elsif tg_op = 'UPDATE' and new.statut = 'confirmee' and old.statut <> 'confirmee' then
    insert into public.notifications (destinataire_id, type, titre, message, lien)
    values (new.agent_id, 'confirmation', 'Journée confirmée',
            'Votre mission du ' || to_char(d at time zone 'Europe/Paris', 'DD/MM à HH24:MI') || ' est confirmée — ' || nom_site,
            '/agent/missions/' || new.mission_id);
  elsif tg_op = 'UPDATE' and new.statut = 'annulee' and old.statut <> 'annulee' then
    insert into public.notifications (destinataire_id, type, titre, message, lien)
    values (new.agent_id, 'modification_affectation', 'Affectation annulée',
            'Votre mission du ' || to_char(d at time zone 'Europe/Paris', 'DD/MM à HH24:MI') || ' a été annulée.',
            '/agent/missions');
  end if;
  return new;
end $$;

create trigger affectations_notification
after insert or update of statut on public.affectations
for each row execute function public.notifier_affectation();

create or replace function public.notifier_changement_horaire()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (destinataire_id, type, titre, message, lien)
  select a.agent_id, 'changement_horaire', 'Changement d''horaire',
         'Nouvel horaire : ' || to_char(new.debut at time zone 'Europe/Paris', 'DD/MM HH24:MI')
           || ' – ' || to_char(new.fin at time zone 'Europe/Paris', 'HH24:MI'),
         '/agent/missions/' || new.id
  from public.affectations a
  where a.mission_id = new.id and a.statut in ('proposee', 'acceptee', 'confirmee');
  return new;
end $$;

create trigger missions_notification_horaire
after update of debut, fin on public.missions
for each row
when (old.debut is distinct from new.debut or old.fin is distinct from new.fin)
execute function public.notifier_changement_horaire();

create or replace function public.notifier_publication()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.statut = 'publie' and old.statut <> 'publie' then
    new.publie_le := now();
    new.publie_par := auth.uid();
    insert into public.notifications (destinataire_id, type, titre, message, lien)
    select distinct a.agent_id, 'nouveau_planning'::public.type_notification, 'Planning publié',
           'Votre planning de ' || to_char(new.mois, 'MM/YYYY') || ' est disponible.', '/agent/planning'
    from public.affectations a
    join public.missions mi on mi.id = a.mission_id
    where mi.planning_id = new.id and a.statut = 'confirmee';
  end if;
  return new;
end $$;

create trigger plannings_publication
before update of statut on public.plannings
for each row execute function public.notifier_publication();

-- ---------- Historique des modifications importantes ----------
create or replace function public.tracer()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  ligne jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.historique (auteur_id, action, table_nom, enregistrement_id, avant, apres)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(ligne ->> 'id', ligne ->> 'profil_id', ligne ->> 'chef_id'),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger historique_profils after insert or update or delete on public.profils for each row execute function public.tracer();
create trigger historique_agents after insert or update or delete on public.agents for each row execute function public.tracer();
create trigger historique_permissions after insert or update or delete on public.permissions_chefs for each row execute function public.tracer();
create trigger historique_clients after insert or update or delete on public.clients for each row execute function public.tracer();
create trigger historique_sites after insert or update or delete on public.sites for each row execute function public.tracer();
create trigger historique_plannings after insert or update or delete on public.plannings for each row execute function public.tracer();
create trigger historique_missions after insert or update or delete on public.missions for each row execute function public.tracer();
create trigger historique_affectations after insert or update or delete on public.affectations for each row execute function public.tracer();
create trigger historique_parametres after update on public.parametres for each row execute function public.tracer();

-- =====================================================================
-- AGENDA SECU — 3/3 : règles d'accès (RLS)
-- Principe : tout est interdit, sauf ce qui est explicitement autorisé ci-dessous.
-- À exécuter après le fichier 2/3.
-- =====================================================================

-- Aucun accès pour les visiteurs non connectés.
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;

alter table public.profils           enable row level security;
alter table public.agents            enable row level security;
alter table public.permissions_chefs enable row level security;
alter table public.clients           enable row level security;
alter table public.sites             enable row level security;
alter table public.plannings         enable row level security;
alter table public.missions          enable row level security;
alter table public.affectations      enable row level security;
alter table public.disponibilites    enable row level security;
alter table public.notifications     enable row level security;
alter table public.abonnements_push  enable row level security;
alter table public.historique        enable row level security;
alter table public.parametres        enable row level security;

-- ---------- profils ----------
create policy "profils : lecture" on public.profils for select to authenticated
  using (id = auth.uid() or public.est_admin() or (role = 'agent' and public.chef_peut('voir_agents')));
create policy "profils : modification" on public.profils for update to authenticated
  using (id = auth.uid() or public.est_admin())
  with check (id = auth.uid() or public.est_admin());
create policy "profils : suppression admin" on public.profils for delete to authenticated
  using (public.est_admin());
-- Pas de création directe : les comptes sont créés côté serveur (fonction réservée à l'admin).

-- ---------- agents (fiche professionnelle) ----------
create policy "agents : lecture" on public.agents for select to authenticated
  using (profil_id = auth.uid() or public.est_admin() or public.chef_peut('voir_agents'));
create policy "agents : gestion admin" on public.agents for all to authenticated
  using (public.est_admin()) with check (public.est_admin());

-- ---------- permissions des chefs ----------
create policy "permissions : lecture" on public.permissions_chefs for select to authenticated
  using (chef_id = auth.uid() or public.est_admin());
create policy "permissions : gestion admin" on public.permissions_chefs for all to authenticated
  using (public.est_admin()) with check (public.est_admin());

-- ---------- clients ----------
create policy "clients : lecture" on public.clients for select to authenticated
  using (public.est_admin() or public.chef_peut('voir_sites'));
create policy "clients : gestion admin" on public.clients for all to authenticated
  using (public.est_admin()) with check (public.est_admin());

-- ---------- sites ----------
create policy "sites : lecture" on public.sites for select to authenticated
  using (public.est_admin() or public.chef_peut('voir_sites') or public.chef_peut('voir_plannings')
         or public.agent_sur_site(id));
create policy "sites : gestion admin" on public.sites for all to authenticated
  using (public.est_admin()) with check (public.est_admin());

-- ---------- plannings ----------
create policy "plannings : lecture" on public.plannings for select to authenticated
  using (public.est_admin() or public.chef_peut('voir_plannings') or statut = 'publie');
create policy "plannings : gestion admin" on public.plannings for all to authenticated
  using (public.est_admin()) with check (public.est_admin());

-- ---------- missions ----------
create policy "missions : lecture" on public.missions for select to authenticated
  using (public.est_admin()
         or public.chef_peut('voir_plannings') or public.chef_peut('gerer_affectations') or public.chef_peut('suivre_reponses')
         or public.agent_sur_mission(id));
create policy "missions : gestion admin" on public.missions for all to authenticated
  using (public.est_admin()) with check (public.est_admin());

-- ---------- affectations ----------
create policy "affectations : lecture" on public.affectations for select to authenticated
  using (agent_id = auth.uid() or public.est_admin()
         or public.chef_peut('voir_plannings') or public.chef_peut('gerer_affectations') or public.chef_peut('suivre_reponses'));
create policy "affectations : création" on public.affectations for insert to authenticated
  with check (public.est_admin() or public.chef_peut('gerer_affectations'));
-- L'agent peut mettre à jour SA ligne ; le garde-fou n'autorise que « accepter » ou « refuser ».
create policy "affectations : modification" on public.affectations for update to authenticated
  using (agent_id = auth.uid() or public.est_admin() or public.chef_peut('gerer_affectations'))
  with check (agent_id = auth.uid() or public.est_admin() or public.chef_peut('gerer_affectations'));
create policy "affectations : suppression" on public.affectations for delete to authenticated
  using (public.est_admin() or public.chef_peut('gerer_affectations'));

-- ---------- disponibilités ----------
create policy "dispos : lecture" on public.disponibilites for select to authenticated
  using (agent_id = auth.uid() or public.est_admin() or public.chef_peut('voir_disponibilites'));
create policy "dispos : saisie par l'agent" on public.disponibilites for insert to authenticated
  with check ((agent_id = auth.uid() and public.mon_role() = 'agent') or public.est_admin());
create policy "dispos : modification par l'agent" on public.disponibilites for update to authenticated
  using (agent_id = auth.uid() or public.est_admin())
  with check (agent_id = auth.uid() or public.est_admin());
create policy "dispos : suppression par l'agent" on public.disponibilites for delete to authenticated
  using (agent_id = auth.uid() or public.est_admin());

-- ---------- notifications ----------
-- Créées uniquement par les garde-fous automatiques ; chacun ne lit que les siennes.
create policy "notifications : lecture" on public.notifications for select to authenticated
  using (destinataire_id = auth.uid());
create policy "notifications : marquer comme lue" on public.notifications for update to authenticated
  using (destinataire_id = auth.uid()) with check (destinataire_id = auth.uid());
revoke update on public.notifications from authenticated;
grant update (lue) on public.notifications to authenticated;

-- ---------- abonnements push ----------
create policy "push : ses propres appareils" on public.abonnements_push for all to authenticated
  using (profil_id = auth.uid()) with check (profil_id = auth.uid());

-- ---------- historique ----------
create policy "historique : lecture admin" on public.historique for select to authenticated
  using (public.est_admin());
revoke insert, update, delete on public.historique from authenticated;

-- ---------- paramètres ----------
create policy "parametres : lecture" on public.parametres for select to authenticated using (true);
create policy "parametres : modification admin" on public.parametres for update to authenticated
  using (public.est_admin()) with check (public.est_admin());

