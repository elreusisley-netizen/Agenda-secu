-- =====================================================================
-- AGENDA SECU — 4 : indicateurs du tableau de bord
-- Une seule fonction renvoie tous les chiffres. Elle respecte les droits :
-- un chef ne reçoit que les chiffres des rubriques auxquelles il a accès
-- (les autres valent null). Les agents n'y ont pas accès.
-- =====================================================================

create or replace function public.tableau_de_bord()
returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  admin boolean := public.est_admin();
  v_agents boolean := admin or public.chef_peut('voir_agents');
  v_missions boolean := admin or public.chef_peut('voir_plannings') or public.chef_peut('gerer_affectations') or public.chef_peut('suivre_reponses');
  v_dispos boolean := admin or public.chef_peut('voir_disponibilites');
  v_sites boolean := admin or public.chef_peut('voir_sites');
  aujourdhui date := (now() at time zone 'Europe/Paris')::date;
  debut_mois timestamptz := (date_trunc('month', now() at time zone 'Europe/Paris')) at time zone 'Europe/Paris';
  fin_mois timestamptz := (date_trunc('month', now() at time zone 'Europe/Paris') + interval '1 month') at time zone 'Europe/Paris';
  postes_requis integer;
  postes_couverts integer;
  resultat jsonb;
begin
  if not (admin or public.mon_role() = 'chef') then
    raise exception 'Accès réservé à l''administration.';
  end if;

  -- Postes du mois : requis et couverts (affectations confirmées, plafonnées au nombre requis)
  select coalesce(sum(m.nb_agents_requis), 0),
         coalesce(sum(least(m.nb_agents_requis, (select count(*) from public.affectations a
                                                 where a.mission_id = m.id and a.statut = 'confirmee'))), 0)
    into postes_requis, postes_couverts
  from public.missions m
  where m.debut >= debut_mois and m.debut < fin_mois and m.statut <> 'annulee';

  resultat := jsonb_build_object(
    'agents_actifs', case when v_agents then (select count(*) from public.profils where role = 'agent' and actif) end,
    'chefs', case when admin then (select count(*) from public.profils where role = 'chef' and actif) end,
    'clients', case when v_sites then (select count(*) from public.clients where actif) end,
    'sites', case when v_sites then (select count(*) from public.sites where actif) end,
    'missions_mois', case when v_missions then (select count(*) from public.missions
                       where debut >= debut_mois and debut < fin_mois and statut <> 'annulee') end,
    'postes_requis', case when v_missions then postes_requis end,
    'postes_couverts', case when v_missions then postes_couverts end,
    'a_pourvoir', case when v_missions then postes_requis - postes_couverts end,
    'reponses_en_attente', case when v_missions then (select count(*) from public.affectations a
                             join public.missions m on m.id = a.mission_id
                             where a.statut = 'proposee' and m.fin > now()) end,
    'plannings_publies', case when v_missions then (select count(*) from public.plannings where statut = 'publie') end,
    'disponibles_aujourdhui', case when v_dispos then (select count(distinct agent_id) from public.disponibilites
                                where jour = aujourdhui and statut = 'disponible') end,
    'indisponibles_aujourdhui', case when v_dispos then (select count(distinct d.agent_id) from public.disponibilites d
                                  where d.jour = aujourdhui and d.statut = 'indisponible'
                                    and not exists (select 1 from public.disponibilites d2
                                                    where d2.agent_id = d.agent_id and d2.jour = aujourdhui
                                                      and d2.statut = 'disponible')) end,
    'courbe_30_jours', case when v_missions then (
        select jsonb_agg(jsonb_build_object('jour', j::date, 'missions',
                 (select count(*) from public.missions m
                  where (m.debut at time zone 'Europe/Paris')::date = j::date and m.statut <> 'annulee'))
               order by j)
        from generate_series(aujourdhui - 29, aujourdhui, interval '1 day') j) end
  );
  return resultat;
end $$;

revoke execute on function public.tableau_de_bord() from public, anon;
grant execute on function public.tableau_de_bord() to authenticated;
