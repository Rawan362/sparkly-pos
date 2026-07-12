# Sparkly POS — Web Dashboard

A second, visual way to manage a Sparkly AI seller's business — the same
Supabase tables the Telegram bot (Ahmad) already reads and writes. Nothing
here is a parallel system: edit a price in the dashboard and Ahmad sees it on
the next message; confirm an order in chat and it updates here live.

No backend server: this is a static React/Next.js app that talks to
Supabase's REST + Realtime API directly from the browser using the project's
anon key, which is safe to ship client-side because access is governed by
Supabase Row Level Security, not by keeping the key secret.

## Identifying as a seller

There's no login system yet. Open the app and type in a Seller ID (the
seller's Telegram chat ID — the same identity Ahmad already uses). It's
stored in the browser's `localStorage` and used to scope every query.

All of that lives behind one hook, `useSeller()`
(`src/lib/SellerContext.tsx`). When a real login system exists, only the
inside of that file needs to change — every page already calls `useSeller()`
instead of touching `localStorage` or a chat ID directly.

## Pages

- **Products** — catalog table, inline-edit name/category/prices, active
  toggle, stock-tracking indicator.
- **Stock** — active products, per-product stock tracking toggle, quantity
  and low-stock threshold editing, a stamped flag when a product is at or
  below its threshold.
- **Pricing Tiers** — add/delete tiers, mark one as the default.
- **Units** — add/delete custom units of measure.
- **Orders** — recent orders, filterable by status, status updates,
  customer/product/total/address at a glance.
- **Customers** — searchable customer list with orders, spend, VIP and
  wholesale/retail status.
- **Settings** — the three `pos_settings` toggles (inventory tracking,
  low-stock alerts, auto-invoicing). Everything defaults to off.

## Design

Warm paper background, ink-navy text, a brass accent, tabular numerals for
prices and quantities, and ink-stamp-style badges for statuses — meant to
read like a ledger or POS terminal rather than a generic admin template.
Fonts are loaded so Arabic and Latin product/category names both render
cleanly (IBM Plex Sans + Noto Sans Arabic, with Fraunces for headings and
IBM Plex Mono for numerals).

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — it redirects to the seller gate, then to
`/products` once a Seller ID is entered.

The Supabase URL and anon key are already baked into
`src/lib/supabaseClient.ts` as defaults (the same project the bot uses), so
no `.env` file is required to run this. `.env.example` shows the two
variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) if
you ever want to point the app at a different Supabase project — copy it to
`.env.local` and the env vars will override the defaults.

## Deploying (one command)

```bash
npx vercel --prod
```

Follow the prompts (link/create a project); no environment variables need to
be set for this to work against the existing Sparkly AI Supabase project.
Netlify (`npx netlify deploy --prod`) or any other static/Next.js host works
the same way.

## Notes

- No new tables were created — this only reads/writes the existing
  `sellers`, `seller_products`, `pos_settings`, `pricing_tiers`,
  `custom_units`, `customers`, and `orders` tables.
- Every page subscribes to Supabase Realtime on its table (scoped to the
  current seller) so changes made by the bot, or in another browser tab,
  appear without a manual refresh.
