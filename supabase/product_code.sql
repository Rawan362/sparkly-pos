-- Run once in the Supabase SQL editor for this project.
-- Adds a seller-assigned product code, shown on wholesale invoices.
-- Nullable/additive: existing products and Ahmad's own product-onboarding
-- flow are unaffected until a seller (or Ahmad) sets one.

alter table public.seller_products
  add column if not exists product_code text;

-- Force PostgREST to pick up the new column immediately instead of waiting
-- for its next automatic schema cache refresh.
notify pgrst, 'reload schema';
