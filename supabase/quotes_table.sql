-- Run once in the Supabase SQL editor for this project.
-- Creates `quotes`: a price quote for a customer that isn't a real order
-- yet. "Convert to Order" (in the Quotes page) inserts real `orders` rows
-- from a quote's items and marks the quote converted.

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  seller_id text not null references public.sellers (chat_id),
  customer_phone text,
  customer_name text,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  shipping numeric not null default 0,
  total numeric not null default 0,
  status text not null default 'quoted' check (status in ('quoted', 'converted')),
  created_at timestamptz not null default now()
);

create index if not exists quotes_seller_id_idx on public.quotes (seller_id);

alter table public.quotes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'quotes'
      and policyname = 'anon full access to quotes'
  ) then
    create policy "anon full access to quotes"
      on public.quotes
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

alter publication supabase_realtime add table public.quotes;

notify pgrst, 'reload schema';
