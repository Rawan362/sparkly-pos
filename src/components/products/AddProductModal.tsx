"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldInputClass, fieldTextareaClass } from "@/components/ui/Field";
import { useSettings } from "@/lib/SettingsContext";

const EMPTY = {
  product_name: "",
  product_code: "",
  product_category: "",
  wholesale_price: "",
  retail_price: "",
  target_customers: "",
  key_features: "",
  common_questions: "",
  payment_methods: "",
  delivery_info: "",
  competitors_difference: "",
  special_offers: "",
};

export function AddProductModal({
  sellerId,
  onClose,
  onCreated,
}: {
  sellerId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useSettings();
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof EMPTY) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_name.trim()) return;
    setSaving(true);
    await supabase.from("seller_products").insert({
      chat_id: sellerId,
      product_name: form.product_name.trim(),
      product_code: form.product_code.trim() || null,
      product_category: form.product_category.trim() || null,
      wholesale_price: form.wholesale_price === "" ? null : Number(form.wholesale_price),
      retail_price: form.retail_price === "" ? null : Number(form.retail_price),
      target_customers: form.target_customers.trim() || null,
      key_features: form.key_features.trim() || null,
      common_questions: form.common_questions.trim() || null,
      payment_methods: form.payment_methods.trim() || null,
      delivery_info: form.delivery_info.trim() || null,
      competitors_difference: form.competitors_difference.trim() || null,
      special_offers: form.special_offers.trim() || null,
      is_active: true,
    });
    setSaving(false);
    onCreated();
    onClose();
  };

  return (
    <Modal title={t("Add Product")} onClose={onClose}>
      <form onSubmit={submit} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Product name")} className="col-span-2">
            <input
              autoFocus
              dir="auto"
              value={form.product_name}
              onChange={set("product_name")}
              placeholder="Rose oud perfume"
              className={fieldInputClass}
            />
          </Field>
          <Field label={t("Category")} className="col-span-2">
            <input
              dir="auto"
              value={form.product_category}
              onChange={set("product_category")}
              placeholder="Fragrances"
              className={fieldInputClass}
            />
          </Field>
          <Field label={t("Product code")} className="col-span-2">
            <input
              value={form.product_code}
              onChange={set("product_code")}
              placeholder="HP1056"
              className={fieldInputClass}
            />
          </Field>
          <Field label={t("Wholesale price")}>
            <input
              type="number"
              step="0.01"
              value={form.wholesale_price}
              onChange={set("wholesale_price")}
              className={`${fieldInputClass} tabular`}
            />
          </Field>
          <Field label={t("Retail price")}>
            <input
              type="number"
              step="0.01"
              value={form.retail_price}
              onChange={set("retail_price")}
              className={`${fieldInputClass} tabular`}
            />
          </Field>
        </div>

        <Field label={t("Target customers")}>
          <textarea
            dir="auto"
            rows={2}
            value={form.target_customers}
            onChange={set("target_customers")}
            className={fieldTextareaClass}
          />
        </Field>
        <Field label={t("Key features")}>
          <textarea
            dir="auto"
            rows={2}
            value={form.key_features}
            onChange={set("key_features")}
            className={fieldTextareaClass}
          />
        </Field>
        <Field label={t("Common questions")}>
          <textarea
            dir="auto"
            rows={2}
            value={form.common_questions}
            onChange={set("common_questions")}
            className={fieldTextareaClass}
          />
        </Field>
        <Field label={t("Payment methods")}>
          <textarea
            dir="auto"
            rows={2}
            value={form.payment_methods}
            onChange={set("payment_methods")}
            className={fieldTextareaClass}
          />
        </Field>
        <Field label={t("Delivery info")}>
          <textarea
            dir="auto"
            rows={2}
            value={form.delivery_info}
            onChange={set("delivery_info")}
            className={fieldTextareaClass}
          />
        </Field>
        <Field label={t("How you're different from competitors")}>
          <textarea
            dir="auto"
            rows={2}
            value={form.competitors_difference}
            onChange={set("competitors_difference")}
            className={fieldTextareaClass}
          />
        </Field>
        <Field label={t("Special offers")}>
          <textarea
            dir="auto"
            rows={2}
            value={form.special_offers}
            onChange={set("special_offers")}
            className={fieldTextareaClass}
          />
        </Field>

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
            disabled={saving || !form.product_name.trim()}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            {saving ? t("Saving…") : t("Add product")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
