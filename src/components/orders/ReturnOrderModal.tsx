"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldTextareaClass } from "@/components/ui/Field";
import { useSettings } from "@/lib/SettingsContext";
import { useLocations } from "@/lib/useLocations";
import type { Order } from "@/lib/types";

export function ReturnOrderModal({
  sellerId,
  order,
  onClose,
  onReturned,
}: {
  sellerId: string;
  order: Order;
  onClose: () => void;
  onReturned: () => void;
}) {
  const { t } = useSettings();
  const { defaultLocation } = useLocations();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        order_status: "RETURNED",
        return_reason: reason.trim() || null,
        returned_at: new Date().toISOString(),
      })
      .eq("id", order.id);
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }

    // Restocks into the order's location (or the seller's default, for
    // orders placed before locations existed) -- product_stock_by_location
    // is the source of truth for stock going forward, not
    // seller_products.stock_quantity.
    if (order.product_name) {
      const { data: product } = await supabase
        .from("seller_products")
        .select("*")
        .eq("chat_id", sellerId)
        .eq("product_name", order.product_name)
        .maybeSingle();
      const locationId = order.location_id ?? defaultLocation?.id ?? null;
      if (product?.track_stock && locationId) {
        const { data: stockRow } = await supabase
          .from("product_stock_by_location")
          .select("stock_quantity")
          .eq("product_id", product.id)
          .eq("location_id", locationId)
          .maybeSingle();
        const restoredQuantity =
          (stockRow?.stock_quantity ?? product.stock_quantity ?? 0) +
          (order.quantity ?? 1);
        await supabase.from("product_stock_by_location").upsert(
          {
            product_id: product.id,
            location_id: locationId,
            stock_quantity: restoredQuantity,
          },
          { onConflict: "product_id,location_id" }
        );
        await supabase.from("stock_adjustments").insert({
          product_id: product.id,
          chat_id: sellerId,
          location_id: locationId,
          change_amount: order.quantity ?? 1,
          reason: "Return",
        });
      }
    }

    setSaving(false);
    onReturned();
    onClose();
  };

  return (
    <Modal title={t("Return Order")} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="-mt-1 text-sm text-ink-soft">
          {order.product_name
            ? t("Marks the order as returned and restocks {product} if it's tracked.").replace(
                "{product}",
                order.product_name
              )
            : t("Marks the order as returned.")}
        </p>
        <Field label={t("Reason")}>
          <textarea
            autoFocus
            dir="auto"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Wrong size, changed mind, damaged…"
            className={fieldTextareaClass}
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
            disabled={saving}
            className="rounded-md bg-stamp-red px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? t("Saving…") : t("Mark as returned")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
