import { supabase } from "./supabaseClient";

// A handful of tables referenced on the Reports/Broadcasts/Insights pages
// (purchase costs, broadcast_log, product_playbooks) are written by other
// parts of the Sparkly AI system, not this dashboard, so their exact table
// and column names aren't guaranteed. Everything in this file probes for
// them defensively at request time and degrades to an empty/"N/A" result
// instead of guessing wrong or crashing when a table, column, or RLS policy
// isn't there yet.

type PostgrestErrorLike = { code?: string; message?: string } | null | undefined;

function isMissingTable(error: PostgrestErrorLike): boolean {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST204") {
    return true;
  }
  return /does not exist|could not find the table/i.test(error.message ?? "");
}

function isMissingColumn(error: PostgrestErrorLike): boolean {
  if (!error) return false;
  if (error.code === "42703") return true;
  return /column .* does not exist/i.test(error.message ?? "");
}

const SELLER_SCOPE_CANDIDATES = ["chat_id", "seller_id"];

export type ScopedFetchResult =
  | { status: "ok"; rows: Record<string, unknown>[] }
  | { status: "missing_table" }
  // Table exists, but none of the seller-scope column candidates matched --
  // refuse to guess, since showing unfiltered rows here could leak another
  // seller's data.
  | { status: "unscoped" };

export async function fetchSellerScopedTable(
  table: string,
  sellerId: string
): Promise<ScopedFetchResult> {
  for (const scopeCol of SELLER_SCOPE_CANDIDATES) {
    const { data, error } = await supabase.from(table).select("*").eq(scopeCol, sellerId);
    if (!error) return { status: "ok", rows: data ?? [] };
    if (isMissingTable(error)) return { status: "missing_table" };
    if (isMissingColumn(error)) continue;
    // Some other error (e.g. RLS denial) -- treat the table as unavailable.
    return { status: "missing_table" };
  }
  return { status: "unscoped" };
}

const CATEGORY_COLUMN_CANDIDATES = ["product_category", "category"];

export type PlaybookFetchResult = {
  status: "ok" | "missing_table";
  rows: Record<string, unknown>[];
  scopedByCategory: boolean;
};

// product_playbooks is collective/anonymized data (not seller-specific), so
// unlike broadcast_log there's no privacy concern in falling back to an
// unfiltered fetch if a category column can't be matched.
export async function fetchProductPlaybooks(categories: string[]): Promise<PlaybookFetchResult> {
  const table = "product_playbooks";

  if (categories.length > 0) {
    for (const col of CATEGORY_COLUMN_CANDIDATES) {
      const { data, error } = await supabase.from(table).select("*").in(col, categories);
      if (!error) return { status: "ok", rows: data ?? [], scopedByCategory: true };
      if (isMissingTable(error)) return { status: "missing_table", rows: [], scopedByCategory: false };
      if (!isMissingColumn(error)) break;
    }
  }

  const { data, error } = await supabase.from(table).select("*").limit(200);
  if (error) return { status: "missing_table", rows: [], scopedByCategory: false };
  return { status: "ok", rows: data ?? [], scopedByCategory: false };
}

const PURCHASE_TABLE_CANDIDATES = ["purchases", "product_purchases", "purchase_orders"];
const PRODUCT_LINK_CANDIDATES = ["product_id", "seller_product_id", "product_name"];
const COST_COLUMN_CANDIDATES = ["unit_cost", "purchase_cost", "cost_price", "avg_cost", "cost"];

export type PurchaseCostLookup = {
  available: boolean;
  costByProductId: Map<string, number>;
  costByProductName: Map<string, number>;
};

const NO_PURCHASE_DATA: PurchaseCostLookup = {
  available: false,
  costByProductId: new Map(),
  costByProductName: new Map(),
};

// Looks for a Purchases-shaped table, scoped to this seller, and averages
// out a per-product unit cost from whatever rows it finds. Only trusts an
// exact match on both a product-link column and a cost column -- if real
// rows exist but their shape can't be confidently read, this returns "not
// available" rather than risk showing a wrong profit number.
export async function probePurchaseCosts(sellerId: string): Promise<PurchaseCostLookup> {
  for (const table of PURCHASE_TABLE_CANDIDATES) {
    for (const scopeCol of SELLER_SCOPE_CANDIDATES) {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(scopeCol, sellerId)
        .limit(1000);

      if (error) {
        if (isMissingTable(error)) break; // try the next table name
        if (isMissingColumn(error)) continue; // try the next scope column
        break; // unknown error -- give up on this table
      }

      const rows = (data ?? []) as Record<string, unknown>[];
      if (rows.length === 0) return NO_PURCHASE_DATA;

      const keys = Object.keys(rows[0]);
      const productKey = PRODUCT_LINK_CANDIDATES.find((c) => keys.includes(c));
      const costKey = COST_COLUMN_CANDIDATES.find((c) => keys.includes(c));
      if (!productKey || !costKey) return NO_PURCHASE_DATA;

      const sums = new Map<string, { total: number; count: number }>();
      for (const row of rows) {
        const linkVal = row[productKey];
        const costVal = Number(row[costKey]);
        if (linkVal == null || Number.isNaN(costVal)) continue;
        const key = String(linkVal);
        const entry = sums.get(key) ?? { total: 0, count: 0 };
        entry.total += costVal;
        entry.count += 1;
        sums.set(key, entry);
      }

      const costById = new Map<string, number>();
      const costByName = new Map<string, number>();
      const target = productKey === "product_name" ? costByName : costById;
      for (const [key, { total, count }] of sums) target.set(key, total / count);

      return {
        available: costById.size > 0 || costByName.size > 0,
        costByProductId: costById,
        costByProductName: costByName,
      };
    }
  }
  return NO_PURCHASE_DATA;
}

// Fuzzy field lookup for rows whose exact column naming we can't verify --
// tries exact keys first, then a case-insensitive match.
export function pickField(row: Record<string, unknown>, candidates: string[]): unknown {
  for (const c of candidates) {
    if (c in row) return row[c];
  }
  const lowerMap = new Map(Object.keys(row).map((k) => [k.toLowerCase(), k]));
  for (const c of candidates) {
    const match = lowerMap.get(c.toLowerCase());
    if (match) return row[match];
  }
  return undefined;
}
