"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useStaff } from "@/lib/StaffContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { logActivity } from "@/lib/activityLog";
import type { Order, OrderStatus, PaymentAccount } from "@/lib/types";
import { Stamp } from "@/components/ui/Stamp";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { AddOrderModal } from "@/components/orders/AddOrderModal";

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
  const { actorName } = useStaff();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([]);
  const [filter, setFilter] = useState<OrderStatus | "ALL">("ALL");
  const [showAdd, setShowAdd] = useState(false);

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

  const loadPaymentAccounts = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("payment_accounts")
      .select("*")
      .eq("chat_id", sellerId)
      .order("name", { ascending: true })
      .then(({ data }) => setPaymentAccounts(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
    loadPaymentAccounts();
  }, [load, loadPaymentAccounts]);

  useRealtimeRefresh(
    "orders",
    sellerId ? `seller_id=eq.${sellerId}` : undefined,
    load
  );
  useRealtimeRefresh(
    "payment_accounts",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    loadPaymentAccounts
  );

  const updateStatus = async (id: string, status: OrderStatus) => {
    const productName = orders?.find((o) => o.id === id)?.product_name ?? "order";
    setOrders(
      (prev) =>
        prev?.map((o) => (o.id === id ? { ...o, order_status: status } : o)) ??
        null
    );
    await supabase.from("orders").update({ order_status: status }).eq("id", id);
    if (sellerId) {
      await logActivity(
        sellerId,
        actorName,
        `Marked order "${productName}" as ${status}`
      );
    }
  };

  const updatePayment = async (id: string, patch: Partial<Order>) => {
    setOrders(
      (prev) => prev?.map((o) => (o.id === id ? { ...o, ...patch } : o)) ?? null
    );
    await supabase.from("orders").update(patch).eq("id", id);
  };

  const paymentStatus = (o: Order) => {
    const total = o.order_total ?? 0;
    const paid = o.amount_paid ?? 0;
    if (total <= 0) return null;
    if (paid >= total - 0.005) return { label: "Paid", tone: "green" as const };
    if (paid > 0) return { label: "Partial", tone: "brass" as const };
    return { label: "Debt", tone: "red" as const };
  };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Orders</h1>
          <p className="text-sm text-ink-soft">
            Orders customers place through Ahmad on WhatsApp/Telegram.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised"
        >
          + New Order
        </button>
      </div>

      {showAdd && sellerId && (
        <AddOrderModal
          sellerId={sellerId}
          onClose={() => setShowAdd(false)}
          onCreated={load}
        />
      )}

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

              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-paper-line pt-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-faint">Paid</span>
                  <div className="w-24">
                    <InlineEdit
                      type="number"
                      align="right"
                      value={o.amount_paid?.toString() ?? ""}
                      placeholder="0"
                      onSave={(v) =>
                        updatePayment(o.id, {
                          amount_paid: v === "" ? null : Number(v),
                        })
                      }
                    />
                  </div>
                  {paymentStatus(o) && (
                    <Stamp tone={paymentStatus(o)!.tone}>
                      {paymentStatus(o)!.label}
                    </Stamp>
                  )}
                </div>
                <select
                  value={o.payment_account_id ?? ""}
                  onChange={(e) =>
                    updatePayment(o.id, {
                      payment_account_id: e.target.value || null,
                    })
                  }
                  className="rounded-md border border-paper-line bg-paper px-2 py-1.5 text-sm outline-none focus:border-brass"
                >
                  <option value="">No payment account</option>
                  {paymentAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
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
