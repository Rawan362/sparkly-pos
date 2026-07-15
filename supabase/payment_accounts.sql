-- Run once in the Supabase SQL editor for this project.
-- Creates `payment_accounts` (e.g. "Cash", "Bank Transfer", "Mobile
-- Money") and links `orders` to the specific account used for that sale.
-- Note: orders.amount_paid and orders.order_total already exist (added
-- by pos_checkout.sql) -- only the new payment_account_id link is added
-- here.

create table if not exists public.payment_accounts (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null references public.sellers (chat_id),
  name text not null,
  type text,
  created_at timestamptz not null default now()
);

create index if not exists payment_accounts_chat_id_idx on public.payment_accounts (chat_id);

alter table public.payment_accounts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'payment_accounts'
      and policyname = 'anon full access to payment_accounts'
  ) then
    create policy "anon full access to payment_accounts"
      on public.payment_accounts
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

alter publication supabase_realtime add table public.payment_accounts;

alter table public.orders
  add column if not exists payment_account_id uuid references public.payment_accounts (id);

notify pgrst, 'reload schema';
