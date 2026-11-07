-- =====================================================================
-- AGENDA SECU — 6 : réponses des agents (étape 10)
-- À exécuter après le fichier 5.
-- Quand un agent accepte ou refuse une proposition, l'administrateur et les chefs
-- qui suivent les réponses (ou gèrent les affectations) reçoivent une notification.
-- =====================================================================

create or replace function public.notifier_reponse_agent()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  d timestamptz;
  nom_site text;
  nom_agent text;
  texte text;
begin
  if not (old.statut = 'proposee' and new.statut in ('acceptee', 'refusee')) then
    return new;
  end if;

  select mi.debut, s.nom into d, nom_site
  from public.missions mi join public.sites s on s.id = mi.site_id
  where mi.id = new.mission_id;
  select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into nom_agent from public.profils where id = new.agent_id;

  texte := coalesce(nullif(nom_agent, ''), 'Un agent')
           || case when new.statut = 'acceptee' then ' a accepté' else ' a refusé' end
           || ' la mission du ' || to_char(d at time zone 'Europe/Paris', 'DD/MM à HH24:MI') || ' — ' || nom_site
           || case when new.statut = 'refusee' and nullif(trim(new.motif_refus), '') is not null
                   then ' (motif : ' || left(trim(new.motif_refus), 120) || ')' else '' end;

  insert into public.notifications (destinataire_id, type, titre, message, lien)
  select p.id, 'modification_affectation',
         case when new.statut = 'acceptee' then 'Mission acceptée' else 'Mission refusée' end,
         texte, '/admin/missions'
  from public.profils p
  left join public.permissions_chefs pc on pc.chef_id = p.id
  where p.actif
    and (p.role = 'admin' or (p.role = 'chef' and (pc.suivre_reponses or pc.gerer_affectations)));
  return new;
end $$;

drop trigger if exists affectations_reponse_agent on public.affectations;
create trigger affectations_reponse_agent
after update of statut on public.affectations
for each row execute function public.notifier_reponse_agent();
