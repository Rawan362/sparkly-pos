"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { OrderStatus } from "@/lib/types";
import { StatTile } from "@/components/dashboard/StatTile";
import type { SalesPoint } from "@/components/dashboard/SalesChart";
import type { StatusCount } from "@/components/dashboard/OrdersStatusChart";
import {
  DateRangeFilter,
  isWithinRange,
  DAY_MS,
  type DateRangeKey,
  type CustomRange,
} from "@/components/dashboard/DateRangeFilter";

function defaultCustomRange(): CustomRange {
  const end = new Date();
  const start = new Date(end.getTime() - 29 * DAY_MS);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

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

const STATUSES: OrderStatus[] = [
  "PENDING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

type OrderRow = {
  order_total: number | null;
  order_status: string | null;
  created_at: string;
};

type ExpenseRow = { amount: number | null; expense_date: string };

type RawData = {
  orders: OrderRow[];
  expenses: ExpenseRow[];
  totalCustomers: number;
  vipCustomers: number;
  lowStockItems: number;
  salesByDay: SalesPoint[];
  salesByMonth: SalesPoint[];
};

export default function DashboardPage() {
  const { sellerId, seller } = useSeller();
  const { t, formatMoney } = useSettings();
  const [raw, setRaw] = useState<RawData | null>(null);
  const [range, setRange] = useState<DateRangeKey>("all");
  const [customRange, setCustomRange] = useState<CustomRange>(defaultCustomRange);

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
        supabase
          .from("expenses")
          .select("amount, expense_date")
          .eq("chat_id", sellerId),
      ]);

    const orders = (ordersRes.data ?? []) as OrderRow[];
    const expenses = (expensesRes.data ?? []) as ExpenseRow[];

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

    setRaw({
      orders,
      expenses,
      totalCustomers: customersCountRes.count ?? 0,
      vipCustomers: vipCountRes.count ?? 0,
      lowStockItems,
      salesByDay: orders.length === 0 ? [] : salesByDay,
      salesByMonth: orders.length === 0 ? [] : salesByMonth,
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

  // Recomputed client-side whenever the date range changes -- no refetch,
  // since `raw` already holds the seller's full order/expense history.
  const filtered = useMemo(() => {
    if (!raw) return null;
    const orders = raw.orders.filter((o) =>
      isWithinRange(o.created_at, range, customRange)
    );
    const expenses = raw.expenses.filter((e) =>
      isWithinRange(e.expense_date, range, customRange)
    );

    const totalSales = orders.reduce((sum, o) => sum + (o.order_total ?? 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount ?? 0), 0);
    const pendingOrders = orders.filter(
      (o) => o.order_status === "PENDING"
    ).length;
    const statusCounts: StatusCount[] = STATUSES.map((status) => ({
      status,
      count: orders.filter((o) => o.order_status === status).length,
    }));

    return {
      totalSales,
      totalOrders: orders.length,
      pendingOrders,
      totalExpenses,
      statusCounts,
    };
  }, [raw, range, customRange]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("Dashboard")}</h1>
          <p className="text-sm text-ink-soft">
            {seller?.business_name_location
              ? t("A quick look at {business}.").replace(
                  "{business}",
                  seller.business_name_location
                )
              : t("A quick look at how business is going.")}
          </p>
        </div>
        <DateRangeFilter
          value={range}
          onChange={setRange}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
      </div>

      {!raw || !filtered ? (
        <p className="text-ink-soft">{t("Loading dashboard…")}</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile
              label="Total sales"
              value={formatMoney(filtered.totalSales)}
              tone="brass"
            />
            <StatTile
              label="Total orders"
              value={filtered.totalOrders.toLocaleString()}
            />
            <StatTile
              label="Pending orders"
              value={filtered.pendingOrders.toLocaleString()}
              tone={filtered.pendingOrders > 0 ? "brass" : "ink"}
            />
            <StatTile
              label="Total expenses"
              value={formatMoney(filtered.totalExpenses)}
              href="/expenses"
            />
            <StatTile
              label="Total customers"
              value={raw.totalCustomers.toLocaleString()}
            />
            <StatTile
              label="VIP customers"
              value={raw.vipCustomers.toLocaleString()}
              tone="green"
            />
            <StatTile
              label="Low stock items"
              value={raw.lowStockItems.toLocaleString()}
              tone={raw.lowStockItems > 0 ? "red" : "ink"}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <SalesChart data={raw.salesByDay} />
            <OrdersStatusChart data={filtered.statusCounts} />
          </div>

          <SalesChart
            data={raw.salesByMonth}
            title="Sales — last 12 months"
            emptyMessage="No sales yet — a year of history will build up here once Ahmad starts closing deals."
          />
        </div>
      )}
    </div>
  );
}
