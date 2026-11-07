-- =====================================================================
-- AGENDA SECU — 9 : notifications sur les téléphones (étape 13)
-- À exécuter après le fichier 8, APRÈS avoir créé la fonction « envoyer-push ».
-- =====================================================================

-- 1. Clés d'envoi (créées automatiquement par la fonction « envoyer-push »).
--    Personne ne peut les lire depuis l'application : seule la fonction serveur y a accès.
create table if not exists public.cles_push (
  id       integer primary key default 1 check (id = 1),
  public   text not null,
  prive    jsonb not null,
  cree_le  timestamptz not null default now()
);
alter table public.cles_push enable row level security;
revoke all on public.cles_push from anon, authenticated;

-- 2. Date d'envoi sur les téléphones (évite d'envoyer deux fois la même notification).
alter table public.notifications add column if not exists push_envoye_le timestamptz;

-- 3. Outil d'appel web de Supabase (gratuit, fourni avec chaque projet).
do $$
begin
  create extension if not exists pg_net;
exception when others then
  raise notice 'Extension pg_net indisponible : les notifications resteront visibles dans l''application.';
end $$;

-- 4. À chaque nouvelle notification, la base prévient la fonction « envoyer-push ».
--    Si l'envoi échoue, la notification reste quand même enregistrée et visible dans l'application.
create or replace function public.declencher_push()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  begin
    perform net.http_post(
      url := 'https://ickajbetvogzkkawclmj.supabase.co/functions/v1/envoyer-push',
      body := jsonb_build_object('notification', new.id),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  exception when others then
    null;
  end;
  return new;
end $$;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push
after insert on public.notifications
for each row execute function public.declencher_push();
