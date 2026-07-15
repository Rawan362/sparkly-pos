"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import type { PosSettings } from "@/lib/types";
import { Toggle } from "@/components/ui/Toggle";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { LANGUAGES } from "@/lib/languages";
import { CURRENCIES } from "@/lib/currencies";

const SWITCHES: Array<{
  key: keyof Pick<
    PosSettings,
    "inventory_tracking_active" | "low_stock_alerts_active" | "auto_invoice_active"
  >;
  label: string;
  hint: string;
}> = [
  {
    key: "inventory_tracking_active",
    label: "Inventory tracking",
    hint: "Let Ahmad track and reduce stock quantities as orders come in.",
  },
  {
    key: "low_stock_alerts_active",
    label: "Low-stock alerts",
    hint: "Get flagged in chat when a product drops to its low-stock threshold.",
  },
  {
    key: "auto_invoice_active",
    label: "Auto-invoicing",
    hint: "Automatically generate an invoice number for every confirmed order.",
  },
];

export default function SettingsPage() {
  const { sellerId, seller } = useSeller();
  const { settings, update, t } = useSettings();
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateBusinessPhone = async (value: string) => {
    if (!sellerId) return;
    const { data, error } = await supabase
      .from("sellers")
      .update({ business_phone: value || null })
      .eq("chat_id", sellerId)
      .select();
    if (error) {
      setSaveError(error.message);
    } else if (!data || data.length === 0) {
      setSaveError(
        "No matching row was updated. This usually means a Row Level Security policy on 'sellers' is blocking updates for this chat_id."
      );
    }
  };

  const runUpdate = async (patch: Partial<PosSettings>) => {
    const { error } = await update(patch);
    if (error) setSaveError(error);
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">{t("Settings")}</h1>
        <p className="text-sm text-ink-soft">
          {t("Everything here is off by default — turn on only what you want Ahmad to do automatically.")}
        </p>
      </div>

      {saveError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-stamp-red/40 bg-stamp-red-soft px-4 py-2.5 text-sm text-stamp-red">
          <span>{t("Save failed:")} {saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            className="shrink-0 font-medium hover:opacity-70"
          >
            {t("Dismiss")}
          </button>
        </div>
      )}

      <div className="paper-card mb-4 flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="font-medium">{t("Business phone")}</p>
          <p className="text-sm text-ink-soft">
            {t("Shown on receipts and invoices — not used for anything else.")}
          </p>
        </div>
        <div className="w-48">
          <InlineEdit
            value={seller?.business_phone ?? ""}
            placeholder={t("Add a phone number")}
            onSave={updateBusinessPhone}
            align="right"
          />
        </div>
      </div>

      {!settings ? (
        <p className="text-ink-soft">{t("Loading settings…")}</p>
      ) : (
        <>
          <div className="paper-card mb-4 divide-y divide-paper-line">
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-medium">{t("Language")}</p>
                <p className="text-sm text-ink-soft">
                  {t("Translates the app's own labels and buttons — your products, customers, and other data stay exactly as entered.")}
                </p>
              </div>
              <select
                value={settings.language}
                onChange={(e) => runUpdate({ language: e.target.value })}
                className="w-44 rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-medium">{t("Currency")}</p>
                <p className="text-sm text-ink-soft">
                  {t("Changes how prices are displayed throughout the app — this does not convert your numbers.")}
                </p>
              </div>
              <select
                value={settings.currency}
                onChange={(e) => runUpdate({ currency: e.target.value })}
                className="w-44 rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-medium">{t("Locations")}</p>
                <p className="text-sm text-ink-soft">
                  {t("Add, edit, or remove the places you sell from.")}
                </p>
              </div>
              <Link
                href="/settings/locations"
                className="shrink-0 rounded-md border border-paper-line px-4 py-2 text-sm font-medium text-ink-soft hover:border-brass hover:text-brass-dark"
              >
                {t("Manage locations")}
              </Link>
            </div>
          </div>

          <div className="paper-card divide-y divide-paper-line">
            {SWITCHES.map((s) => (
              <div
                key={s.key}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <div>
                  <p className="font-medium">{t(s.label)}</p>
                  <p className="text-sm text-ink-soft">{t(s.hint)}</p>
                </div>
                <Toggle
                  checked={Boolean(settings[s.key])}
                  label={s.label}
                  onChange={(next) => runUpdate({ [s.key]: next })}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
