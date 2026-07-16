-- Run once in the Supabase SQL editor for this project.
-- Adds the stock-tracking columns the dashboard's Stock page and Add
-- Product modal have always assumed existed on `seller_products` --
-- they never actually got created, which is why saves involving them
-- were failing ("Could not find the 'stock_quantity' column ...").
-- Nullable/defaulted so this is purely additive: every existing product
-- keeps working exactly as before (untracked) until you turn tracking on.

alter table public.seller_products
  add column if not exists track_stock boolean not null default false,
  add column if not exists stock_quantity numeric,
  add column if not exists low_stock_threshold numeric;

-- Force PostgREST to pick up the new columns immediately instead of
-- waiting for its next automatic schema cache refresh.
notify pgrst, 'reload schema';
