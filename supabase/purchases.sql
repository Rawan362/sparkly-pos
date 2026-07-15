-- Run once in the Supabase SQL editor for this project.
-- Creates the new `purchases` table used by the dashboard's Purchases page
-- to record stock bought in from a supplier, scoped by chat_id the same
-- way seller_products/expenses/suppliers already are. Does not touch or
-- alter any existing table.
--
-- Recording a purchase in the app also bumps the matching
-- seller_products.stock_quantity (only when that product has track_stock
-- on); that update happens from the app the same way the POS checkout
-- already adjusts stock on a sale, not via a database trigger.

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null references public.sellers (chat_id),
  supplier_id uuid references public.suppliers (id),
  product_id uuid references public.seller_products (id),
  quantity numeric not null,
  cost_price numeric,
  purchase_date date not null default current_date,
  created_at timestamptz not null default now()
);

alter table public.purchases enable row level security;

-- The rest of this app talks to Supabase with only the anon key (no
-- server, no auth yet -- same trust model every other POS table already
-- uses), so this mirrors that: anon can read/write, scoped in the app by
-- chat_id rather than by a database-enforced identity.
create policy "anon full access to purchases"
  on public.purchases
  for all
  to anon
  using (true)
  with check (true);

-- So the dashboard's live-sync (Supabase Realtime) picks up changes to
-- this table the same way it already does for orders/customers/products.
alter publication supabase_realtime add table public.purchases;
