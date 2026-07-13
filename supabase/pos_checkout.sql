-- Run once in the Supabase SQL editor for this project.
-- Adds the columns the new POS Checkout screen needs to `orders`.
-- Every column is nullable/defaulted so this is purely additive: Ahmad's
-- existing chat-order inserts (which won't set any of these) keep working
-- exactly as before, and no existing row or column is touched.
--
-- A single "sale" in the checkout screen can contain multiple products;
-- since `orders` is one-product-per-row, each cart line item becomes its
-- own order row, and `checkout_id` ties the rows from one sale together
-- so the Orders page and receipt can group/display them as one purchase.

alter table public.orders
  add column if not exists checkout_id uuid,
  add column if not exists quantity integer default 1,
  add column if not exists pricing_tier_id uuid references public.pricing_tiers (id),
  add column if not exists discount_percent numeric,
  add column if not exists payment_method text,
  add column if not exists amount_paid numeric,
  add column if not exists invoice_number text;

create index if not exists orders_checkout_id_idx on public.orders (checkout_id);
