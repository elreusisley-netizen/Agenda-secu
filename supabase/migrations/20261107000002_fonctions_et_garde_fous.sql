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
