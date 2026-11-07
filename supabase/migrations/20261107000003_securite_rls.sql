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
