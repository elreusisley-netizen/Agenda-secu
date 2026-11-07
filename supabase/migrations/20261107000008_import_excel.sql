-- =====================================================================
-- AGENDA SECU — 8 : import des plannings Excel (étape 12)
-- À exécuter après le fichier 7.
-- Enregistre en une fois les vacations d'un agent lues dans un fichier Excel.
-- Chaque vacation est traitée séparément : une vacation en conflit n'empêche pas les autres.
-- =====================================================================

-- Notification à l'agent (les notifications ne peuvent être créées que par le serveur).
create or replace function public.notifier_import(p_agent uuid, p_nombre integer, p_premier timestamptz)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.est_admin() then
    raise exception 'Action réservée à l''administrateur.';
  end if;
  insert into public.notifications (destinataire_id, type, titre, message, lien)
  values (p_agent, 'nouveau_planning', 'Planning mis à jour',
          p_nombre || ' vacation' || case when p_nombre > 1 then 's confirmées ajoutées' else ' confirmée ajoutée' end
          || ' à votre planning (à partir du ' || to_char(p_premier at time zone 'Europe/Paris', 'DD/MM') || ').',
          '/agent/planning');
end $$;
revoke execute on function public.notifier_import(uuid, integer, timestamptz) from public, anon;
grant execute on function public.notifier_import(uuid, integer, timestamptz) to authenticated;

create or replace function public.importer_vacations(
  p_agent uuid,
  p_statut text,          -- 'confirmee' (planning définitif) ou 'proposee' (l'agent doit accepter)
  p_vacations jsonb       -- [{ "site": uuid, "debut": horodatage, "fin": horodatage, "consignes": texte }]
)
returns jsonb
language plpgsql security invoker set search_path = ''
as $$
declare
  v jsonb;
  i integer := 0;
  v_site uuid;
  v_debut timestamptz;
  v_fin timestamptz;
  v_mois date;
  v_planning uuid;
  v_mission uuid;
  v_resultats jsonb := '[]';
  v_ajoutees integer := 0;
  v_premier timestamptz;
begin
  if not public.est_admin() then
    raise exception 'Seul l''administrateur peut importer des plannings.';
  end if;
  if p_statut not in ('confirmee', 'proposee') then
    raise exception 'Statut d''import invalide.';
  end if;
  if not exists (select 1 from public.profils where id = p_agent and role = 'agent' and actif) then
    raise exception 'Ce compte n''est pas un agent actif.';
  end if;

  for v in select * from jsonb_array_elements(p_vacations)
  loop
    begin
      v_site := (v->>'site')::uuid;
      v_debut := (v->>'debut')::timestamptz;
      v_fin := (v->>'fin')::timestamptz;

      -- Déjà importée (même agent, même site, même début) : on ne la recrée pas.
      if exists (
        select 1 from public.affectations a join public.missions m on m.id = a.mission_id
         where a.agent_id = p_agent and m.site_id = v_site and m.debut = v_debut and a.statut <> 'annulee' and m.statut <> 'annulee'
      ) then
        v_resultats := v_resultats || jsonb_build_object('index', i, 'resultat', 'deja');
      else
        v_mois := date_trunc('month', v_debut at time zone 'Europe/Paris')::date;
        select id into v_planning from public.plannings where mois = v_mois;
        if v_planning is null then
          insert into public.plannings (mois) values (v_mois) returning id into v_planning;
        end if;

        insert into public.missions (planning_id, site_id, debut, fin, nb_agents_requis, consignes, cree_par)
        values (v_planning, v_site, v_debut, v_fin, 1, nullif(trim(v->>'consignes'), ''), auth.uid())
        returning id into v_mission;

        insert into public.affectations (mission_id, agent_id, statut) values (v_mission, p_agent, p_statut::public.statut_affectation);

        v_ajoutees := v_ajoutees + 1;
        v_premier := least(coalesce(v_premier, v_debut), v_debut);
        v_resultats := v_resultats || jsonb_build_object('index', i, 'resultat', 'ajoutee');
      end if;
    exception when others then
      -- Annule seulement cette vacation (chevauchement, horaires invalides…) et continue.
      v_resultats := v_resultats || jsonb_build_object('index', i, 'resultat', 'erreur', 'message', sqlerrm);
    end;
    i := i + 1;
  end loop;

  -- Une seule notification récapitulative pour les vacations confirmées
  -- (les propositions ont déjà chacune leur notification).
  if p_statut = 'confirmee' and v_ajoutees > 0 then
    perform public.notifier_import(p_agent, v_ajoutees, v_premier);
  end if;

  return v_resultats;
end $$;

revoke execute on function public.importer_vacations(uuid, text, jsonb) from public, anon;
grant execute on function public.importer_vacations(uuid, text, jsonb) to authenticated;
