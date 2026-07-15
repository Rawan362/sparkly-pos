"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldInputClass, fieldTextareaClass } from "@/components/ui/Field";
import { useSettings } from "@/lib/SettingsContext";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AddExpenseModal({
  sellerId,
  onClose,
  onCreated,
}: {
  sellerId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useSettings();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(todayIso());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount === "") return;
    setSaving(true);
    setError(null);
    const { error } = await supabase.from("expenses").insert({
      chat_id: sellerId,
      amount: Number(amount),
      category: category.trim() || null,
      description: description.trim() || null,
      expense_date: expenseDate,
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
    <Modal title={t("Log Expense")} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Amount")}>
            <input
              autoFocus
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`${fieldInputClass} tabular`}
            />
          </Field>
          <Field label={t("Date")}>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className={`${fieldInputClass} tabular`}
            />
          </Field>
        </div>
        <Field label={t("Category")}>
          <input
            dir="auto"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Rent, supplies, delivery…"
            className={fieldInputClass}
          />
        </Field>
        <Field label={t("Description")}>
          <textarea
            dir="auto"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            disabled={saving || amount === ""}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? t("Saving…") : t("Log expense")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
