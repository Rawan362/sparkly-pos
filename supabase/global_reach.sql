-- Run once in the Supabase SQL editor for this project.
-- Adds seller-selectable UI language + display currency, and multi-location
-- support (locations + per-location stock). All additive/nullable so every
-- existing single-location seller's data and behavior is unaffected until
-- they open the new Locations/Stock UI, which is what creates their first
-- "Main Location" row and backfills per-location stock from the existing
-- seller_products columns (see src/lib/useLocations.ts -- this file only
-- creates the tables/columns, it does not insert any seller data).

-- ---------------------------------------------------------------------
-- 1. Language + currency on pos_settings
-- ---------------------------------------------------------------------

alter table public.pos_settings
  add column if not exists language text not null default 'en',
  add column if not exists currency text not null default 'USD';

-- ---------------------------------------------------------------------
-- 2. Locations
-- ---------------------------------------------------------------------

create table if not exists public.locations (
  id uuid primary key default gen_random_uuid(),
  chat_id text not null references public.sellers (chat_id),
  name text not null,
  address text,
  city text,
  country text,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists locations_chat_id_idx on public.locations (chat_id);

alter table public.locations enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'locations'
      and policyname = 'anon full access to locations'
  ) then
    create policy "anon full access to locations"
      on public.locations
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'locations'
  ) then
    alter publication supabase_realtime add table public.locations;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 3. Per-location stock
--
-- Replaces seller_products.stock_quantity / low_stock_threshold for
-- tracking purposes going forward. Those two columns stay on
-- seller_products for backward compatibility (older reads/integrations),
-- but the Stock page now reads/writes rows here, one per
-- (product, location).
-- ---------------------------------------------------------------------

create table if not exists public.product_stock_by_location (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.seller_products (id),
  location_id uuid not null references public.locations (id),
  stock_quantity numeric,
  low_stock_threshold numeric,
  updated_at timestamptz not null default now(),
  unique (product_id, location_id)
);

create index if not exists product_stock_by_location_product_idx
  on public.product_stock_by_location (product_id);
create index if not exists product_stock_by_location_location_idx
  on public.product_stock_by_location (location_id);

alter table public.product_stock_by_location enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_stock_by_location'
      and policyname = 'anon full access to product_stock_by_location'
  ) then
    create policy "anon full access to product_stock_by_location"
      on public.product_stock_by_location
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'product_stock_by_location'
  ) then
    alter publication supabase_realtime add table public.product_stock_by_location;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 4. Optional location tag on orders
-- ---------------------------------------------------------------------

alter table public.orders
  add column if not exists location_id uuid references public.locations (id);

-- ---------------------------------------------------------------------
-- 5. Location tag on stock adjustments
--
-- stock_adjustments (added separately, see supabase/stock_adjustments.sql)
-- logs manual stock changes; this ties each adjustment to the location it
-- was applied to now that stock is tracked per-location. Nullable so
-- existing adjustment rows (logged before this column existed) are
-- unaffected.
-- ---------------------------------------------------------------------

alter table public.stock_adjustments
  add column if not exists location_id uuid references public.locations (id);

-- Force PostgREST to pick up the new columns/tables immediately instead of
-- waiting for its next automatic schema cache refresh.
notify pgrst, 'reload schema';
