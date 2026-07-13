"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { OrderStatus } from "@/lib/types";
import { StatTile } from "@/components/dashboard/StatTile";
import type { SalesPoint } from "@/components/dashboard/SalesChart";
import type { StatusCount } from "@/components/dashboard/OrdersStatusChart";

// Both charts measure the DOM (ResponsiveContainer) and only make sense
// client-side, so they're excluded from the static prerender entirely.
const SalesChart = dynamic(
  () => import("@/components/dashboard/SalesChart").then((m) => m.SalesChart),
  { ssr: false }
);
const OrdersStatusChart = dynamic(
  () =>
    import("@/components/dashboard/OrdersStatusChart").then(
      (m) => m.OrdersStatusChart
    ),
  { ssr: false }
);

const STATUSES: OrderStatus[] = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"];
const DAY_MS = 24 * 60 * 60 * 1000;

type OrderRow = {
  order_total: number | null;
  order_status: string | null;
  created_at: string;
};

type Summary = {
  totalSales: number;
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  vipCustomers: number;
  lowStockItems: number;
  totalExpenses: number;
  salesByDay: SalesPoint[];
  salesByMonth: SalesPoint[];
  statusCounts: StatusCount[];
};

export default function DashboardPage() {
  const { sellerId, seller } = useSeller();
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    if (!sellerId) return;

    const [ordersRes, customersCountRes, vipCountRes, productsRes, expensesRes] =
      await Promise.all([
        supabase
          .from("orders")
          .select("order_total, order_status, created_at")
          .eq("seller_id", sellerId),
        supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", sellerId),
        supabase
          .from("customers")
          .select("*", { count: "exact", head: true })
          .eq("seller_id", sellerId)
          .eq("is_vip", true),
        supabase
          .from("seller_products")
          .select("stock_quantity, low_stock_threshold")
          .eq("chat_id", sellerId)
          .eq("track_stock", true),
        supabase.from("expenses").select("amount").eq("chat_id", sellerId),
      ]);

    const orders = (ordersRes.data ?? []) as OrderRow[];
    const totalExpenses = (expensesRes.data ?? []).reduce(
      (sum, e) => sum + (e.amount ?? 0),
      0
    );
    const totalSales = orders.reduce((sum, o) => sum + (o.order_total ?? 0), 0);
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(
      (o) => o.order_status === "PENDING"
    ).length;

    const statusCounts: StatusCount[] = STATUSES.map((status) => ({
      status,
      count: orders.filter((o) => o.order_status === status).length,
    }));

    const lowStockItems = (productsRes.data ?? []).filter(
      (p) =>
        p.stock_quantity != null &&
        p.low_stock_threshold != null &&
        p.stock_quantity <= p.low_stock_threshold
    ).length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      days.set(d.toISOString().slice(0, 10), 0);
    }
    for (const o of orders) {
      const key = o.created_at?.slice(0, 10);
      if (key && days.has(key)) {
        days.set(key, (days.get(key) ?? 0) + (o.order_total ?? 0));
      }
    }
    const salesByDay: SalesPoint[] = Array.from(days.entries()).map(
      ([date, total]) => ({
        date,
        total,
        label: new Date(date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
      })
    );

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const months = new Map<string, number>();
    const monthLabels = new Map<string, string>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(monthStart.getFullYear(), monthStart.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.set(key, 0);
      monthLabels.set(
        key,
        d.toLocaleDateString(undefined, { month: "short", year: "numeric" })
      );
    }
    for (const o of orders) {
      const d = new Date(o.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      if (months.has(key)) {
        months.set(key, (months.get(key) ?? 0) + (o.order_total ?? 0));
      }
    }
    const salesByMonth: SalesPoint[] = Array.from(months.entries()).map(
      ([date, total]) => ({ date, total, label: monthLabels.get(date)! })
    );

    setSummary({
      totalSales,
      totalOrders,
      pendingOrders,
      totalCustomers: customersCountRes.count ?? 0,
      vipCustomers: vipCountRes.count ?? 0,
      lowStockItems,
      totalExpenses,
      salesByDay: totalOrders === 0 ? [] : salesByDay,
      salesByMonth: totalOrders === 0 ? [] : salesByMonth,
      statusCounts,
    });
  }, [sellerId]);

  useEffect(() => {
    // Fetches from Supabase and syncs the result into state on mount/seller change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useRealtimeRefresh("orders", sellerId ? `seller_id=eq.${sellerId}` : undefined, load);
  useRealtimeRefresh(
    "customers",
    sellerId ? `seller_id=eq.${sellerId}` : undefined,
    load
  );
  useRealtimeRefresh(
    "seller_products",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );
  useRealtimeRefresh(
    "expenses",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-ink-soft">
          {seller?.business_name_location
            ? `A quick look at ${seller.business_name_location}.`
            : "A quick look at how business is going."}
        </p>
      </div>

      {!summary ? (
        <p className="text-ink-soft">Loading dashboard…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Total sales"
              value={summary.totalSales.toLocaleString()}
              tone="brass"
            />
            <StatTile
              label="Total orders"
              value={summary.totalOrders.toLocaleString()}
            />
            <StatTile
              label="Pending orders"
              value={summary.pendingOrders.toLocaleString()}
              tone={summary.pendingOrders > 0 ? "brass" : "ink"}
            />
            <StatTile
              label="Total expenses"
              value={summary.totalExpenses.toLocaleString()}
            />
            <StatTile
              label="Total customers"
              value={summary.totalCustomers.toLocaleString()}
            />
            <StatTile
              label="VIP customers"
              value={summary.vipCustomers.toLocaleString()}
              tone="green"
            />
            <StatTile
              label="Low stock items"
              value={summary.lowStockItems.toLocaleString()}
              tone={summary.lowStockItems > 0 ? "red" : "ink"}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SalesChart data={summary.salesByDay} />
            <OrdersStatusChart data={summary.statusCounts} />
          </div>

          <SalesChart
            data={summary.salesByMonth}
            title="Sales — last 12 months"
            emptyMessage="No sales yet — a year of history will build up here once Ahmad starts closing deals."
          />
        </div>
      )}
    </div>
  );
}
