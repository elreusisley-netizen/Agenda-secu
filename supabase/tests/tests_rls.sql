\set ON_ERROR_STOP 1
\pset tuples_only on
\pset format unaligned

-- Outils de test
create schema t;
grant usage on schema t to authenticated, anon;
create table t.res (n serial, nom text, ok boolean, detail text);
grant all on t.res to authenticated, anon; grant all on sequence t.res_n_seq to authenticated, anon;
create function t.doit_echouer(nom text, requete text) returns void language plpgsql as $$
begin
  begin
    execute requete;
    insert into t.res (nom, ok, detail) values (nom, false, 'aucune erreur alors qu''une erreur était attendue');
  exception when others then
    insert into t.res (nom, ok, detail) values (nom, true, sqlerrm);
  end;
end $$;
create function t.verifier(nom text, condition boolean, detail text default '') returns void language plpgsql as $$
begin insert into t.res (nom, ok, detail) values (nom, coalesce(condition, false), detail); end $$;
create function t.qui(u uuid) returns void language sql as $$ select set_config('request.jwt.claims', json_build_object('sub', u)::text, false) $$;
grant execute on all functions in schema t to authenticated, anon;

-- Comptes
insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a', 'admin@test.fr', '{"role":"admin"}', '{"prenom":"Ada","nom":"Admin"}'),
 ('00000000-0000-0000-0000-0000000000c1', 'chef1@test.fr', '{"role":"chef"}', '{}'),
 ('00000000-0000-0000-0000-0000000000a1', 'agentA@test.fr', '{}', '{"prenom":"Alain"}'),
 ('00000000-0000-0000-0000-0000000000a2', 'agentB@test.fr', '{"role":"agent"}', '{"prenom":"Berthe"}');

select t.verifier('profils créés automatiquement', (select count(*) from public.profils) = 4);
select t.verifier('fiche agent créée pour les agents', (select count(*) from public.agents) = 2);
select t.verifier('ligne de droits créée pour le chef', (select count(*) from public.permissions_chefs) = 1);

insert into auth.users (email, raw_app_meta_data) select 'chef'||g||'@test.fr', '{"role":"chef"}' from generate_series(2,5) g;
select t.doit_echouer('6e chef refusé', $q$insert into auth.users (email, raw_app_meta_data) values ('chef6@test.fr','{"role":"chef"}')$q$);
select t.doit_echouer('agent promu chef au-delà de 5 refusé', $q$update public.profils set role='chef' where email='agentB@test.fr'$q$);

-- Données de test (côté serveur)
insert into public.clients (id, nom) values ('10000000-0000-0000-0000-000000000001', 'Client test');
insert into public.sites (id, client_id, nom, adresse) values
 ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Site 1', '1 rue Test'),
 ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Site 2', '2 rue Test');
insert into public.plannings (id, mois) values ('30000000-0000-0000-0000-000000000001', '2026-11-01');
select t.doit_echouer('mois de planning hors 1er du mois refusé', $q$insert into public.plannings (mois) values ('2026-12-05')$q$);
insert into public.missions (id, planning_id, site_id, debut, fin, nb_agents_requis) values
 ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2026-11-14 08:00+01', '2026-11-14 17:00+01', 1),
 ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', '2026-11-14 12:00+01', '2026-11-14 20:00+01', 2),
 ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '2026-11-15 22:00+01', '2026-11-16 06:00+01', 1),
 ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '2026-11-16 05:00+01', '2026-11-16 09:00+01', 1);
