"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldInputClass } from "@/components/ui/Field";

export function AddCustomerModal({
  sellerId,
  onClose,
  onCreated,
}: {
  sellerId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [isWholesale, setIsWholesale] = useState(false);
  const [isVip, setIsVip] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("customers").insert({
      seller_id: sellerId,
      phone: phone.trim(),
      name: name.trim() || null,
      is_wholesale: isWholesale,
      is_vip: isVip,
    });
    setSaving(false);
    if (error) {
      setError(
        error.code === "23505"
          ? "A customer with this phone number already exists."
          : error.message
      );
      return;
    }
    onCreated();
    onClose();
  };

  return (
    <Modal title="New Customer" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Phone">
          <input
            autoFocus
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07701234567"
            className={fieldInputClass}
          />
        </Field>
        <Field label="Name">
          <input
            dir="auto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldInputClass}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={isWholesale}
            onChange={(e) => setIsWholesale(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-brass)]"
          />
          Wholesale customer
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={isVip}
            onChange={(e) => setIsVip(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-brass)]"
          />
          VIP
        </label>

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
            disabled={saving || !phone.trim()}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? "Saving…" : "Add customer"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
