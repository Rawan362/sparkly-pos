import { createClient } from "@supabase/supabase-js";

// The anon key below is safe to ship to the browser: it is the same
// project the Sparkly AI Telegram bot already talks to, and access is
// scoped by Supabase Row Level Security rather than by keeping the key
// secret. Env vars, if set, override these defaults so the same code can
// point at a different project without changes.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://qfmmoobwzuhiimmjixes.supabase.co";

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFmbW1vb2J3enVoaWltbWppeGVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg2OTMzNDcsImV4cCI6MjA5NDI2OTM0N30.ZC81X_-Fe3tjPDhL7s6oemlTJDuIWRnguDIq3ZklxeA";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
  },
});