select t.doit_echouer('fin avant début refusée', $q$insert into public.missions (planning_id, site_id, debut, fin) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','2026-11-20 10:00+01','2026-11-20 09:00+01')$q$);

-- Visiteur anonyme
set role anon;
select t.doit_echouer('anonyme : lecture des profils interdite', 'select * from public.profils');
select t.doit_echouer('anonyme : lecture des missions interdite', 'select * from public.missions');
reset role;

-- Admin propose des missions
set role authenticated;
select t.qui('00000000-0000-0000-0000-00000000000a');
select t.verifier('admin : voit tous les profils', (select count(*) from public.profils) = 8);
insert into public.affectations (mission_id, agent_id) values
 ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1'),
 ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1'),
 ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000a1'),
 ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-0000000000a1'),
 ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a2');
select t.doit_echouer('admin : proposer à un chef refusé', $q$insert into public.affectations (mission_id, agent_id) values ('40000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1')$q$);
select t.doit_echouer('admin : se désactiver (dernier admin) refusé', $q$update public.profils set actif=false where email='admin@test.fr'$q$);

-- Agent A
select t.qui('00000000-0000-0000-0000-0000000000a1');
select t.verifier('agent : ne voit que son profil', (select count(*) from public.profils) = 1);
select t.verifier('agent : ne voit que ses affectations', (select count(*) from public.affectations) = 4);
select t.verifier('agent : voit les 4 missions qui le concernent', (select count(*) from public.missions) = 4);
select t.verifier('agent : voit les sites concernés seulement', (select count(*) from public.sites) = 2);
select t.verifier('agent : ne voit aucun client', (select count(*) from public.clients) = 0);
select t.verifier('agent : a reçu 4 notifications', (select count(*) from public.notifications) = 4);
select t.verifier('agent : historique invisible', (select count(*) from public.historique) = 0);
select t.verifier('agent : ne voit pas les droits des chefs', (select count(*) from public.permissions_chefs) = 0);

update public.affectations set statut='acceptee' where mission_id='40000000-0000-0000-0000-000000000001' and agent_id=auth.uid();
select t.verifier('agent : acceptation enregistrée avec date de réponse',
  (select repondu_le is not null from public.affectations where mission_id='40000000-0000-0000-0000-000000000001' and agent_id=auth.uid()));
select t.doit_echouer('agent : accepter une mission qui chevauche refusé',
  $q$update public.affectations set statut='acceptee' where mission_id='40000000-0000-0000-0000-000000000002' and agent_id=auth.uid()$q$);
update public.affectations set statut='acceptee' where mission_id='40000000-0000-0000-0000-000000000003' and agent_id=auth.uid();
select t.doit_echouer('agent : nuit 22h-6h puis 5h-9h détectée en chevauchement',
  $q$update public.affectations set statut='acceptee' where mission_id='40000000-0000-0000-0000-000000000004' and agent_id=auth.uid()$q$);
select t.doit_echouer('agent : se confirmer lui-même refusé',
  $q$update public.affectations set statut='confirmee' where mission_id='40000000-0000-0000-0000-000000000001' and agent_id=auth.uid()$q$);
select t.doit_echouer('agent : se proposer une mission refusé',
  $q$insert into public.affectations (mission_id, agent_id) values ('40000000-0000-0000-0000-000000000002', auth.uid())$q$);
update public.affectations set statut='refusee', motif_refus='Indisponible' where mission_id='40000000-0000-0000-0000-000000000002' and agent_id=auth.uid();
select t.verifier('agent : refus enregistré', (select statut='refusee' from public.affectations where mission_id='40000000-0000-0000-0000-000000000002' and agent_id=auth.uid()));

update public.profils set telephone='0600000000' where id=auth.uid();
select t.verifier('agent : modifie son téléphone', (select telephone='0600000000' from public.profils where id=auth.uid()));
select t.doit_echouer('agent : se donner le rôle admin refusé', $q$update public.profils set role='admin' where id=auth.uid()$q$);
update public.profils set telephone='x' where email='agentB@test.fr';

insert into public.disponibilites (agent_id, jour, creneau, statut) values (auth.uid(), '2026-12-01', 'jour', 'disponible'), (auth.uid(), '2026-12-01', 'nuit', 'indisponible');
select t.verifier('agent : saisit ses disponibilités jour et nuit', (select count(*) from public.disponibilites) = 2);
select t.doit_echouer('agent : saisir les dispos d''un autre refusé',
  $q$insert into public.disponibilites (agent_id, jour, creneau, statut) values ('00000000-0000-0000-0000-0000000000a2','2026-12-01','jour','disponible')$q$);
select t.doit_echouer('agent : modifier le texte d''une notification refusé', $q$update public.notifications set titre='piraté'$q$);
update public.notifications set lue = true;
select t.verifier('agent : marque ses notifications comme lues', (select bool_and(lue) from public.notifications));

-- Agent B ne voit rien de A
select t.qui('00000000-0000-0000-0000-0000000000a2');
select t.verifier('agent B : ne voit pas les dispos de A', (select count(*) from public.disponibilites) = 0);
select t.verifier('agent B : ne voit que sa propre affectation', (select count(*) from public.affectations) = 1);
update public.affectations set statut='acceptee' where agent_id=auth.uid();

-- Chef sans droits puis avec droits
select t.qui('00000000-0000-0000-0000-0000000000c1');
select t.verifier('chef sans droit : ne voit aucune mission', (select count(*) from public.missions) = 0);
select t.verifier('chef sans droit : ne voit aucun agent', (select count(*) from public.profils where role='agent') = 0);
update public.permissions_chefs set gerer_affectations=true where chef_id=auth.uid();
select t.verifier('chef : impossible de se donner des droits (rien n''a changé)', (select not gerer_affectations from public.permissions_chefs where chef_id=auth.uid()));

select t.qui('00000000-0000-0000-0000-00000000000a');
update public.permissions_chefs set voir_agents=true, gerer_affectations=true where chef_id='00000000-0000-0000-0000-0000000000c1';

select t.qui('00000000-0000-0000-0000-0000000000c1');
select t.verifier('chef avec droits : voit les agents', (select count(*) from public.profils where role='agent') = 2);
select t.verifier('chef avec droits : voit les missions', (select count(*) from public.missions) = 4);
select t.verifier('chef : ne voit toujours pas les clients', (select count(*) from public.clients) = 0);
update public.affectations set statut='confirmee' where mission_id='40000000-0000-0000-0000-000000000001' and agent_id='00000000-0000-0000-0000-0000000000a1';
select t.verifier('chef autorisé : confirme une affectation', (select confirme_le is not null from public.affectations where mission_id='40000000-0000-0000-0000-000000000001' and agent_id='00000000-0000-0000-0000-0000000000a1'));
select t.doit_echouer('chef : confirmer au-delà du nombre requis refusé',
  $q$update public.affectations set statut='confirmee' where mission_id='40000000-0000-0000-0000-000000000001' and agent_id='00000000-0000-0000-0000-0000000000a2'$q$);
select t.doit_echouer('chef : modifier une mission refusé (réservé admin)',
  $q$insert into public.missions (planning_id, site_id, debut, fin) values ('30000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','2026-11-21 08:00+01','2026-11-21 10:00+01')$q$);

-- Admin : changement d'horaire et publication
select t.qui('00000000-0000-0000-0000-00000000000a');
select t.doit_echouer('admin : nouvel horaire créant un chevauchement refusé',
  $q$update public.missions set debut='2026-11-14 16:00+01', fin='2026-11-14 23:00+01' where id='40000000-0000-0000-0000-000000000003'$q$);
update public.missions set debut='2026-11-15 21:00+01' where id='40000000-0000-0000-0000-000000000003';
update public.plannings set statut='publie' where id='30000000-0000-0000-0000-000000000001';
select t.verifier('admin : publication datée', (select publie_le is not null from public.plannings));
select t.verifier('admin : historique alimenté', (select count(*) from public.historique) > 10);
reset role;
select t.verifier('agent : n''a pas pu modifier le profil d''un autre', (select telephone is null from public.profils where email='agentB@test.fr'));
select t.verifier('notifications : changement d''horaire envoyé', (select count(*) from public.notifications where type='changement_horaire') = 1);
select t.verifier('notifications : planning publié envoyé à l''agent confirmé', (select count(*) from public.notifications where type='nouveau_planning') = 1);
select t.verifier('notifications : confirmation envoyée', (select count(*) from public.notifications where type='confirmation') = 1);

select (case when ok then 'OK     ' else 'ÉCHEC  ' end) || nom || case when not ok then ' — ' || detail else '' end from t.res order by n;
select count(*) filter (where ok) || ' réussis / ' || count(*) || ' tests' from t.res;
