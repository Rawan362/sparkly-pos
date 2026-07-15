"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import { useLocations } from "@/lib/useLocations";
import type {
  Customer,
  CustomUnit,
  PosSettings,
  PricingTier,
  SellerProduct,
} from "@/lib/types";
import { ProductPicker } from "@/components/checkout/ProductPicker";
import { CustomerPicker } from "@/components/checkout/CustomerPicker";
import { QuantityStepper } from "@/components/checkout/QuantityStepper";
import { Receipt } from "@/components/checkout/Receipt";
import { WholesaleInvoice } from "@/components/checkout/WholesaleInvoice";
import {
  apportion,
  unitPriceFor,
  type CartLine,
  type CompletedSale,
} from "@/components/checkout/cartMath";

const PAYMENT_METHODS = ["Cash", "Bank Transfer", "Other"];
const WHOLESALE = "wholesale";

export default function PosPage() {
  const { sellerId } = useSeller();
  const { t, formatMoney } = useSettings();
  const { locations, defaultLocation } = useLocations();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [products, setProducts] = useState<SellerProduct[] | null>(null);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [tiers, setTiers] = useState<PricingTier[] | null>(null);
  const [units, setUnits] = useState<CustomUnit[] | null>(null);
  const [posSettings, setPosSettings] = useState<PosSettings | null>(null);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  // "" = retail, "wholesale" = each product's own wholesale_price, else a
  // pricing_tiers.id (a % adjustment on top of retail_price).
  const [selectedPricing, setSelectedPricing] = useState<string>("");
  const [discountMode, setDiscountMode] = useState<"percent" | "amount">(
    "percent"
  );
  const [discountValue, setDiscountValue] = useState("");
  const [shippingValue, setShippingValue] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0]);
  const [paymentStatus, setPaymentStatus] = useState<
    "full" | "partial" | "debt"
  >("full");
  const [partialAmount, setPartialAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedSale | null>(
    null
  );

  const load = useCallback(async () => {
    if (!sellerId) return;
    const [productsRes, customersRes, tiersRes, unitsRes, settingsRes] =
      await Promise.all([
        supabase
          .from("seller_products")
          .select("*")
          .eq("chat_id", sellerId)
          .eq("is_active", true)
          .order("product_name", { ascending: true }),
        supabase
          .from("customers")
          .select("*")
          .eq("seller_id", sellerId)
          .order("name", { ascending: true }),
        supabase
          .from("pricing_tiers")
          .select("*")
          .eq("chat_id", sellerId)
          .order("name", { ascending: true }),
        supabase.from("custom_units").select("*").eq("chat_id", sellerId),
        supabase
          .from("pos_settings")
          .select("*")
          .eq("chat_id", sellerId)
          .maybeSingle(),
      ]);

    setProducts(productsRes.data ?? []);
    setCustomers(customersRes.data ?? []);
    // Pricing always opens on Retail regardless of any tier marked
    // "default" on the Pricing Tiers page -- Wholesale (or a custom tier)
    // is always an explicit choice the cashier makes per sale.
    setTiers(tiersRes.data ?? []);
    setUnits(unitsRes.data ?? []);
    setPosSettings(
      settingsRes.data ?? {
        chat_id: sellerId,
        inventory_tracking_active: false,
        low_stock_alerts_active: false,
        low_stock_default_threshold: null,
        auto_invoice_active: false,
        invoice_prefix: null,
        next_invoice_number: null,
        language: "en",
        currency: "USD",
      }
    );
  }, [sellerId]);

  useEffect(() => {
    // Adopts the default location once useLocations resolves it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!locationId && defaultLocation) setLocationId(defaultLocation.id);
  }, [locationId, defaultLocation]);

  useEffect(() => {
    // Loads the seller's catalog/customers/tiers once for this checkout
    // session -- intentionally not live-synced, so an in-progress sale
    // isn't disrupted by unrelated changes elsewhere while ringing it up.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const isWholesale = selectedPricing === WHOLESALE;
  const tier = useMemo(
    () => tiers?.find((t) => t.id === selectedPricing) ?? null,
    [tiers, selectedPricing]
  );

  const priceFor = useCallback(
    (product: SellerProduct) =>
      isWholesale
        ? product.wholesale_price ?? product.retail_price ?? 0
        : unitPriceFor(product, tier),
    [isWholesale, tier]
  );

  const lines = useMemo(() => {
    if (!products) return [];
    return cart
      .map((line) => {
        const product = products.find((p) => p.id === line.productId);
        if (!product) return null;
        const unitPrice = priceFor(product);
        return {
          product,
          quantity: line.quantity,
          unitPrice,
          lineSubtotal: unitPrice * line.quantity,
        };
      })
      .filter((l): l is NonNullable<typeof l> => l !== null);
  }, [cart, products, priceFor]);

  const subtotal = lines.reduce((sum, l) => sum + l.lineSubtotal, 0);
  const discountNum = Number(discountValue) || 0;
  const discountAmount =
    discountMode === "percent"
      ? subtotal * (discountNum / 100)
      : Math.min(discountNum, subtotal);
  const shippingAmount = Number(shippingValue) || 0;
  const total = Math.max(0, subtotal - discountAmount + shippingAmount);
  const paidAmount =
    paymentStatus === "full"
      ? total
      : paymentStatus === "debt"
        ? 0
        : Math.min(Number(partialAmount) || 0, total);

  const addToCart = (product: SellerProduct) => {
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      const cap = product.track_stock ? product.stock_quantity ?? 0 : Infinity;
      if (existing) {
        if (existing.quantity >= cap) return prev;
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      if (cap <= 0) return prev;
      return [...prev, { productId: product.id, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, next: number) => {
    setCart((prev) => {
      if (next <= 0) return prev.filter((l) => l.productId !== productId);
      const product = products?.find((p) => p.id === productId);
      const cap =
        product?.track_stock ? product.stock_quantity ?? 0 : Infinity;
      return prev.map((l) =>
        l.productId === productId
          ? { ...l, quantity: Math.min(next, cap) }
          : l
      );
    });
  };

  const removeLine = (productId: string) =>
    setCart((prev) => prev.filter((l) => l.productId !== productId));

  const resetForNewSale = () => {
    setCart([]);
    setSelectedCustomer(null);
    setDiscountValue("");
    setDiscountMode("percent");
    setShippingValue("");
    setPaymentStatus("full");
    setPartialAmount("");
    setCompletedSale(null);
    setError(null);
  };

  const completeSale = async () => {
    if (!sellerId || lines.length === 0) return;
    setSaving(true);
    setError(null);

    const checkoutId = crypto.randomUUID();
    const effectiveDiscountPercent = subtotal > 0 ? (discountAmount / subtotal) * 100 : null;
    const now = new Date().toISOString();

    let invoiceNumber: string | null = null;
    if (posSettings?.auto_invoice_active) {
      const nextNumber = posSettings.next_invoice_number ?? 1;
      invoiceNumber = `${posSettings.invoice_prefix ?? ""}${nextNumber}`;
    }

    const lineTotals = apportion(lines.map((l) => l.lineSubtotal), total);
    const linePaid = apportion(lines.map((l) => l.lineSubtotal), paidAmount);
    const fullyPaid = paidAmount >= total - 0.005;

    const rows = lines.map((l, i) => ({
      seller_id: sellerId,
      phone: selectedCustomer?.phone ?? null,
      customer_id: null,
      product_name: l.product.product_name,
      product_price: Math.round(l.unitPrice * 100) / 100,
      quantity: l.quantity,
      order_total: lineTotals[i],
      delivery_address: null,
      order_status: "DELIVERED",
      confirmed_at: now,
      shipped_at: now,
      cod_collected: paymentMethod === "Cash" && fullyPaid,
      checkout_id: checkoutId,
      pricing_tier_id: tier?.id ?? null,
      discount_percent: effectiveDiscountPercent,
      payment_method: paymentMethod,
      amount_paid: linePaid[i],
      invoice_number: invoiceNumber,
      is_wholesale: isWholesale,
      location_id: locationId,
    }));

    const { error: insertError } = await supabase.from("orders").insert(rows);
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    await Promise.all(
      lines
        .filter((l) => l.product.track_stock)
        .map((l) =>
          supabase
            .from("seller_products")
            .update({
              stock_quantity: Math.max(
                0,
                (l.product.stock_quantity ?? 0) - l.quantity
              ),
            })
            .eq("id", l.product.id)
        )
    );

    if (posSettings?.auto_invoice_active) {
      await supabase
        .from("pos_settings")
        .update({ next_invoice_number: (posSettings.next_invoice_number ?? 1) + 1 })
        .eq("chat_id", sellerId);
    }

    setCompletedSale({
      lines: lines.map((l, i) => ({
        name: l.product.product_name,
        code: l.product.product_code,
        quantity: l.quantity,
        unitLabel:
          units?.find((u) => u.id === l.product.unit_id)?.short_name ?? null,
        unitPrice: l.unitPrice,
        total: lineTotals[i],
      })),
      customer: selectedCustomer,
      tierName: isWholesale ? "Wholesale" : tier?.name ?? null,
      isWholesale,
      subtotal,
      discountAmount,
      shippingAmount,
      total,
      paidAmount,
      paymentMethod,
      fullyPaid,
      invoiceNumber,
      completedAt: now,
    });
    setSaving(false);
    load();
  };

  if (completedSale) {
    return completedSale.isWholesale ? (
      <WholesaleInvoice sale={completedSale} onNewSale={resetForNewSale} />
    ) : (
      <Receipt sale={completedSale} onNewSale={resetForNewSale} />
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("POS")}</h1>
          <p className="text-sm text-ink-soft">
            {t("Ring up an in-person or phone sale on the spot.")}
          </p>
        </div>
        {locations && locations.length > 1 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-ink-soft">{t("Location")}</label>
            <select
              value={locationId ?? ""}
              onChange={(e) => setLocationId(e.target.value)}
              className="rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {!products || !customers || !tiers || !units ? (
        <p className="text-ink-soft">{t("Loading POS…")}</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <ProductPicker
              products={products}
              onAdd={addToCart}
              priceFor={priceFor}
            />
          </div>

          <div className="flex flex-col gap-3 lg:col-span-2">
            <div className="paper-card px-4 py-4">
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-soft">
                {t("Ticket")}
              </h2>
              {lines.length === 0 ? (
                <p className="py-6 text-center text-sm text-ink-faint">
                  {t("Cart is empty — tap a product to add it.")}
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
                          {formatMoney(l.unitPrice)} {t("each")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(l.product.id, l.quantity - 1)
                          }
                          className="h-6 w-6 rounded border border-paper-line text-ink-soft hover:border-brass"
                        >
                          −
                        </button>
                        <QuantityStepper
                          quantity={l.quantity}
                          onChange={(next) =>
                            updateQuantity(l.product.id, next)
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateQuantity(l.product.id, l.quantity + 1)
                          }
                          className="h-6 w-6 rounded border border-paper-line text-ink-soft hover:border-brass"
                        >
                          +
                        </button>
                      </div>
                      <p className="tabular w-16 shrink-0 text-right text-sm font-medium">
                        {formatMoney(l.lineSubtotal)}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeLine(l.product.id)}
                        aria-label={`Remove ${l.product.product_name}`}
                        className="shrink-0 text-xs text-stamp-red hover:opacity-70"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="paper-card flex flex-col gap-3 px-4 py-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("Customer")}
                </p>
                <CustomerPicker
                  customers={customers}
                  selected={selectedCustomer}
                  onSelect={setSelectedCustomer}
                />
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("Pricing tier")}
                </p>
                <select
                  value={selectedPricing}
                  onChange={(e) => setSelectedPricing(e.target.value)}
                  className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
                >
                  <option value="">{t("Retail (no tier)")}</option>
                  <option value={WHOLESALE}>{t("Wholesale (product price)")}</option>
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.id}>
                      {tier.name} ({tier.adjustment_percent > 0 ? "+" : ""}
                      {tier.adjustment_percent}%)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("Discount")}
                </p>
                <div className="flex gap-2">
                  <select
                    value={discountMode}
                    onChange={(e) =>
                      setDiscountMode(e.target.value as "percent" | "amount")
                    }
                    className="rounded-md border border-paper-line bg-paper px-2 py-2 text-sm outline-none focus:border-brass"
                  >
                    <option value="percent">%</option>
                    <option value="amount">{t("Amount")}</option>
                  </select>
                  <input
                    type="number"
                    min="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    placeholder="0"
                    className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm tabular outline-none focus:border-brass"
                  />
                </div>
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("Shipping charges")}
                </p>
                <input
                  type="number"
                  min="0"
                  value={shippingValue}
                  onChange={(e) => setShippingValue(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm tabular outline-none focus:border-brass"
                />
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {t("Payment")}
                </p>
                <div className="flex gap-2">
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="flex-1 rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {t(m)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={paymentStatus}
                    onChange={(e) =>
                      setPaymentStatus(
                        e.target.value as "full" | "partial" | "debt"
                      )
                    }
                    className="flex-1 rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
                  >
                    <option value="full">{t("Paid in full")}</option>
                    <option value="partial">{t("Partial payment")}</option>
                    <option value="debt">{t("Debt (pay later)")}</option>
                  </select>
                </div>
                {paymentStatus === "partial" && (
                  <input
                    type="number"
                    min="0"
                    value={partialAmount}
                    onChange={(e) => setPartialAmount(e.target.value)}
                    placeholder={t("Amount paid now")}
                    className="mt-2 w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm tabular outline-none focus:border-brass"
                  />
                )}
              </div>

              <div className="border-t border-paper-line pt-3 text-sm">
                <div className="flex justify-between text-ink-soft">
                  <span>{t("Subtotal")}</span>
                  <span className="tabular">{formatMoney(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <span>{t("Discount")}</span>
                    <span className="tabular">
                      −{formatMoney(discountAmount)}
                    </span>
                  </div>
                )}
                {shippingAmount > 0 && (
                  <div className="flex justify-between text-ink-soft">
                    <span>{t("Shipping")}</span>
                    <span className="tabular">
                      +{formatMoney(shippingAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold">
                  <span>{t("Total")}</span>
                  <span className="tabular">{formatMoney(total)}</span>
                </div>
                {paymentStatus === "partial" && (
                  <div className="flex justify-between text-ink-soft">
                    <span>{t("Paid now")}</span>
                    <span className="tabular">{formatMoney(paidAmount)}</span>
                  </div>
                )}
                {paymentStatus === "debt" && (
                  <div className="flex justify-between text-stamp-red">
                    <span>{t("On debt")}</span>
                    <span className="tabular">{formatMoney(total)}</span>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-stamp-red">{error}</p>}

              <button
                onClick={completeSale}
                disabled={saving || lines.length === 0}
                className="rounded-md bg-ink px-4 py-3 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
              >
                {saving ? t("Completing sale…") : t("Complete Sale")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
