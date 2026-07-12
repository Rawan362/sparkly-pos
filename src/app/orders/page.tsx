"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { Order, OrderStatus } from "@/lib/types";
import { Stamp } from "@/components/ui/Stamp";

const STATUSES: OrderStatus[] = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"];
const FILTERS: Array<OrderStatus | "ALL"> = ["ALL", ...STATUSES];

const statusTone: Record<OrderStatus, "green" | "red" | "ink" | "brass"> = {
  PENDING: "brass",
  SHIPPED: "ink",
  DELIVERED: "green",
  CANCELLED: "red",
};

export default function OrdersPage() {
  const { sellerId } = useSeller();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");

  const load = useCallback(() => {
    if (!sellerId) return;
    let query = supabase
      .from("orders")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false });
    if (filter !== "ALL") query = query.eq("order_status", filter);
    query.then(({ data }) => setOrders(data ?? []));
  }, [sellerId, filter]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "orders",
    sellerId ? `seller_id=eq.${sellerId}` : undefined,
    load
  );

  const updateStatus = async (id: string, status: OrderStatus) => {
    setOrders(
      (prev) =>
        prev?.map((o) => (o.id === id ? { ...o, order_status: status } : o)) ??
        null
    );
    await supabase.from("orders").update({ order_status: status }).eq("id", id);
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Orders</h1>
        <p className="text-sm text-ink-soft">
          Orders customers place through Ahmad on WhatsApp/Telegram.
        </p>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={clsx(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
              filter === f
                ? "border-brass bg-brass-soft text-brass-dark"
                : "border-paper-line text-ink-soft hover:border-brass"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {!orders ? (
        <p className="text-ink-soft">Loading orders…</p>
      ) : orders.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          No orders {filter === "ALL" ? "yet" : `with status ${filter}`}.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orders.map((o) => (
            <div key={o.id} className="paper-card px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium" dir="auto">
                    {o.product_name ?? "—"}
                  </p>
                  <p className="text-sm text-ink-soft">{o.phone ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="tabular text-lg font-semibold">
                    {o.order_total != null ? o.order_total.toLocaleString() : "—"}
                  </p>
                  <p className="text-xs text-ink-faint tabular">
                    {new Date(o.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              {o.delivery_address && (
                <p className="mt-2 text-sm text-ink-soft" dir="auto">
                  {o.delivery_address}
                </p>
              )}
              <div className="mt-3 flex items-center justify-between gap-3">
                <Stamp
                  tone={
                    STATUSES.includes(o.order_status as OrderStatus)
                      ? statusTone[o.order_status as OrderStatus]
                      : "ink"
                  }
                >
                  {o.order_status ?? "Unknown"}
                </Stamp>
                <select
                  value={
                    STATUSES.includes(o.order_status as OrderStatus)
                      ? (o.order_status as OrderStatus)
                      : "PENDING"
                  }
                  onChange={(e) =>
                    updateStatus(o.id, e.target.value as OrderStatus)
                  }
                  className="rounded-md border border-paper-line bg-paper px-2 py-1.5 text-sm outline-none focus:border-brass"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
