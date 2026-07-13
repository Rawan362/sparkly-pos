-- Run once in the Supabase SQL editor for this project.
-- Diagnostic/fix for edits that silently fail to save (no error shown,
-- change reverts on refresh): if `sellers` and/or `seller_products` were
-- created without a permissive RLS policy for the anon role -- e.g. if
-- `sellers` was originally only ever written to by Ahmad's bot backend
-- with a privileged key -- then the dashboard's anon-key UPDATE requests
-- silently affect zero rows instead of erroring. This mirrors the same
-- "anon full access" policy already used on expenses/orders/customers/etc,
-- so the dashboard's trust model (app-level chat_id scoping, not
-- database-enforced identity) is consistent across every table it writes to.

alter table public.sellers enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'sellers'
      and policyname = 'anon full access to sellers'
  ) then
    create policy "anon full access to sellers"
      on public.sellers
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

alter table public.seller_products enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'seller_products'
      and policyname = 'anon full access to seller_products'
  ) then
    create policy "anon full access to seller_products"
      on public.seller_products
      for all
      to anon
      using (true)
      with check (true);
  end if;
end $$;

notify pgrst, 'reload schema';
