-- =====================================================================
-- AGENDA SECU — 5 : missions (étape 9)
-- À exécuter après le fichier 4.
-- =====================================================================

-- 1. Les chefs qui gèrent ou consultent les plannings voient le nom des agents
--    (sans avoir forcément le droit « Voir les agents », qui ouvre les fiches complètes).
drop policy if exists "profils : lecture" on public.profils;
create policy "profils : lecture" on public.profils for select to authenticated
  using (
    id = auth.uid()
    or public.est_admin()
    or (role = 'agent' and (public.chef_peut('voir_agents') or public.chef_peut('voir_plannings')
                            or public.chef_peut('gerer_affectations') or public.chef_peut('suivre_reponses')))
  );

-- 2. Un chef qui gère les affectations voit les disponibilités (pour bien choisir les agents).
drop policy if exists "dispos : lecture" on public.disponibilites;
create policy "dispos : lecture" on public.disponibilites for select to authenticated
  using (agent_id = auth.uid() or public.est_admin() or public.chef_peut('voir_disponibilites') or public.chef_peut('gerer_affectations'));

-- 3. Création d'une mission en une seule opération (tout ou rien) :
--    crée le planning du mois s'il n'existe pas, la mission, puis les propositions aux agents choisis.
--    Les règles d'accès s'appliquent (réservé à l'administrateur).
create or replace function public.creer_mission(
  p_site uuid,
  p_debut timestamptz,
  p_fin timestamptz,
  p_nb integer,
  p_consignes text,
  p_agents uuid[]
)
returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare
  v_mois date := date_trunc('month', p_debut at time zone 'Europe/Paris')::date;
  v_planning uuid;
  v_mission uuid;
begin
  if not public.est_admin() then
    raise exception 'Seul l''administrateur peut créer des missions.';
  end if;

  select id into v_planning from public.plannings where mois = v_mois;
  if v_planning is null then
    insert into public.plannings (mois) values (v_mois) returning id into v_planning;
  end if;

  insert into public.missions (planning_id, site_id, debut, fin, nb_agents_requis, consignes, cree_par)
  values (v_planning, p_site, p_debut, p_fin, greatest(1, p_nb), nullif(trim(p_consignes), ''), auth.uid())
  returning id into v_mission;

  if p_agents is not null and array_length(p_agents, 1) > 0 then
    insert into public.affectations (mission_id, agent_id)
    select v_mission, a from unnest(p_agents) as a
    on conflict (mission_id, agent_id) do nothing;
  end if;

  return v_mission;
end $$;

revoke execute on function public.creer_mission(uuid, timestamptz, timestamptz, integer, text, uuid[]) from public, anon;
grant execute on function public.creer_mission(uuid, timestamptz, timestamptz, integer, text, uuid[]) to authenticated;

-- 4. Modification d'une mission (si elle change de mois, elle passe dans le bon planning).
create or replace function public.modifier_mission(
  p_id uuid,
  p_site uuid,
  p_debut timestamptz,
  p_fin timestamptz,
  p_nb integer,
  p_consignes text
)
returns void
language plpgsql security invoker set search_path = ''
as $$
declare
  v_mois date := date_trunc('month', p_debut at time zone 'Europe/Paris')::date;
  v_planning uuid;
  v_confirmes integer;
begin
  if not public.est_admin() then
    raise exception 'Seul l''administrateur peut modifier des missions.';
  end if;
  select count(*) into v_confirmes from public.affectations where mission_id = p_id and statut = 'confirmee';
  if greatest(1, p_nb) < v_confirmes then
    raise exception 'Il y a déjà % agent(s) confirmé(s) : le nombre d''agents ne peut pas être inférieur.', v_confirmes;
  end if;

  select id into v_planning from public.plannings where mois = v_mois;
  if v_planning is null then
    insert into public.plannings (mois) values (v_mois) returning id into v_planning;
  end if;

  update public.missions
     set planning_id = v_planning, site_id = p_site, debut = p_debut, fin = p_fin,
         nb_agents_requis = greatest(1, p_nb), consignes = nullif(trim(p_consignes), '')
   where id = p_id;
  if not found then
    raise exception 'Mission introuvable.';
  end if;
end $$;

revoke execute on function public.modifier_mission(uuid, uuid, timestamptz, timestamptz, integer, text) from public, anon;
grant execute on function public.modifier_mission(uuid, uuid, timestamptz, timestamptz, integer, text) to authenticated;

-- 5. Les chefs qui gèrent ou suivent les missions voient aussi le nom des sites et l'état des plannings.
drop policy if exists "sites : lecture" on public.sites;
create policy "sites : lecture" on public.sites for select to authenticated
  using (public.est_admin() or public.chef_peut('voir_sites') or public.chef_peut('voir_plannings')
         or public.chef_peut('gerer_affectations') or public.chef_peut('suivre_reponses')
         or public.agent_sur_site(id));

drop policy if exists "plannings : lecture" on public.plannings;
create policy "plannings : lecture" on public.plannings for select to authenticated
  using (public.est_admin() or public.chef_peut('voir_plannings') or public.chef_peut('gerer_affectations')
         or public.chef_peut('suivre_reponses') or statut = 'publie');

-- 6. Quand on propose à nouveau une mission à un agent (après un refus ou une annulation),
--    il reçoit aussi une notification.
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

  if new.statut = 'proposee' and (tg_op = 'INSERT' or old.statut <> 'proposee') then
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
