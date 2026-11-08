-- =====================================================================
-- AGENDA SECU — 10 : exports PDF / Excel (étape 13)
-- À exécuter après le fichier 9.
-- Un chef qui a le droit « Exporter » peut lire ce qu'il exporte
-- (plannings, missions, affectations, sites, clients, noms des agents).
-- Rien n'est modifiable par ce droit : lecture seule.
-- =====================================================================

drop policy if exists "plannings : lecture" on public.plannings;
create policy "plannings : lecture" on public.plannings for select to authenticated
  using (public.est_admin() or public.chef_peut('voir_plannings') or public.chef_peut('gerer_affectations')
         or public.chef_peut('suivre_reponses') or public.chef_peut('exporter') or statut = 'publie');

drop policy if exists "missions : lecture" on public.missions;
create policy "missions : lecture" on public.missions for select to authenticated
  using (public.est_admin()
         or public.chef_peut('voir_plannings') or public.chef_peut('gerer_affectations') or public.chef_peut('suivre_reponses')
         or public.chef_peut('exporter')
         or public.agent_sur_mission(id));

drop policy if exists "affectations : lecture" on public.affectations;
create policy "affectations : lecture" on public.affectations for select to authenticated
  using (agent_id = auth.uid() or public.est_admin()
         or public.chef_peut('voir_plannings') or public.chef_peut('gerer_affectations') or public.chef_peut('suivre_reponses')
         or public.chef_peut('exporter'));

drop policy if exists "sites : lecture" on public.sites;
create policy "sites : lecture" on public.sites for select to authenticated
  using (public.est_admin() or public.chef_peut('voir_sites') or public.chef_peut('voir_plannings')
         or public.chef_peut('gerer_affectations') or public.chef_peut('suivre_reponses') or public.chef_peut('exporter')
         or public.agent_sur_site(id));

drop policy if exists "clients : lecture" on public.clients;
create policy "clients : lecture" on public.clients for select to authenticated
  using (public.est_admin() or public.chef_peut('voir_sites') or public.chef_peut('exporter'));

drop policy if exists "profils : lecture" on public.profils;
create policy "profils : lecture" on public.profils for select to authenticated
  using (
    id = auth.uid()
    or public.est_admin()
    or (role = 'agent' and (public.chef_peut('voir_agents') or public.chef_peut('voir_plannings')
                            or public.chef_peut('gerer_affectations') or public.chef_peut('suivre_reponses')
                            or public.chef_peut('voir_disponibilites') or public.chef_peut('exporter')))
  );
