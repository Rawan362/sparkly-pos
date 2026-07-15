"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type {
  Customer,
  Invoice,
  InvoiceStatus,
  Order,
  PricingTier,
  SellerProduct,
} from "@/lib/types";
import { Stamp } from "@/components/ui/Stamp";
import { Receipt } from "@/components/checkout/Receipt";
import { WholesaleInvoice } from "@/components/checkout/WholesaleInvoice";
import type { CompletedSale } from "@/components/checkout/cartMath";
import { InvoiceDocument } from "@/components/invoices/InvoiceDocument";
import {
  GenerateInvoiceModal,
  type OrderGroup,
} from "@/components/invoices/GenerateInvoiceModal";

type InvoiceGroup = OrderGroup & {
  paymentMethod: string | null;
  isWholesale: boolean;
  pricingTierId: string | null;
  paidAmount: number;
  itemCount: number;
};

const STATUS_TONE: Record<InvoiceStatus, "ink" | "brass" | "green"> = {
  draft: "ink",
  sent: "brass",
  paid: "green",
};

export default function InvoicesPage() {
  const { sellerId } = useSeller();
  const [tab, setTab] = useState<"invoices" | "history">("invoices");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [tiers, setTiers] = useState<PricingTier[] | null>(null);
  const [products, setProducts] = useState<SellerProduct[] | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(
    null
  );
  const [showGenerate, setShowGenerate] = useState(false);

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

  const loadInvoices = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("invoices")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setInvoices(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    loadInvoices();
  }, [load, loadInvoices]);

  useRealtimeRefresh(
    "orders",
    sellerId ? `seller_id=eq.${sellerId}` : undefined,
    load
  );
  useRealtimeRefresh(
    "invoices",
    sellerId ? `seller_id=eq.${sellerId}` : undefined,
    loadInvoices
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
          orderId: first.id,
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

  const updateInvoiceStatus = async (id: string, status: InvoiceStatus) => {
    setInvoices(
      (prev) => prev?.map((i) => (i.id === id ? { ...i, status } : i)) ?? null
    );
    await supabase.from("invoices").update({ status }).eq("id", id);
  };

  const selectedInvoice =
    invoices?.find((i) => i.id === selectedInvoiceId) ?? null;

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

  if (selectedInvoice) {
    return (
      <InvoiceDocument
        invoice={selectedInvoice}
        onBack={() => setSelectedInvoiceId(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-ink-soft">
            Formal invoices you generate from a sale, plus a reprintable
            history of every sale rung up through POS.
          </p>
        </div>
        {tab === "invoices" && (
          <button
            onClick={() => setShowGenerate(true)}
            className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised"
          >
            + Generate Invoice
          </button>
        )}
      </div>

      {showGenerate && sellerId && (
        <GenerateInvoiceModal
          sellerId={sellerId}
          groups={groups}
          onClose={() => setShowGenerate(false)}
          onCreated={loadInvoices}
        />
      )}

      <div className="mb-4 flex gap-2">
        {(["invoices", "history"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              "rounded-full border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors",
              tab === t
                ? "border-brass bg-brass-soft text-brass-dark"
                : "border-paper-line text-ink-soft hover:border-brass"
            )}
          >
            {t === "invoices" ? "Invoices" : "Sales History"}
          </button>
        ))}
      </div>

      {tab === "invoices" ? (
        !invoices ? (
          <p className="text-ink-soft">Loading invoices…</p>
        ) : invoices.length === 0 ? (
          <div className="paper-card px-6 py-10 text-center text-ink-soft">
            No invoices yet — generate one from a past sale above.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="paper-card flex flex-wrap items-center justify-between gap-3 px-5 py-4"
              >
                <button
                  onClick={() => setSelectedInvoiceId(inv.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="font-medium tabular">
                    {inv.invoice_number ? `No. ${inv.invoice_number}` : "No invoice number"}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {new Date(inv.created_at).toLocaleString()}
                    {inv.customer_phone ? ` · ${inv.customer_phone}` : ""}
                  </p>
                </button>
                <div className="flex shrink-0 items-center gap-3">
                  <select
                    value={inv.status}
                    onChange={(e) =>
                      updateInvoiceStatus(inv.id, e.target.value as InvoiceStatus)
                    }
                    className="rounded-md border border-paper-line bg-paper px-2 py-1.5 text-sm outline-none focus:border-brass"
                  >
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                  </select>
                  <Stamp tone={STATUS_TONE[inv.status]}>{inv.status}</Stamp>
                  <p className="tabular w-20 text-right text-lg font-semibold">
                    {inv.total.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )
      ) : !orders ? (
        <p className="text-ink-soft">Loading sales…</p>
      ) : groups.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          No sales yet — completed POS sales will show up here.
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
                    {customer?.name || g.phone || "Walk-in customer"}
                  </p>
                  <p className="text-xs text-ink-faint">
                    {new Date(g.createdAt).toLocaleString()} · {g.itemCount}{" "}
                    item{g.itemCount === 1 ? "" : "s"}
                    {g.invoiceNumber ? ` · No. ${g.invoiceNumber}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Stamp tone={g.isWholesale ? "brass" : "ink"}>
                    {g.isWholesale ? "Wholesale" : "Retail"}
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
                      ? "Paid"
                      : g.paidAmount > 0
                        ? "Partial"
                        : "Debt"}
                  </Stamp>
                  <p className="tabular w-20 text-right text-lg font-semibold">
                    {g.total.toLocaleString()}
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
