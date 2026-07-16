"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldInputClass } from "@/components/ui/Field";
import type { SellerProduct } from "@/lib/types";

const REASONS = ["Restock", "Damaged", "Recount", "Theft", "Other"];

export function AdjustStockModal({
  sellerId,
  product,
  onClose,
  onAdjusted,
}: {
  sellerId: string;
  product: SellerProduct;
  onClose: () => void;
  onAdjusted: () => void;
}) {
  const [direction, setDirection] = useState<"+" | "-">("+");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState(REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountNum = Number(amount) || 0;
  const changeAmount = direction === "+" ? amountNum : -amountNum;
  const finalReason = reason === "Other" ? customReason.trim() : reason;
  const nextQuantity = Math.max(0, (product.stock_quantity ?? 0) + changeAmount);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === "" || amountNum <= 0) return;
    setSaving(true);
    setError(null);

    const { error: logError } = await supabase.from("stock_adjustments").insert({
      product_id: product.id,
      chat_id: sellerId,
      change_amount: changeAmount,
      reason: finalReason || null,
    });
    if (logError) {
      setSaving(false);
      setError(logError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("seller_products")
      .update({ stock_quantity: nextQuantity })
      .eq("id", product.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }

    onAdjusted();
    onClose();
  };

  return (
    <Modal title={`Adjust Stock — ${product.product_name}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="-mt-1 text-sm text-ink-soft">
          Current quantity:{" "}
          <span className="tabular font-medium text-ink">
            {product.stock_quantity ?? 0}
          </span>
        </p>

        <div className="grid grid-cols-[auto_1fr] gap-3">
          <Field label="Direction">
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value as "+" | "-")}
              className={fieldInputClass}
            >
              <option value="+">+ Add</option>
              <option value="-">− Remove</option>
            </select>
          </Field>
          <Field label="Amount">
            <input
              autoFocus
              type="number"
              step="any"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${fieldInputClass} tabular`}
            />
          </Field>
        </div>

        <Field label="Reason">
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={fieldInputClass}
          >
            {REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        {reason === "Other" && (
          <Field label="Describe the reason">
            <input
              dir="auto"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              className={fieldInputClass}
            />
          </Field>
        )}

        {amount !== "" && amountNum > 0 && (
          <p className="text-sm text-ink-soft">
            New quantity will be{" "}
            <span className="tabular font-medium text-ink">
              {nextQuantity}
            </span>
            .
          </p>
        )}

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
            disabled={saving || amount === "" || amountNum <= 0}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? "Saving…" : "Apply adjustment"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
