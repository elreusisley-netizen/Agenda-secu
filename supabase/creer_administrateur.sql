-- AGENDA SECU — donner le rôle d'administrateur principal à un compte.
-- 1. Crée d'abord le compte dans Supabase : Authentication > Users > Add user > Create new user
--    (coche « Auto Confirm User »).
-- 2. Remplace les 3 valeurs ci-dessous, colle ce script dans SQL Editor, puis clique sur Run.

update public.profils
set role = 'admin', prenom = 'PRÉNOM', nom = 'NOM'
where email = 'ADRESSE@EMAIL.FR';

delete from public.agents
where profil_id = (select id from public.profils where email = 'ADRESSE@EMAIL.FR');

-- Vérification : doit afficher une ligne avec le rôle « admin ».
select email, role, prenom, nom from public.profils where role = 'admin';
