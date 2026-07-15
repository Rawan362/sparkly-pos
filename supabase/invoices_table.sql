-- Run once in the Supabase SQL editor for this project.
-- Creates the `invoices` table for the new Invoices workflow: a formal,
-- trackable document (draft / sent / paid) generated from an existing
-- order, separate from the informal "reprint any past sale" view already
-- on the Invoices page. `items` snapshots the line items at generation
-- time so an invoice stays accurate even if products are later renamed
-- or repriced.

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text,
  seller_id text not null references public.sellers (chat_id),
  customer_phone text,
  order_id uuid references public.orders (id),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  shipping numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'sent', 'paid')),
  created_at timestamptz not null default now()
);

create index if not exists invoices_seller_id_idx on public.invoices (seller_id);
create index if not exists invoices_order_id_idx on public.invoices (order_id);

alter table public.invoices enable row level security;

-- Same anon-key trust model as every other POS table (expenses, orders,
-- customers, ...): app-level scoping by seller_id, not database-enforced
-- identity.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'invoices'
      and policyname = 'anon full access to invoices'
  ) then
    create policy "anon full access to invoices"
      on public.invoices
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

alter publication supabase_realtime add table public.invoices;

notify pgrst, 'reload schema';
