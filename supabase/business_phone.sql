-- Run once in the Supabase SQL editor for this project.
-- Adds a displayable business phone number for invoices/receipts.
-- `phone_number_id` on sellers is the WhatsApp Business API's internal
-- phone number ID (not a human-readable number), so it isn't safe to
-- print on an invoice -- this is a separate, seller-set field for that.
-- Nullable/additive: nothing existing is touched.

alter table public.sellers
  add column if not exists business_phone text;

-- So editing it in Settings (or Ahmad changing it in chat) shows up
-- immediately on screen without switching sellers or reloading. Guarded
-- since `sellers` may already be in the publication.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sellers'
  ) then
    alter publication supabase_realtime add table public.sellers;
  end if;
end $$;
