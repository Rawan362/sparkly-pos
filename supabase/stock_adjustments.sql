-- Run once in the Supabase SQL editor for this project.
-- Creates the new `stock_adjustments` table used by the Stock page's
-- "Adjust Stock" action to log every manual change to a product's
-- stock_quantity (damaged, recount, theft, restock, etc.) alongside the
-- quantity itself, scoped by chat_id the same way seller_products/expenses
-- already are. Does not touch or alter any existing table.
--
-- Applying an adjustment in the app both inserts a row here and updates
-- the matching seller_products.stock_quantity, the same way the POS
-- checkout already adjusts stock on a sale, not via a database trigger.

create table if not exists public.stock_adjustments (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.seller_products (id),
  chat_id text not null references public.sellers (chat_id),
  change_amount numeric not null,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.stock_adjustments enable row level security;

-- The rest of this app talks to Supabase with only the anon key (no
-- server, no auth yet -- same trust model every other POS table already
-- uses), so this mirrors that: anon can read/write, scoped in the app by
-- chat_id rather than by a database-enforced identity.
create policy "anon full access to stock_adjustments"
  on public.stock_adjustments
  for all
  to anon
  using (true)
  with check (true);

-- So the dashboard's live-sync (Supabase Realtime) picks up changes to
-- this table the same way it already does for orders/customers/products.
alter publication supabase_realtime add table public.stock_adjustments;
