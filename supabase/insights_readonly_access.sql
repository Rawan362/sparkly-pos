-- Run once in the Supabase SQL editor for this project (optional).
-- The Reports/Broadcasts/Insights pages added to the dashboard read from a
-- few tables this project doesn't own (broadcast_log, product_playbooks,
-- and whichever purchases-style table records purchase cost, if any). If
-- those tables exist but only ever had a service-role writer, the anon key
-- the dashboard uses has no SELECT policy on them and every query comes
-- back empty. This grants read-only anon access to each one -- but only if
-- the table actually exists, so it's safe to run even before those tables
-- are created.

do $$
declare
  t text;
begin
  foreach t in array array['broadcast_log', 'product_playbooks', 'purchases', 'product_purchases', 'purchase_orders']
  loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);

      if not exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = t
          and policyname = 'anon read access to ' || t
      ) then
        execute format(
          'create policy %I on public.%I for select to anon using (true)',
          'anon read access to ' || t,
          t
        );
      end if;
    end if;
  end loop;
end $$;

notify pgrst, 'reload schema';
