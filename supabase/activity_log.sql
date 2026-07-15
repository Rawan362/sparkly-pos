-- Run once in the Supabase SQL editor for this project.
-- Creates `activity_log`: a simple read-only audit feed recording key
-- actions (product added/edited, order status changed, stock adjusted)
-- so a seller can see what staff have been doing on a shared device.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null references public.sellers (chat_id),
  actor_name text not null,
  action_description text not null,
  created_at timestamptz not null default now()
);

create index if not exists activity_log_chat_id_idx on public.activity_log (chat_id);
create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);

alter table public.activity_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'activity_log'
      and policyname = 'anon full access to activity_log'
  ) then
    create policy "anon full access to activity_log"
      on public.activity_log
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

alter publication supabase_realtime add table public.activity_log;

notify pgrst, 'reload schema';
