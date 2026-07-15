"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useStaff } from "@/lib/StaffContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { Quote, QuoteLineItem, SellerProduct } from "@/lib/types";
import { Stamp } from "@/components/ui/Stamp";
import { ProductPicker } from "@/components/checkout/ProductPicker";
import { QuantityStepper } from "@/components/checkout/QuantityStepper";
import { apportion } from "@/components/checkout/cartMath";

type CartLine = { product: SellerProduct; quantity: number };

export default function QuotesPage() {
  const { sellerId } = useSeller();
  const { actorName } = useStaff();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [products, setProducts] = useState<SellerProduct[] | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [converting, setConverting] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountValue, setDiscountValue] = useState("");
  const [shippingValue, setShippingValue] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("quotes")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setQuotes(data ?? []));
  }, [sellerId]);

  const loadProducts = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("seller_products")
      .select("*")
      .eq("chat_id", sellerId)
      .eq("is_active", true)
      .order("product_name", { ascending: true })
      .then(({ data }) => setProducts(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
    loadProducts();
  }, [load, loadProducts]);

  useRealtimeRefresh(
    "quotes",
    sellerId ? `seller_id=eq.${sellerId}` : undefined,
    load
  );

  const addToCart = (product: SellerProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, next: number) => {
    setCart((prev) => {
      if (next <= 0) return prev.filter((l) => l.product.id !== productId);
      return prev.map((l) =>
        l.product.id === productId ? { ...l, quantity: next } : l
      );
    });
  };

  const priceFor = (product: SellerProduct) => product.retail_price ?? 0;

  const lines = useMemo(
    () =>
      cart.map((l) => ({
        product: l.product,
        quantity: l.quantity,
        unitPrice: priceFor(l.product),
        lineTotal: priceFor(l.product) * l.quantity,
      })),
    [cart]
  );

  const subtotal = lines.reduce((s, l) => s + l.lineTotal, 0);
  const discountAmount = Number(discountValue) || 0;
  const shippingAmount = Number(shippingValue) || 0;
  const total = Math.max(0, subtotal - discountAmount + shippingAmount);

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCart([]);
    setDiscountValue("");
    setShippingValue("");
  };

  const saveQuote = async () => {
    if (!sellerId || lines.length === 0) return;
    setSaving(true);
    const items: QuoteLineItem[] = lines.map((l) => ({
      product_id: l.product.id,
      name: l.product.product_name,
      code: l.product.product_code,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      total: l.lineTotal,
    }));
    await supabase.from("quotes").insert({
      seller_id: sellerId,
      customer_phone: customerPhone.trim() || null,
      customer_name: customerName.trim() || null,
      items,
      subtotal,
      discount: discountAmount,
      shipping: shippingAmount,
      total,
      status: "quoted",
    });
    setSaving(false);
    resetForm();
    setShowNew(false);
    load();
  };

  const convertToOrder = async (quote: Quote) => {
    if (!sellerId) return;
    setConverting(quote.id);
    const checkoutId = crypto.randomUUID();
    const lineTotals = apportion(
      quote.items.map((i) => i.total),
      quote.total
    );
    const rows = quote.items.map((item, i) => ({
      seller_id: sellerId,
      phone: quote.customer_phone,
      customer_id: null,
      product_name: item.name,
      product_price: item.unit_price,
      quantity: item.quantity,
      order_total: lineTotals[i],
      delivery_address: null,
      order_status: "PENDING",
      checkout_id: checkoutId,
      amount_paid: 0,
      is_wholesale: false,
    }));
    await supabase.from("orders").insert(rows);
    await supabase.from("quotes").update({ status: "converted" }).eq("id", quote.id);
    await supabase.from("activity_log").insert({
      chat_id: sellerId,
      actor_name: actorName,
      action_description: `Converted quote for ${quote.customer_name || quote.customer_phone || "a customer"} into an order`,
    });
    setConverting(null);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Quotes</h1>
          <p className="text-sm text-ink-soft">
            Put together a price quote for a customer — convert it to a real
            order once they say yes.
          </p>
        </div>
        {!showNew && (
          <button
            onClick={() => setShowNew(true)}
            className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised"
          >
            + New Quote
          </button>
        )}
      </div>

      {showNew && (
        <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            {!products ? (
              <p className="text-ink-soft">Loading products…</p>
            ) : (
              <ProductPicker products={products} onAdd={addToCart} priceFor={priceFor} />
            )}
          </div>

          <div className="flex flex-col gap-3 lg:col-span-2">
            <div className="paper-card px-4 py-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
                Quote items
              </h2>
              {lines.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-faint">
                  Cart is empty — tap a product to add it.
                </p>
              ) : (
                <div className="flex flex-col divide-y divide-paper-line">
                  {lines.map((l) => (
                    <div
                      key={l.product.id}
                      className="flex items-center justify-between gap-2 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium" dir="auto">
                          {l.product.product_name}
                        </p>
                        <p className="tabular text-xs text-ink-faint">
                          {l.unitPrice.toLocaleString()} each
                        </p>
                      </div>
                      <QuantityStepper
                        quantity={l.quantity}
                        onChange={(next) => updateQuantity(l.product.id, next)}
                      />
                      <p className="tabular w-16 shrink-0 text-right text-sm font-medium">
                        {l.lineTotal.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="paper-card flex flex-col gap-3 px-4 py-4">
              <label className="text-sm">
                <span className="mb-1 block text-ink-soft">Customer name</span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-ink-soft">Customer phone</span>
                <input
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-ink-soft">Discount</span>
                <input
                  type="number"
                  min="0"
                  value={discountValue}
                  onChange={(e) => setDiscountValue(e.target.value)}
                  placeholder="0"
                  className="tabular w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block text-ink-soft">Shipping</span>
                <input
                  type="number"
                  min="0"
                  value={shippingValue}
                  onChange={(e) => setShippingValue(e.target.value)}
                  placeholder="0"
                  className="tabular w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
                />
              </label>

              <div className="border-t border-paper-line pt-3 text-sm">
                <div className="flex justify-between text-ink-soft">
                  <span>Subtotal</span>
                  <span className="tabular">{subtotal.toLocaleString()}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <span>Discount</span>
                    <span className="tabular">−{discountAmount.toLocaleString()}</span>
                  </div>
                )}
                {shippingAmount > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <span>Shipping</span>
                    <span className="tabular">+{shippingAmount.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span className="tabular">{total.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    resetForm();
                    setShowNew(false);
                  }}
                  className="flex-1 rounded-md border border-paper-line px-4 py-2 text-sm font-medium text-ink-soft"
                >
                  Cancel
                </button>
                <button
                  onClick={saveQuote}
                  disabled={saving || lines.length === 0}
                  className="flex-1 rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
                >
                  {saving ? "Saving…" : "Save quote"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!quotes ? (
        <p className="text-ink-soft">Loading quotes…</p>
      ) : quotes.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          No quotes yet — create your first one above.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {quotes.map((q) => (
            <div
              key={q.id}
              className="paper-card flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            >
              <div className="min-w-0">
                <p className="font-medium" dir="auto">
                  {q.customer_name || q.customer_phone || "Walk-in customer"}
                </p>
                <p className="text-xs text-ink-faint">
                  {new Date(q.created_at).toLocaleString()} · {q.items.length}{" "}
                  item{q.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <Stamp tone={q.status === "converted" ? "green" : "brass"}>
                  {q.status}
                </Stamp>
                <p className="tabular w-20 text-right text-lg font-semibold">
                  {q.total.toLocaleString()}
                </p>
                {q.status === "quoted" && (
                  <button
                    onClick={() => convertToOrder(q)}
                    disabled={converting === q.id}
                    className="rounded-md bg-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
                  >
                    {converting === q.id ? "Converting…" : "Convert to Order"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
