"use client";

import { useState } from "react";
import clsx from "clsx";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import type { InvoiceLineItem, Order } from "@/lib/types";

export type OrderGroup = {
  key: string;
  createdAt: string;
  phone: string | null;
  invoiceNumber: string | null;
  discountPercent: number | null;
  total: number;
  rawSubtotal: number;
  orderId: string;
  orders: Order[];
};

export function GenerateInvoiceModal({
  sellerId,
  groups,
  onClose,
  onCreated,
}: {
  sellerId: string;
  groups: OrderGroup[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = groups.filter((g) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (g.phone ?? "").toLowerCase().includes(term) ||
      g.orders.some((o) => o.product_name?.toLowerCase().includes(term))
    );
  });

  const selected = groups.find((g) => g.key === selectedKey) ?? null;

  const items: InvoiceLineItem[] =
    selected?.orders.map((o) => ({
      name: o.product_name ?? "—",
      code: null,
      quantity: o.quantity ?? 1,
      unit_price: o.product_price ?? 0,
      total: o.order_total ?? 0,
    })) ?? [];

  const discountAmount = selected
    ? selected.rawSubtotal * ((selected.discountPercent ?? 0) / 100)
    : 0;
  const shippingRaw = selected
    ? selected.total - selected.rawSubtotal + discountAmount
    : 0;
  const shipping = Math.abs(shippingRaw) < 0.01 ? 0 : shippingRaw;

  const submit = async () => {
    if (!selected) return;
    setSaving(true);
    await supabase.from("invoices").insert({
      invoice_number: invoiceNumber.trim() || selected.invoiceNumber || null,
      seller_id: sellerId,
      customer_phone: selected.phone,
      order_id: selected.orderId,
      items,
      subtotal: selected.rawSubtotal,
      shipping,
      total: selected.total,
      status: "draft",
    });
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <Modal title="Generate Invoice" onClose={onClose}>
      <div className="flex flex-col gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-ink-soft">Search past sales</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Phone or product"
            className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 outline-none focus:border-brass"
          />
        </label>

        <div className="max-h-56 overflow-y-auto rounded-md border border-paper-line">
          {filtered.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-ink-soft">
              No matching sales.
            </p>
          ) : (
            filtered.map((g) => (
              <button
                key={g.key}
                type="button"
                onClick={() => setSelectedKey(g.key)}
                className={clsx(
                  "block w-full border-b border-paper-line px-4 py-2 text-left text-sm last:border-0 hover:bg-brass-soft/40",
                  selectedKey === g.key && "bg-brass-soft/60"
                )}
              >
                <span className="tabular">
                  {new Date(g.createdAt).toLocaleDateString()}
                </span>{" "}
                · {g.phone ?? "Walk-in"} ·{" "}
                <span className="tabular font-medium">
                  {g.total.toLocaleString()}
                </span>
              </button>
            ))
          )}
        </div>

        {selected && (
          <>
            <label className="text-sm">
              <span className="mb-1 block text-ink-soft">
                Invoice number (optional)
              </span>
              <input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder={selected.invoiceNumber ?? "e.g. 0110"}
                className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 outline-none focus:border-brass"
              />
            </label>

            <div className="rounded-md border border-paper-line px-4 py-3 text-sm">
              <p className="mb-2 font-medium">Line items</p>
              <div className="flex flex-col gap-1">
                {items.map((it, i) => (
                  <div key={i} className="flex justify-between text-ink-soft">
                    <span dir="auto">
                      {it.name} × {it.quantity}
                    </span>
                    <span className="tabular">{it.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              {shipping > 0 && (
                <div className="mt-2 flex justify-between border-t border-paper-line pt-2 text-ink-soft">
                  <span>Shipping</span>
                  <span className="tabular">{shipping.toLocaleString()}</span>
                </div>
              )}
              <div className="mt-1 flex justify-between font-semibold">
                <span>Total</span>
                <span className="tabular">
                  {selected.total.toLocaleString()}
                </span>
              </div>
            </div>
          </>
        )}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-paper-line px-4 py-2 text-sm font-medium text-ink-soft"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!selected || saving}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? "Generating…" : "Generate invoice"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
