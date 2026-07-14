"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldInputClass, fieldTextareaClass } from "@/components/ui/Field";

export function AddSupplierModal({
  sellerId,
  onClose,
  onCreated,
}: {
  sellerId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("suppliers").insert({
      chat_id: sellerId,
      name: name.trim(),
      phone: phone.trim() || null,
      contact_info: contactInfo.trim() || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    onCreated();
    onClose();
  };

  return (
    <Modal title="New Supplier" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <Field label="Name">
          <input
            autoFocus
            dir="auto"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={fieldInputClass}
          />
        </Field>
        <Field label="Phone">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="07701234567"
            className={fieldInputClass}
          />
        </Field>
        <Field label="Contact info">
          <input
            dir="auto"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            placeholder="Email, WhatsApp, address…"
            className={fieldInputClass}
          />
        </Field>
        <Field label="Notes">
          <textarea
            dir="auto"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
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
            disabled={saving || !name.trim()}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? "Saving…" : "Add supplier"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
