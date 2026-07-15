"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { probePurchaseCosts, type PurchaseCostLookup } from "@/lib/schemaProbe";
import type { Order, SellerProduct } from "@/lib/types";
import {
  DateRangeFilter,
  isWithinRange,
  DAY_MS,
  type DateRangeKey,
  type CustomRange,
} from "@/components/dashboard/DateRangeFilter";
import type { WeekdayPoint } from "@/components/reports/SalesByWeekdayChart";

const SalesByWeekdayChart = dynamic(
  () =>
    import("@/components/reports/SalesByWeekdayChart").then(
      (m) => m.SalesByWeekdayChart
    ),
  { ssr: false }
);

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon..Sun
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type OrderRow = Pick<
  Order,
  "product_name" | "product_price" | "order_total" | "quantity" | "created_at"
>;

type ProductAgg = {
  productName: string;
  orderCount: number;
  unitsSold: number;
  revenue: number;
  retailPrice: number | null;
  avgCost: number | null;
  profitPerUnit: number | null;
  estProfit: number | null;
};

function defaultCustomRange(): CustomRange {
  const end = new Date();
  const start = new Date(end.getTime() - 29 * DAY_MS);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function ReportsPage() {
  const { sellerId } = useSeller();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [products, setProducts] = useState<SellerProduct[] | null>(null);
  const [costs, setCosts] = useState<PurchaseCostLookup | null>(null);
  const [range, setRange] = useState<DateRangeKey>("30d");
  const [customRange, setCustomRange] = useState<CustomRange>(defaultCustomRange);
  const [sortBy, setSortBy] = useState<"revenue" | "orderCount">("revenue");

  const load = useCallback(async () => {
    if (!sellerId) return;
    const [ordersRes, productsRes, costsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("product_name, product_price, order_total, quantity, created_at")
        .eq("seller_id", sellerId),
      supabase.from("seller_products").select("*").eq("chat_id", sellerId),
      probePurchaseCosts(sellerId),
    ]);
    setOrders((ordersRes.data ?? []) as OrderRow[]);
    setProducts(productsRes.data ?? []);
    setCosts(costsRes);
  }, [sellerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useRealtimeRefresh("orders", sellerId ? `seller_id=eq.${sellerId}` : undefined, load);
  useRealtimeRefresh(
    "seller_products",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  const filteredOrders = useMemo(() => {
    if (!orders) return [];
    return orders.filter((o) => isWithinRange(o.created_at, range, customRange));
  }, [orders, range, customRange]);

  const bestSellers = useMemo<ProductAgg[]>(() => {
    if (!products) return [];
    const byName = new Map<string, { orderCount: number; unitsSold: number; revenue: number }>();
    for (const o of filteredOrders) {
      const name = o.product_name ?? "Unknown product";
      const entry = byName.get(name) ?? { orderCount: 0, unitsSold: 0, revenue: 0 };
      entry.orderCount += 1;
      entry.unitsSold += o.quantity ?? 1;
      entry.revenue += o.order_total ?? 0;
      byName.set(name, entry);
    }

    return Array.from(byName.entries()).map(([productName, agg]) => {
      const product = products.find((p) => p.product_name === productName) ?? null;
      const avgCost =
        (product && costs?.costByProductId.get(product.id)) ??
        costs?.costByProductName.get(productName) ??
        null;
      const retailPrice = product?.retail_price ?? null;
      const profitPerUnit =
        retailPrice != null && avgCost != null ? retailPrice - avgCost : null;
      return {
        productName,
        orderCount: agg.orderCount,
        unitsSold: agg.unitsSold,
        revenue: agg.revenue,
        retailPrice,
        avgCost: avgCost ?? null,
        profitPerUnit,
        estProfit: profitPerUnit != null ? profitPerUnit * agg.unitsSold : null,
      };
    });
  }, [filteredOrders, products, costs]);

  const sortedBestSellers = useMemo(() => {
    const list = [...bestSellers];
    list.sort((a, b) =>
      sortBy === "revenue" ? b.revenue - a.revenue : b.orderCount - a.orderCount
    );
    return list;
  }, [bestSellers, sortBy]);

  const salesByWeekday = useMemo<WeekdayPoint[]>(() => {
    const totals = new Map<number, number>();
    for (const day of WEEKDAY_ORDER) totals.set(day, 0);
    for (const o of filteredOrders) {
      const day = new Date(o.created_at).getDay();
      totals.set(day, (totals.get(day) ?? 0) + (o.order_total ?? 0));
    }
    return WEEKDAY_ORDER.map((day, i) => ({
      label: WEEKDAY_LABELS[i],
      total: totals.get(day) ?? 0,
    }));
  }, [filteredOrders]);

  const profitDataAvailable = costs?.available ?? false;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-ink-soft">
            Best sellers, profit estimates, and sales patterns over time.
          </p>
        </div>
        <DateRangeFilter
          value={range}
          onChange={setRange}
          customRange={customRange}
          onCustomRangeChange={setCustomRange}
        />
      </div>

      {!orders || !products ? (
        <p className="text-ink-soft">Loading reports…</p>
      ) : (
        <div className="flex flex-col gap-4">
          <SalesByWeekdayChart data={salesByWeekday} />

          <div className="paper-card overflow-x-auto">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-line px-5 py-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                Best-selling products
              </h2>
              <div className="flex gap-2">
                {(["revenue", "orderCount"] as const).map((key) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={clsx(
                      "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
                      sortBy === key
                        ? "border-brass bg-brass-soft text-brass-dark"
                        : "border-paper-line text-ink-soft hover:border-brass"
                    )}
                  >
                    By {key === "revenue" ? "revenue" : "order count"}
                  </button>
                ))}
              </div>
            </div>

            {sortedBestSellers.length === 0 ? (
              <p className="px-5 py-10 text-center text-ink-soft">
                No sales in this range yet.
              </p>
            ) : (
              <table className="w-full min-w-[760px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                    <th className="px-4 py-3 font-medium">#</th>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-right">Orders</th>
                    <th className="px-4 py-3 font-medium text-right">Units sold</th>
                    <th className="px-4 py-3 font-medium text-right">Revenue</th>
                    <th className="px-4 py-3 font-medium text-right">Profit / unit</th>
                    <th className="px-4 py-3 font-medium text-right">Est. profit</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBestSellers.map((p, i) => (
                    <tr key={p.productName} className="border-b border-paper-line last:border-0">
                      <td className="px-4 py-2 tabular text-ink-faint">{i + 1}</td>
                      <td className="px-4 py-2 font-medium" dir="auto">
                        {p.productName}
                      </td>
                      <td className="px-4 py-2 text-right tabular">{p.orderCount}</td>
                      <td className="px-4 py-2 text-right tabular">{p.unitsSold}</td>
                      <td className="px-4 py-2 text-right tabular font-semibold">
                        {p.revenue.toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right tabular">
                        {p.profitPerUnit != null ? (
                          p.profitPerUnit.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        ) : (
                          <span className="text-ink-faint">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right tabular">
                        {p.estProfit != null ? (
                          p.estProfit.toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          })
                        ) : (
                          <span className="text-ink-faint">N/A</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {!profitDataAvailable && (
              <p className="border-t border-paper-line px-5 py-3 text-xs text-ink-faint">
                Profit is shown as N/A because no purchase-cost data was found
                for your products yet. Once purchase costs are recorded,
                profit estimates will appear here automatically.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
