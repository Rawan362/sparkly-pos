"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { Supplier } from "@/lib/types";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { AddSupplierModal } from "@/components/suppliers/AddSupplierModal";

export default function SuppliersPage() {
  const { sellerId } = useSeller();
  const { t } = useSettings();
  const [suppliers, setSuppliers] = useState<Supplier[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("suppliers")
      .select("*")
      .eq("chat_id", sellerId)
      .order("name", { ascending: true })
      .then(({ data }) => setSuppliers(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "suppliers",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  const update = async (id: string, patch: Partial<Supplier>) => {
    const prevSuppliers = suppliers;
    setSuppliers(
      (prev) => prev?.map((s) => (s.id === id ? { ...s, ...patch } : s)) ?? null
    );
    const { data, error } = await supabase
      .from("suppliers")
      .update(patch)
      .eq("id", id)
      .select();
    if (error) {
      setSuppliers(prevSuppliers ?? null);
      setSaveError(error.message);
    } else if (!data || data.length === 0) {
      setSuppliers(prevSuppliers ?? null);
      setSaveError(
        "No matching row was updated. This usually means a Row Level Security policy on 'suppliers' is blocking updates for this row."
      );
    }
  };

  const remove = async (id: string) => {
    setSuppliers((prev) => prev?.filter((s) => s.id !== id) ?? null);
    await supabase.from("suppliers").delete().eq("id", id);
  };

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("Suppliers")}</h1>
          <p className="text-sm text-ink-soft">
            {t("Who you buy stock from — edit any cell directly.")}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised"
        >
          {t("+ New Supplier")}
        </button>
      </div>

      {showAdd && sellerId && (
        <AddSupplierModal
          sellerId={sellerId}
          onClose={() => setShowAdd(false)}
          onCreated={load}
        />
      )}

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

      {!suppliers ? (
        <p className="text-ink-soft">{t("Loading suppliers…")}</p>
      ) : suppliers.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          {t("No suppliers yet. Add one above.")}
        </div>
      ) : (
        <div className="paper-card overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">{t("Name")}</th>
                <th className="px-4 py-3 font-medium">{t("Phone")}</th>
                <th className="px-4 py-3 font-medium">{t("Contact info")}</th>
                <th className="px-4 py-3 font-medium">{t("Notes")}</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-paper-line last:border-0"
                >
                  <td className="px-2 py-1.5 font-medium" dir="auto">
                    <InlineEdit
                      value={s.name}
                      onSave={(v) => update(s.id, { name: v })}
                    />
                  </td>
                  <td className="tabular px-2 py-1.5 text-ink-soft">
                    <InlineEdit
                      value={s.phone ?? ""}
                      placeholder="—"
                      onSave={(v) => update(s.id, { phone: v || null })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-ink-soft" dir="auto">
                    <InlineEdit
                      value={s.contact_info ?? ""}
                      placeholder="—"
                      onSave={(v) => update(s.id, { contact_info: v || null })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-ink-soft" dir="auto">
                    <InlineEdit
                      value={s.notes ?? ""}
                      placeholder="—"
                      onSave={(v) => update(s.id, { notes: v || null })}
                    />
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => remove(s.id)}
                      className="text-xs font-medium text-stamp-red hover:opacity-70"
                    >
                      {t("Delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
