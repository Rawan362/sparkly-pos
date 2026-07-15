"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Modal } from "@/components/ui/Modal";
import { Field, fieldInputClass, fieldTextareaClass } from "@/components/ui/Field";
import { useSettings } from "@/lib/SettingsContext";
import { useLocations } from "@/lib/useLocations";
import { Toggle } from "@/components/ui/Toggle";

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
  stock_quantity: "",
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
  const { defaultLocation } = useLocations();
  const [form, setForm] = useState(EMPTY);
  const [manageStock, setManageStock] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof EMPTY) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.product_name.trim()) return;
    setSaving(true);
    setError(null);
    const startingQuantity = manageStock
      ? form.stock_quantity === ""
        ? 0
        : Number(form.stock_quantity)
      : null;
    const { data, error } = await supabase
      .from("seller_products")
      .insert({
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
        track_stock: manageStock,
        stock_quantity: startingQuantity,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    // Seeds the starting quantity into the seller's default location so it
    // shows up immediately on the (per-location) Stock page too.
    if (manageStock && defaultLocation && data) {
      await supabase.from("product_stock_by_location").upsert(
        {
          product_id: data.id,
          location_id: defaultLocation.id,
          stock_quantity: startingQuantity,
        },
        { onConflict: "product_id,location_id" }
      );
    }
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

        <div className="flex items-center justify-between rounded-md border border-paper-line px-3 py-2.5">
          <div>
            <p className="text-sm font-medium">{t("Manage Stock")}</p>
            <p className="text-xs text-ink-soft">
              {manageStock
                ? t("Quantity is counted piece by piece.")
                : t("Unlimited — quantity isn't tracked.")}
            </p>
          </div>
          <Toggle
            checked={manageStock}
            label="Manage stock for this product"
            onChange={setManageStock}
          />
        </div>
        {manageStock && (
          <Field label={t("Starting stock quantity")}>
            <input
              type="number"
              step="1"
              min="0"
              value={form.stock_quantity}
              onChange={set("stock_quantity")}
              placeholder="0"
              className={`${fieldInputClass} tabular`}
            />
          </Field>
        )}

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
