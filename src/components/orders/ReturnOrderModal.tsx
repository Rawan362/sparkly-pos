"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldTextareaClass } from "@/components/ui/Field";
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

    if (order.product_name) {
      const { data: product } = await supabase
        .from("seller_products")
        .select("*")
        .eq("chat_id", sellerId)
        .eq("product_name", order.product_name)
        .maybeSingle();
      if (product?.track_stock) {
        await supabase
          .from("seller_products")
          .update({
            stock_quantity:
              (product.stock_quantity ?? 0) + (order.quantity ?? 1),
          })
          .eq("id", product.id);
      }
    }

    setSaving(false);
    onReturned();
    onClose();
  };

  return (
    <Modal title="Return Order" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="-mt-1 text-sm text-ink-soft">
          Marks the order as returned{order.product_name ? ` and restocks ${order.product_name}` : ""}
          {" "}if it&apos;s tracked.
        </p>
        <Field label="Reason">
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
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-stamp-red px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? "Saving…" : "Mark as returned"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
