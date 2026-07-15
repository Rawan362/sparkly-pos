-- Run once in the Supabase SQL editor for this project.
-- Creates `staff_members` for the lightweight Staff & Access feature: a
-- name + PIN per staff member, and a role ("admin" or "staff") used to
-- gate view-only areas in the dashboard. This is intentionally simple --
-- not a real auth system, just a shared-device "who's working right now"
-- switch, matching the existing chat_id/localStorage identity model.

create table if not exists public.staff_members (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null references public.sellers (chat_id),
  name text not null,
  pin text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create index if not exists staff_members_chat_id_idx on public.staff_members (chat_id);

alter table public.staff_members enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'staff_members'
      and policyname = 'anon full access to staff_members'
  ) then
    create policy "anon full access to staff_members"
      on public.staff_members
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

alter publication supabase_realtime add table public.staff_members;

notify pgrst, 'reload schema';
