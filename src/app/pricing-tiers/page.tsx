"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { PricingTier } from "@/lib/types";
import { Stamp } from "@/components/ui/Stamp";

export default function PricingTiersPage() {
  const { sellerId } = useSeller();
  const { t } = useSettings();
  const [tiers, setTiers] = useState<PricingTier[] | null>(null);
  const [name, setName] = useState("");
  const [percent, setPercent] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("pricing_tiers")
      .select("*")
      .eq("chat_id", sellerId)
      .order("name", { ascending: true })
      .then(({ data }) => setTiers(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "pricing_tiers",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  const addTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId || !name.trim() || percent === "") return;
    setAdding(true);
    if (isDefault) {
      await supabase
        .from("pricing_tiers")
        .update({ is_default: false })
        .eq("chat_id", sellerId);
    }
    await supabase.from("pricing_tiers").insert({
      chat_id: sellerId,
      name: name.trim(),
      adjustment_percent: Number(percent),
      is_default: isDefault,
    });
    setName("");
    setPercent("");
    setIsDefault(false);
    setAdding(false);
    load();
  };

  const remove = async (id: string) => {
    setTiers((prev) => prev?.filter((t) => t.id !== id) ?? null);
    await supabase.from("pricing_tiers").delete().eq("id", id);
  };

  const makeDefault = async (id: string) => {
    if (!sellerId) return;
    setTiers(
      (prev) => prev?.map((t) => ({ ...t, is_default: t.id === id })) ?? null
    );
    await supabase
      .from("pricing_tiers")
      .update({ is_default: false })
      .eq("chat_id", sellerId)
      .neq("id", id);
    await supabase
      .from("pricing_tiers")
      .update({ is_default: true })
      .eq("id", id);
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">{t("Pricing Tiers")}</h1>
        <p className="text-sm text-ink-soft">
          {t("Adjustments Ahmad can offer different customers, e.g. “Wholesale, -15%”.")}
        </p>
      </div>

      {!tiers ? (
        <p className="text-ink-soft">{t("Loading tiers…")}</p>
      ) : (
        <div className="paper-card mb-6 divide-y divide-paper-line">
          {tiers.length === 0 ? (
            <p className="px-6 py-10 text-center text-ink-soft">
              {t("No pricing tiers yet — add your first one below.")}
            </p>
          ) : (
            tiers.map((tier) => (
              <div
                key={tier.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium" dir="auto">
                    {tier.name}
                  </p>
                  <p className="tabular text-sm text-ink-soft">
                    {tier.adjustment_percent > 0 ? "+" : ""}
                    {tier.adjustment_percent}%
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  {tier.is_default ? (
                    <Stamp tone="brass">{t("Default")}</Stamp>
                  ) : (
                    <button
                      onClick={() => makeDefault(tier.id)}
                      className="text-xs font-medium text-ink-soft underline decoration-dotted underline-offset-4 hover:text-brass-dark"
                    >
                      {t("Make default")}
                    </button>
                  )}
                  <button
                    onClick={() => remove(tier.id)}
                    className="text-xs font-medium text-stamp-red hover:opacity-70"
                  >
                    {t("Delete")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      <form
        onSubmit={addTier}
        className="paper-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-ink-soft">{t("Tier name")}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Wholesale"
            className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 outline-none focus:border-brass"
          />
        </label>
        <label className="text-sm sm:w-40">
          <span className="mb-1 block text-ink-soft">{t("Adjustment %")}</span>
          <input
            type="number"
            step="0.1"
            value={percent}
            onChange={(e) => setPercent(e.target.value)}
            placeholder="-15"
            className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 tabular outline-none focus:border-brass"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-brass)]"
          />
          {t("Set as default")}
        </label>
        <button
          type="submit"
          disabled={adding || !name.trim() || percent === ""}
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
        >
          {t("Add tier")}
        </button>
      </form>
    </div>
  );
}
