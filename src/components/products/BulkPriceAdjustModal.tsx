"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldInputClass } from "@/components/ui/Field";
import type { SellerProduct } from "@/lib/types";

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

export function BulkPriceAdjustModal({
  products,
  onClose,
  onApplied,
}: {
  products: SellerProduct[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const [percent, setPercent] = useState("");
  const [adjustWholesale, setAdjustWholesale] = useState(true);
  const [adjustRetail, setAdjustRetail] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pct = Number(percent);
  const valid = percent !== "" && !Number.isNaN(pct) && (adjustWholesale || adjustRetail);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setError(null);

    const results = await Promise.all(
      products.map((p) => {
        const patch: Partial<SellerProduct> = {};
        if (adjustWholesale && p.wholesale_price != null) {
          patch.wholesale_price = roundMoney(p.wholesale_price * (1 + pct / 100));
        }
        if (adjustRetail && p.retail_price != null) {
          patch.retail_price = roundMoney(p.retail_price * (1 + pct / 100));
        }
        if (Object.keys(patch).length === 0) return Promise.resolve({ error: null });
        return supabase.from("seller_products").update(patch).eq("id", p.id);
      })
    );

    setSaving(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      setError(failed.error.message);
      return;
    }
    onApplied();
    onClose();
  };

  return (
    <Modal title={`Adjust price for ${products.length} product${products.length === 1 ? "" : "s"}`} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Adjust by percent">
          <input
            type="number"
            step="0.1"
            autoFocus
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            placeholder="e.g. 10 or -15"
            className={`${fieldInputClass} tabular`}
          />
        </Field>
        <p className="-mt-2 text-xs text-ink-faint">
          Positive increases price, negative decreases it. Applies to each
          selected product&apos;s current price.
        </p>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={adjustWholesale}
              onChange={(e) => setAdjustWholesale(e.target.checked)}
              className="h-4 w-4 accent-brass"
            />
            Wholesale price
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={adjustRetail}
              onChange={(e) => setAdjustRetail(e.target.checked)}
              className="h-4 w-4 accent-brass"
            />
            Retail price
          </label>
        </div>

        {error && (
          <p className="rounded-md border border-stamp-red/40 bg-stamp-red-soft px-3 py-2 text-sm text-stamp-red">
            {error}
          </p>
        )}

        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-paper-line px-4 py-2 text-sm font-medium text-ink-soft"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!valid || saving}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? "Applying…" : "Apply"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
