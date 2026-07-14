-- Run once in the Supabase SQL editor for this project.
-- Creates the new `suppliers` table used by the dashboard's Suppliers page,
-- scoped by chat_id the same way seller_products/pricing_tiers/expenses
-- already are. Does not touch or alter any existing table.

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null references public.sellers (chat_id),
  name text not null,
  phone text,
  contact_info text,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.suppliers enable row level security;

-- The rest of this app talks to Supabase with only the anon key (no
-- server, no auth yet -- same trust model every other POS table already
-- uses), so this mirrors that: anon can read/write, scoped in the app by
-- chat_id rather than by a database-enforced identity.
create policy "anon full access to suppliers"
  on public.suppliers
  for all
  to anon
  using (true)
  with check (true);

-- So the dashboard's live-sync (Supabase Realtime) picks up changes to
-- this table the same way it already does for orders/customers/products.
alter publication supabase_realtime add table public.suppliers;
