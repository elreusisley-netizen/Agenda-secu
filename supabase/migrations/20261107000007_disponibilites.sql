-- =====================================================================
-- AGENDA SECU — 7 : disponibilités (étape 11)
-- À exécuter après le fichier 6.
-- Un chef qui a le droit « Voir les disponibilités » voit aussi le nom des agents
-- (sinon le tableau des disponibilités serait vide pour lui).
-- =====================================================================
drop policy if exists "profils : lecture" on public.profils;
create policy "profils : lecture" on public.profils for select to authenticated
  using (
    id = auth.uid()
    or public.est_admin()
    or (role = 'agent' and (public.chef_peut('voir_agents') or public.chef_peut('voir_plannings')
                            or public.chef_peut('gerer_affectations') or public.chef_peut('suivre_reponses')
                            or public.chef_peut('voir_disponibilites')))
  );
