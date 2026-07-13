"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { PosSettings } from "@/lib/types";
import { Toggle } from "@/components/ui/Toggle";
import { InlineEdit } from "@/components/ui/InlineEdit";

const DEFAULTS: Omit<PosSettings, "chat_id"> = {
  inventory_tracking_active: false,
  low_stock_alerts_active: false,
  low_stock_default_threshold: null,
  auto_invoice_active: false,
  invoice_prefix: null,
  next_invoice_number: null,
};

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
  const [settings, setSettings] = useState<PosSettings | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const updateBusinessPhone = async (value: string) => {
    if (!sellerId) return;
    const { error } = await supabase
      .from("sellers")
      .update({ business_phone: value || null })
      .eq("chat_id", sellerId);
    if (error) setSaveError(error.message);
  };

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("pos_settings")
      .select("*")
      .eq("chat_id", sellerId)
      .maybeSingle()
      .then(({ data }) => {
        setSettings(data ?? { chat_id: sellerId, ...DEFAULTS });
      });
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "pos_settings",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  const update = async (patch: Partial<PosSettings>) => {
    if (!sellerId) return;
    const prevSettings = settings;
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
    const { error } = await supabase
      .from("pos_settings")
      .upsert({ chat_id: sellerId, ...patch }, { onConflict: "chat_id" });
    if (error) {
      setSettings(prevSettings);
      setSaveError(error.message);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-ink-soft">
          Everything here is off by default — turn on only what you want
          Ahmad to do automatically.
        </p>
      </div>

      {saveError && (
        <div className="mb-4 flex items-start justify-between gap-3 rounded-md border border-stamp-red/40 bg-stamp-red-soft px-4 py-2.5 text-sm text-stamp-red">
          <span>Save failed: {saveError}</span>
          <button
            onClick={() => setSaveError(null)}
            className="shrink-0 font-medium hover:opacity-70"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="paper-card mb-4 flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <p className="font-medium">Business phone</p>
          <p className="text-sm text-ink-soft">
            Shown on receipts and invoices — not used for anything else.
          </p>
        </div>
        <div className="w-48">
          <InlineEdit
            value={seller?.business_phone ?? ""}
            placeholder="Add a phone number"
            onSave={updateBusinessPhone}
            align="right"
          />
        </div>
      </div>

      {!settings ? (
        <p className="text-ink-soft">Loading settings…</p>
      ) : (
        <div className="paper-card divide-y divide-paper-line">
          {SWITCHES.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div>
                <p className="font-medium">{s.label}</p>
                <p className="text-sm text-ink-soft">{s.hint}</p>
              </div>
              <Toggle
                checked={Boolean(settings[s.key])}
                label={s.label}
                onChange={(next) => update({ [s.key]: next })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
