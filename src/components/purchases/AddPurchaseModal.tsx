"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldInputClass } from "@/components/ui/Field";
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

    const product = products.find((p) => p.id === productId);
    if (product?.track_stock) {
      await supabase
        .from("seller_products")
        .update({
          stock_quantity: (product.stock_quantity ?? 0) + Number(quantity),
        })
        .eq("id", product.id);
    }

    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <Modal title="Record Purchase" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Supplier">
          <select
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={fieldInputClass}
          >
            <option value="">No supplier</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Product">
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
          <Field label="Quantity">
            <input
              type="number"
              step="any"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={`${fieldInputClass} tabular`}
            />
          </Field>
          <Field label="Cost price">
            <input
              type="number"
              step="0.01"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
              className={`${fieldInputClass} tabular`}
            />
          </Field>
        </div>
        <Field label="Date">
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !productId || quantity === "" || Number(quantity) <= 0}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? "Saving…" : "Record purchase"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
