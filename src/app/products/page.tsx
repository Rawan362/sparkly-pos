"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { SellerProduct } from "@/lib/types";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { Toggle } from "@/components/ui/Toggle";
import { AddProductModal } from "@/components/products/AddProductModal";

export default function ProductsPage() {
  const { sellerId } = useSeller();
  const { t } = useSettings();
  const [products, setProducts] = useState<SellerProduct[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("seller_products")
      .select("*")
      .eq("chat_id", sellerId)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "seller_products",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  const update = async (id: string, patch: Partial<SellerProduct>) => {
    const prevProducts = products;
    setProducts(
      (prev) => prev?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? null
    );
    const { data, error } = await supabase
      .from("seller_products")
      .update(patch)
      .eq("id", id)
      .select();
    if (error) {
      setProducts(prevProducts ?? null);
      setSaveError(error.message);
    } else if (!data || data.length === 0) {
      setProducts(prevProducts ?? null);
      setSaveError(
        "No matching row was updated. This usually means a Row Level Security policy on 'seller_products' is blocking updates for this row."
      );
    }
  };

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{t("Products")}</h1>
          <p className="text-sm text-ink-soft">
            {t("Everything Ahmad knows about your catalog — edit any cell directly.")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {products && (
            <span className="text-sm text-ink-faint tabular">
              {products.length} {products.length === 1 ? t("item") : t("items")}
            </span>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised"
          >
            {t("+ Add Product")}
          </button>
        </div>
      </div>

      {showAdd && sellerId && (
        <AddProductModal
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

      {!products ? (
        <p className="text-ink-soft">{t("Loading catalog…")}</p>
      ) : products.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          {t("No products yet. Add one above, or by chatting with Ahmad on Telegram — either way it shows up here instantly.")}
        </div>
      ) : (
        <div className="paper-card overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">{t("Product")}</th>
                <th className="px-4 py-3 font-medium">{t("Code")}</th>
                <th className="px-4 py-3 font-medium">{t("Category")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("Wholesale")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("Retail")}</th>
                <th className="px-4 py-3 font-medium">{t("Track Stock")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("Stock")}</th>
                <th className="px-4 py-3 font-medium">{t("Active")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-paper-line last:border-0"
                >
                  <td className="px-2 py-1.5 font-medium" dir="auto">
                    <InlineEdit
                      value={p.product_name ?? ""}
                      onSave={(v) => update(p.id, { product_name: v })}
                    />
                  </td>
                  <td className="tabular px-2 py-1.5 text-ink-soft">
                    <InlineEdit
                      value={p.product_code ?? ""}
                      placeholder="—"
                      onSave={(v) => update(p.id, { product_code: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5 text-ink-soft" dir="auto">
                    <InlineEdit
                      value={p.product_category ?? ""}
                      placeholder={t("Uncategorized")}
                      onSave={(v) => update(p.id, { product_category: v })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <InlineEdit
                      type="number"
                      align="right"
                      value={p.wholesale_price?.toString() ?? ""}
                      onSave={(v) =>
                        update(p.id, { wholesale_price: v === "" ? null : Number(v) })
                      }
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <InlineEdit
                      type="number"
                      align="right"
                      value={p.retail_price?.toString() ?? ""}
                      onSave={(v) =>
                        update(p.id, { retail_price: v === "" ? null : Number(v) })
                      }
                    />
                  </td>
                  <td className="px-4 py-1.5">
                    <Toggle
                      checked={p.track_stock}
                      label={`Track stock for ${p.product_name}`}
                      onChange={(next) => update(p.id, { track_stock: next })}
                    />
                  </td>
                  <td className="tabular px-4 py-1.5 text-right">
                    {p.track_stock ? (
                      (p.stock_quantity ?? 0)
                    ) : (
                      <span className="text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-1.5">
                    <Toggle
                      checked={p.is_active}
                      label={`${p.product_name} active`}
                      onChange={(next) => update(p.id, { is_active: next })}
                    />
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
