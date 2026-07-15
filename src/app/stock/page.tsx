"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useStaff } from "@/lib/StaffContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { logActivity } from "@/lib/activityLog";
import type { SellerProduct } from "@/lib/types";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { Toggle } from "@/components/ui/Toggle";
import { Stamp } from "@/components/ui/Stamp";

export default function StockPage() {
  const { sellerId } = useSeller();
  const { actorName } = useStaff();
  const [products, setProducts] = useState<SellerProduct[] | null>(null);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("seller_products")
      .select("*")
      .eq("chat_id", sellerId)
      .eq("is_active", true)
      .order("product_name", { ascending: true })
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
    const productName = products?.find((p) => p.id === id)?.product_name ?? "product";
    setProducts(
      (prev) => prev?.map((p) => (p.id === id ? { ...p, ...patch } : p)) ?? null
    );
    await supabase.from("seller_products").update(patch).eq("id", id);
    if (sellerId && "stock_quantity" in patch) {
      await logActivity(
        sellerId,
        actorName,
        `Adjusted stock for "${productName}" to ${patch.stock_quantity ?? 0}`
      );
    }
  };

  const isLow = (p: SellerProduct) =>
    p.track_stock &&
    p.stock_quantity != null &&
    p.low_stock_threshold != null &&
    p.stock_quantity <= p.low_stock_threshold;

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Stock</h1>
        <p className="text-sm text-ink-soft">
          Turn on tracking for the products you want to watch, then keep
          quantities up to date.
        </p>
      </div>

      {!products ? (
        <p className="text-ink-soft">Loading stock…</p>
      ) : products.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          No active products to stock yet.
        </div>
      ) : (
        <div className="paper-card overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Track stock</th>
                <th className="px-4 py-3 font-medium text-right">Quantity</th>
                <th className="px-4 py-3 font-medium text-right">
                  Low-stock at
                </th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-paper-line last:border-0"
                >
                  <td className="px-4 py-2 font-medium" dir="auto">
                    {p.product_name}
                  </td>
                  <td className="px-4 py-2">
                    <Toggle
                      checked={p.track_stock}
                      label={`Track stock for ${p.product_name}`}
                      onChange={(next) => update(p.id, { track_stock: next })}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    {p.track_stock ? (
                      <InlineEdit
                        type="number"
                        align="right"
                        value={p.stock_quantity?.toString() ?? ""}
                        onSave={(v) =>
                          update(p.id, {
                            stock_quantity: v === "" ? null : Number(v),
                          })
                        }
                      />
                    ) : (
                      <span className="block text-right text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    {p.track_stock ? (
                      <InlineEdit
                        type="number"
                        align="right"
                        value={p.low_stock_threshold?.toString() ?? ""}
                        onSave={(v) =>
                          update(p.id, {
                            low_stock_threshold: v === "" ? null : Number(v),
                          })
                        }
                      />
                    ) : (
                      <span className="block text-right text-ink-faint">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {p.track_stock ? (
                      isLow(p) ? (
                        <Stamp tone="red">Low stock</Stamp>
                      ) : (
                        <Stamp tone="green">Stocked</Stamp>
                      )
                    ) : (
                      <span className="text-ink-faint">Not tracked</span>
                    )}
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
