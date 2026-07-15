"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { DAY_MS } from "@/components/dashboard/DateRangeFilter";

const PENDING_TOO_LONG_MS = 2 * DAY_MS; // 48 hours

type LowStockItem = { id: string; name: string; quantity: number; threshold: number };
type PendingItem = { id: string; name: string; phone: string | null; createdAt: string };
type UnpaidItem = { key: string; label: string; balance: number };

type OrderRow = {
  id: string;
  product_name: string | null;
  phone: string | null;
  order_status: string | null;
  created_at: string;
  checkout_id: string | null;
  order_total: number | null;
  amount_paid: number | null;
};

export function NotificationsBell() {
  const { sellerId } = useSeller();
  const [open, setOpen] = useState(false);
  const [lowStock, setLowStock] = useState<LowStockItem[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [unpaid, setUnpaid] = useState<UnpaidItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!sellerId) return;
    const [productsRes, ordersRes] = await Promise.all([
      supabase
        .from("seller_products")
        .select("id, product_name, stock_quantity, low_stock_threshold, track_stock")
        .eq("chat_id", sellerId)
        .eq("track_stock", true),
      supabase
        .from("orders")
        .select(
          "id, product_name, phone, order_status, created_at, checkout_id, order_total, amount_paid"
        )
        .eq("seller_id", sellerId),
    ]);

    const products = productsRes.data ?? [];
    setLowStock(
      products
        .filter(
          (p) =>
            p.stock_quantity != null &&
            p.low_stock_threshold != null &&
            p.stock_quantity <= p.low_stock_threshold
        )
        .map((p) => ({
          id: p.id,
          name: p.product_name,
          quantity: p.stock_quantity!,
          threshold: p.low_stock_threshold!,
        }))
    );

    const orders = (ordersRes.data ?? []) as OrderRow[];
    const now = Date.now();
    setPending(
      orders
        .filter(
          (o) =>
            o.order_status === "PENDING" &&
            now - new Date(o.created_at).getTime() > PENDING_TOO_LONG_MS
        )
        .map((o) => ({
          id: o.id,
          name: o.product_name ?? "—",
          phone: o.phone,
          createdAt: o.created_at,
        }))
    );

    const groups = new Map<string, { total: number; paid: number; label: string }>();
    for (const o of orders) {
      const key = o.checkout_id ?? `single-${o.id}`;
      const entry = groups.get(key) ?? { total: 0, paid: 0, label: o.phone ?? o.product_name ?? "—" };
      entry.total += o.order_total ?? 0;
      entry.paid += o.amount_paid ?? 0;
      groups.set(key, entry);
    }
    setUnpaid(
      Array.from(groups.entries())
        .map(([key, g]) => ({ key, label: g.label, balance: g.total - g.paid }))
        .filter((g) => g.balance > 0.005)
    );
  }, [sellerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useRealtimeRefresh(
    "seller_products",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );
  useRealtimeRefresh("orders", sellerId ? `seller_id=eq.${sellerId}` : undefined, load);

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

  const total = lowStock.length + pending.length + unpaid.length;

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${total > 0 ? ` (${total})` : ""}`}
        className="relative rounded-md border border-paper-line bg-paper p-2 text-ink-soft transition-colors hover:border-brass hover:text-brass-dark"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.73 21a2 2 0 0 1-3.46 0"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {total > 0 && (
          <span className="tabular absolute -right-1 -top-1 flex h-4.5 min-w-[1.125rem] items-center justify-center rounded-full bg-stamp-red px-1 text-[10px] font-bold text-stamp-red-soft">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="paper-card absolute right-0 top-full z-30 mt-1.5 w-80 max-h-[70vh] overflow-y-auto py-1 shadow-md">
          {total === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">
              Nothing needs your attention right now.
            </p>
          ) : (
            <>
              {lowStock.length > 0 && (
                <div className="border-b border-paper-line py-1">
                  <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Low stock ({lowStock.length})
                  </p>
                  {lowStock.slice(0, 5).map((p) => (
                    <Link
                      key={p.id}
                      href="/stock"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-brass-soft/50"
                      dir="auto"
                    >
                      <span>{p.name}</span>
                      <span className="tabular shrink-0 text-xs text-stamp-red">
                        {p.quantity}/{p.threshold}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              {pending.length > 0 && (
                <div className="border-b border-paper-line py-1">
                  <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Pending 48h+ ({pending.length})
                  </p>
                  {pending.slice(0, 5).map((o) => (
                    <Link
                      key={o.id}
                      href="/orders"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-brass-soft/50"
                      dir="auto"
                    >
                      <span>{o.name}</span>
                      <span className="shrink-0 text-xs text-ink-faint">{o.phone ?? "—"}</span>
                    </Link>
                  ))}
                </div>
              )}
              {unpaid.length > 0 && (
                <div className="py-1">
                  <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                    Unpaid invoices ({unpaid.length})
                  </p>
                  {unpaid.slice(0, 5).map((u) => (
                    <Link
                      key={u.key}
                      href="/invoices"
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-2 px-4 py-2 text-sm hover:bg-brass-soft/50"
                      dir="auto"
                    >
                      <span>{u.label}</span>
                      <span className="tabular shrink-0 text-xs text-stamp-red">
                        {u.balance.toLocaleString()}
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
