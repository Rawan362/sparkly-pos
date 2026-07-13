"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldInputClass, fieldTextareaClass } from "@/components/ui/Field";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["PENDING", "SHIPPED", "DELIVERED", "CANCELLED"];

const EMPTY = {
  phone: "",
  product_name: "",
  product_price: "",
  order_total: "",
  delivery_address: "",
  order_status: "PENDING" as OrderStatus,
};

export function AddOrderModal({
  sellerId,
  onClose,
  onCreated,
}: {
  sellerId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim() || !form.product_name.trim()) return;
    setSaving(true);
    await supabase.from("orders").insert({
      seller_id: sellerId,
      phone: form.phone.trim(),
      product_name: form.product_name.trim(),
      product_price: form.product_price === "" ? null : Number(form.product_price),
      order_total: form.order_total === "" ? null : Number(form.order_total),
      delivery_address: form.delivery_address.trim() || null,
      order_status: form.order_status,
    });
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <Modal title="New Order" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <p className="-mt-1 text-sm text-ink-soft">
          For orders taken outside WhatsApp/Telegram — a walk-in or phone
          customer.
        </p>
        <Field label="Customer phone">
          <input
            autoFocus
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="07701234567"
            className={fieldInputClass}
          />
        </Field>
        <Field label="Product">
          <input
            dir="auto"
            value={form.product_name}
            onChange={(e) =>
              setForm((f) => ({ ...f, product_name: e.target.value }))
            }
            className={fieldInputClass}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Product price">
            <input
              type="number"
              step="0.01"
              value={form.product_price}
              onChange={(e) =>
                setForm((f) => ({ ...f, product_price: e.target.value }))
              }
              className={`${fieldInputClass} tabular`}
            />
          </Field>
          <Field label="Order total">
            <input
              type="number"
              step="0.01"
              value={form.order_total}
              onChange={(e) =>
                setForm((f) => ({ ...f, order_total: e.target.value }))
              }
              className={`${fieldInputClass} tabular`}
            />
          </Field>
        </div>
        <Field label="Delivery address">
          <textarea
            dir="auto"
            rows={2}
            value={form.delivery_address}
            onChange={(e) =>
              setForm((f) => ({ ...f, delivery_address: e.target.value }))
            }
            className={fieldTextareaClass}
          />
        </Field>
        <Field label="Status">
          <select
            value={form.order_status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                order_status: e.target.value as OrderStatus,
              }))
            }
            className={fieldInputClass}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

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
            disabled={saving || !form.phone.trim() || !form.product_name.trim()}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? "Saving…" : "Create order"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
