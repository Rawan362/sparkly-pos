"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldInputClass } from "@/components/ui/Field";
import { useSettings } from "@/lib/SettingsContext";
import { useLocations } from "@/lib/useLocations";
import type { SellerProduct, Supplier } from "@/lib/types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AddPurchaseModal({
  sellerId,
  suppliers,
  products,
  onClose,
  onCreated,
}: {
  sellerId: string;
  suppliers: Supplier[];
  products: SellerProduct[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useSettings();
  const { defaultLocation } = useLocations();
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [quantity, setQuantity] = useState("1");
  const [costPrice, setCostPrice] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || quantity === "" || Number(quantity) <= 0) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from("purchases").insert({
      chat_id: sellerId,
      supplier_id: supplierId || null,
      product_id: productId,
      quantity: Number(quantity),
      cost_price: costPrice === "" ? null : Number(costPrice),
      purchase_date: purchaseDate,
    });
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }

    // Restocks into the seller's default location -- product_stock_by_location
    // is the source of truth for stock going forward, not
    // seller_products.stock_quantity.
    const product = products.find((p) => p.id === productId);
    if (product?.track_stock && defaultLocation) {
      const { data: stockRow } = await supabase
        .from("product_stock_by_location")
        .select("stock_quantity")
        .eq("product_id", product.id)
        .eq("location_id", defaultLocation.id)
        .maybeSingle();
      await supabase.from("product_stock_by_location").upsert(
        {
          product_id: product.id,
          location_id: defaultLocation.id,
          stock_quantity:
            (stockRow?.stock_quantity ?? product.stock_quantity ?? 0) +
            Number(quantity),
        },
        { onConflict: "product_id,location_id" }
      );
    }

    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <Modal title={t("Record Purchase")} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label={t("Supplier")}>
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={fieldInputClass}
          >
            <option value="">{t("No supplier")}</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Product")}>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className={fieldInputClass}
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.product_name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Quantity")}>
            <input
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`${fieldInputClass} tabular`}
            />
          </Field>
          <Field label={t("Cost price")}>
            <input
              type="number"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className={`${fieldInputClass} tabular`}
            />
          </Field>
        </div>
        <Field label={t("Date")}>
          <input
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className={`${fieldInputClass} tabular`}
          />
        </Field>

        {error && <p className="text-sm text-stamp-red">{error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-paper-line px-4 py-2 text-sm font-medium text-ink-soft"
          >
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={saving || !productId || quantity === "" || Number(quantity) <= 0}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? t("Saving…") : t("Record purchase")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
