"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { Customer, Order, PricingTier, SellerProduct } from "@/lib/types";
import { Stamp } from "@/components/ui/Stamp";
import { Receipt } from "@/components/checkout/Receipt";
import { WholesaleInvoice } from "@/components/checkout/WholesaleInvoice";
import type { CompletedSale } from "@/components/checkout/cartMath";

type InvoiceGroup = {
  key: string;
  createdAt: string;
  phone: string | null;
  invoiceNumber: string | null;
  paymentMethod: string | null;
  isWholesale: boolean;
  pricingTierId: string | null;
  discountPercent: number | null;
  total: number;
  paidAmount: number;
  rawSubtotal: number;
  itemCount: number;
  orders: Order[];
};

export default function InvoicesPage() {
  const { sellerId } = useSeller();
  const { t, formatMoney } = useSettings();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [tiers, setTiers] = useState<PricingTier[] | null>(null);
  const [products, setProducts] = useState<SellerProduct[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!sellerId) return;
    const [ordersRes, customersRes, tiersRes, productsRes] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("seller_id", sellerId)
        .order("created_at", { ascending: false }),
      supabase.from("customers").select("*").eq("seller_id", sellerId),
      supabase.from("pricing_tiers").select("*").eq("chat_id", sellerId),
      supabase.from("seller_products").select("*").eq("chat_id", sellerId),
    ]);
    setOrders(ordersRes.data ?? []);
    setCustomers(customersRes.data ?? []);
    setTiers(tiersRes.data ?? []);
    setProducts(productsRes.data ?? []);
  }, [sellerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useRealtimeRefresh(
    "orders",
    sellerId ? `seller_id=eq.${sellerId}` : undefined,
    load
  );

  const groups = useMemo<InvoiceGroup[]>(() => {
    if (!orders) return [];
    const map = new Map<string, Order[]>();
    for (const o of orders) {
      const key = o.checkout_id ?? `single-${o.id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(o);
    }
    return Array.from(map.entries())
      .map(([key, rows]) => {
        const first = rows[0];
        const total = rows.reduce((s, r) => s + (r.order_total ?? 0), 0);
        const paidAmount = rows.reduce((s, r) => s + (r.amount_paid ?? 0), 0);
        const rawSubtotal = rows.reduce(
          (s, r) => s + (r.product_price ?? 0) * (r.quantity ?? 1),
          0
        );
        return {
          key,
          createdAt: first.created_at,
          phone: first.phone,
          invoiceNumber: first.invoice_number,
          paymentMethod: first.payment_method,
          isWholesale: first.is_wholesale,
          pricingTierId: first.pricing_tier_id,
          discountPercent: first.discount_percent,
          total,
          paidAmount,
          rawSubtotal,
          itemCount: rows.length,
          orders: rows,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
  }, [orders]);

  const selectedGroup = groups.find((g) => g.key === selectedKey) ?? null;

  const toCompletedSale = (group: InvoiceGroup): CompletedSale => {
    const customer =
      customers?.find((c) => c.phone === group.phone) ??
      (group.phone
        ? {
            phone: group.phone,
            name: null,
            is_wholesale: group.isWholesale,
            total_orders: null,
            total_spent: null,
            last_purchase_date: null,
            is_vip: false,
            list_status: null,
            seller_id: sellerId ?? "",
          }
        : null);
    const tier = tiers?.find((t) => t.id === group.pricingTierId) ?? null;
    const discountAmount = group.rawSubtotal * ((group.discountPercent ?? 0) / 100);
    const shippingRaw = group.total - group.rawSubtotal + discountAmount;
    const shippingAmount = Math.abs(shippingRaw) < 0.01 ? 0 : shippingRaw;
    const fullyPaid = group.paidAmount >= group.total - 0.005;

    return {
      lines: group.orders.map((o) => ({
        name: o.product_name ?? "—",
        code:
          products?.find((p) => p.product_name === o.product_name)
            ?.product_code ?? null,
        quantity: o.quantity ?? 1,
        unitLabel: null,
        unitPrice: o.product_price ?? 0,
        total: o.order_total ?? 0,
      })),
      customer,
      tierName: group.isWholesale ? "Wholesale" : tier?.name ?? null,
      isWholesale: group.isWholesale,
      subtotal: group.rawSubtotal,
      discountAmount,
      shippingAmount,
      total: group.total,
      paidAmount: group.paidAmount,
      paymentMethod: group.paymentMethod ?? "—",
      fullyPaid,
      invoiceNumber: group.invoiceNumber,
      completedAt: group.createdAt,
    };
  };

  if (selectedGroup) {
    const sale = toCompletedSale(selectedGroup);
    const props = {
      sale,
      onNewSale: () => setSelectedKey(null),
      heading: "Invoice",
      subheading: "Reprint of an earlier sale.",
      actionLabel: "Back to invoices",
    };
    return sale.isWholesale ? (
      <WholesaleInvoice {...props} />
    ) : (
      <Receipt {...props} />
    );
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">{t("Invoices")}</h1>
        <p className="text-sm text-ink-soft">
          {t("Every sale rung up through POS — click one to view or print its invoice again.")}
        </p>
      </div>

      {!orders ? (
        <p className="text-ink-soft">{t("Loading invoices…")}</p>
      ) : groups.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          {t("No sales yet — completed POS sales will show up here.")}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const customer = customers?.find((c) => c.phone === g.phone);
            const balance = g.total - g.paidAmount;
            return (
              <button
                key={g.key}
                onClick={() => setSelectedKey(g.key)}
                className="paper-card flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:border-brass"
              >
                <div className="min-w-0">
                  <p className="font-medium" dir="auto">
                    {customer?.name || g.phone || t("Walk-in customer")}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {new Date(g.createdAt).toLocaleString()} · {g.itemCount}{" "}
                    {g.itemCount === 1 ? t("item") : t("items")}
                    {g.invoiceNumber ? ` · ${t("No.")} ${g.invoiceNumber}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Stamp tone={g.isWholesale ? "brass" : "ink"}>
                    {g.isWholesale ? t("Wholesale") : t("Retail")}
                  </Stamp>
                  <Stamp
                    tone={
                      balance <= 0.005
                        ? "green"
                        : g.paidAmount > 0
                          ? "brass"
                          : "red"
                    }
                  >
                    {balance <= 0.005
                      ? t("Paid")
                      : g.paidAmount > 0
                        ? t("Partial")
                        : t("Debt")}
                  </Stamp>
                  <p className="tabular w-20 text-right text-lg font-semibold">
                    {formatMoney(g.total)}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
