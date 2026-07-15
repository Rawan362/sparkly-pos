"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";

type ProductHit = { id: string; product_name: string; product_code: string | null };
type CustomerHit = { phone: string; name: string | null };
type OrderHit = {
  id: string;
  product_name: string | null;
  phone: string | null;
  order_total: number | null;
};

type Results = { products: ProductHit[]; customers: CustomerHit[]; orders: OrderHit[] };

const EMPTY: Results = { products: [], customers: [], orders: [] };

function dedupe<T, K>(items: T[], key: (item: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

export function GlobalSearch() {
  const { sellerId } = useSeller();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const q = query.trim();
    // Dropdown only renders once the query is 2+ chars (see the render
    // below), so there's nothing to reset here for a short/empty query.
    if (!sellerId || q.length < 2) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const timer = setTimeout(async () => {
      const pattern = `%${q}%`;
      const [byName, byCode, byCustName, byPhone, byProdName, byOrderPhone] =
        await Promise.all([
          supabase
            .from("seller_products")
            .select("id, product_name, product_code")
            .eq("chat_id", sellerId)
            .ilike("product_name", pattern)
            .limit(5),
          supabase
            .from("seller_products")
            .select("id, product_name, product_code")
            .eq("chat_id", sellerId)
            .ilike("product_code", pattern)
            .limit(5),
          supabase
            .from("customers")
            .select("phone, name")
            .eq("seller_id", sellerId)
            .ilike("name", pattern)
            .limit(5),
          supabase
            .from("customers")
            .select("phone, name")
            .eq("seller_id", sellerId)
            .ilike("phone", pattern)
            .limit(5),
          supabase
            .from("orders")
            .select("id, product_name, phone, order_total")
            .eq("seller_id", sellerId)
            .ilike("product_name", pattern)
            .limit(5),
          supabase
            .from("orders")
            .select("id, product_name, phone, order_total")
            .eq("seller_id", sellerId)
            .ilike("phone", pattern)
            .limit(5),
        ]);

      setResults({
        products: dedupe(
          [...(byName.data ?? []), ...(byCode.data ?? [])],
          (p) => p.id
        ).slice(0, 5),
        customers: dedupe(
          [...(byCustName.data ?? []), ...(byPhone.data ?? [])],
          (c) => c.phone
        ).slice(0, 5),
        orders: dedupe(
          [...(byProdName.data ?? []), ...(byOrderPhone.data ?? [])],
          (o) => o.id
        ).slice(0, 5),
      });
      setLoading(false);
    }, 250);

    return () => clearTimeout(timer);
  }, [query, sellerId]);

  const hasResults =
    results.products.length > 0 || results.customers.length > 0 || results.orders.length > 0;

  const goTo = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search products, customers, orders…"
        aria-label="Global search"
        className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
      />

      {open && query.trim().length >= 2 && (
        <div className="paper-card absolute left-0 right-0 top-full z-30 mt-1.5 max-h-[70vh] overflow-y-auto py-1 shadow-md">
          {loading ? (
            <p className="px-4 py-3 text-sm text-ink-soft">Searching…</p>
          ) : !hasResults ? (
            <p className="px-4 py-3 text-sm text-ink-soft">
              No matches for &quot;{query}&quot;.
            </p>
          ) : (
            <>
              {results.products.length > 0 && (
                <div className="py-1">
                  <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Products
                  </p>
                  {results.products.map((p) => (
                    <Link
                      key={p.id}
                      href="/products"
                      onClick={() => goTo("/products")}
                      className="block px-4 py-2 text-sm hover:bg-brass-soft/50"
                      dir="auto"
                    >
                      {p.product_name}
                      {p.product_code && (
                        <span className="ml-2 text-xs text-ink-faint tabular">
                          {p.product_code}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              )}
              {results.customers.length > 0 && (
                <div className="border-t border-paper-line py-1">
                  <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Customers
                  </p>
                  {results.customers.map((c) => (
                    <Link
                      key={c.phone}
                      href="/customers"
                      onClick={() => goTo("/customers")}
                      className="block px-4 py-2 text-sm hover:bg-brass-soft/50"
                      dir="auto"
                    >
                      {c.name || "Unnamed"}
                      <span className="ml-2 text-xs text-ink-faint tabular">{c.phone}</span>
                    </Link>
                  ))}
                </div>
              )}
              {results.orders.length > 0 && (
                <div className="border-t border-paper-line py-1">
                  <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Orders
                  </p>
                  {results.orders.map((o) => (
                    <Link
                      key={o.id}
                      href="/orders"
                      onClick={() => goTo("/orders")}
                      className="block px-4 py-2 text-sm hover:bg-brass-soft/50"
                      dir="auto"
                    >
                      {o.product_name ?? "—"}
                      <span className="ml-2 text-xs text-ink-faint tabular">
                        {o.phone ?? "—"}
                        {o.order_total != null ? ` · ${o.order_total.toLocaleString()}` : ""}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
