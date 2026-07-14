-- Run once in the Supabase SQL editor for this project.
-- Records whether a POS sale used wholesale pricing, so the new Invoices
-- page can reprint the correct invoice layout (retail slip vs wholesale
-- invoice) for past sales instead of guessing. Nullable/additive: every
-- existing row (including everything Ahmad creates via chat) defaults to
-- false/retail, since that's the only layout that existed before this.

alter table public.orders
  add column if not exists is_wholesale boolean not null default false;

notify pgrst, 'reload schema';
