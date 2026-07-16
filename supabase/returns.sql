-- Run once in the Supabase SQL editor for this project.
-- Adds the columns the Orders page's new "Mark as Returned" action needs
-- on `orders`. Every column is nullable/additive, and `order_status` has
-- always been a plain text column (no enum/check constraint to update) --
-- the app already treats "RETURNED" as just another status string, the
-- same way it does PENDING/SHIPPED/DELIVERED/CANCELLED. Purely additive:
-- Ahmad's existing chat-order inserts and every existing row are untouched.

alter table public.orders
  add column if not exists return_reason text,
  add column if not exists returned_at timestamptz;

notify pgrst, 'reload schema';
