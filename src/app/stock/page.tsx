"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import { useLocations } from "@/lib/useLocations";
import type { SellerProduct } from "@/lib/types";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { Toggle } from "@/components/ui/Toggle";
import { Stamp } from "@/components/ui/Stamp";

type StockValue = {
  stock_quantity: number | null;
  low_stock_threshold: number | null;
};

export default function StockPage() {
  const { sellerId } = useSeller();
  const { t } = useSettings();
  const { locations, defaultLocation, loading: locationsLoading } = useLocations();
  const [locationId, setLocationId] = useState<string | null>(null);
  const [products, setProducts] = useState<SellerProduct[] | null>(null);
  const [stockRows, setStockRows] = useState<Record<string, StockValue> | null>(null);

  useEffect(() => {
    // Adopts the default location once useLocations resolves it.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!locationId && defaultLocation) setLocationId(defaultLocation.id);
  }, [locationId, defaultLocation]);

  const loadProducts = useCallback(() => {
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
    loadProducts();
  }, [loadProducts]);

  useRealtimeRefresh(
    "seller_products",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    loadProducts
  );

  const loadStock = useCallback(() => {
    if (!locationId || !products) {
      setStockRows(null);
      return;
    }
    const ids = products.map((p) => p.id);
    if (ids.length === 0) {
      setStockRows({});
      return;
    }
    supabase
      .from("product_stock_by_location")
      .select("product_id, stock_quantity, low_stock_threshold")
      .eq("location_id", locationId)
      .in("product_id", ids)
      .then(({ data }) => {
        const map: Record<string, StockValue> = {};
        (data ?? []).forEach((r) => {
          map[r.product_id] = {
            stock_quantity: r.stock_quantity,
            low_stock_threshold: r.low_stock_threshold,
          };
        });
        setStockRows(map);
      });
  }, [locationId, products]);

  useEffect(() => {
    // Clears/reloads stock data when the location or product list changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStock();
  }, [loadStock]);

  useRealtimeRefresh(
    "product_stock_by_location",
    locationId ? `location_id=eq.${locationId}` : undefined,
    loadStock
  );

  const updateTrackStock = async (id: string, next: boolean) => {
    setProducts(
      (prev) => prev?.map((p) => (p.id === id ? { ...p, track_stock: next } : p)) ?? null
    );
    await supabase.from("seller_products").update({ track_stock: next }).eq("id", id);
  };

  const updateStock = async (productId: string, patch: Partial<StockValue>) => {
    if (!locationId) return;
    const current = stockRows?.[productId] ?? {
      stock_quantity: null,
      low_stock_threshold: null,
    };
    const next = { ...current, ...patch };
    setStockRows((prev) => ({ ...prev, [productId]: next }));
    await supabase.from("product_stock_by_location").upsert(
      { product_id: productId, location_id: locationId, ...next },
      { onConflict: "product_id,location_id" }
    );
  };

  const isLow = (p: SellerProduct, stock?: StockValue) =>
    p.track_stock &&
    stock?.stock_quantity != null &&
    stock?.low_stock_threshold != null &&
    stock.stock_quantity <= stock.low_stock_threshold;

  const loading = locationsLoading || !products || stockRows === null;

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("Stock")}</h1>
          <p className="text-sm text-ink-soft">
            {t("Turn on tracking for the products you want to watch, then keep quantities up to date.")}
          </p>
        </div>
        {locations && locations.length > 0 && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-ink-soft">{t("Location")}</label>
            <select
              value={locationId ?? ""}
              onChange={(e) => setLocationId(e.target.value)}
              className="rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
            >
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <p className="text-ink-soft">{t("Loading stock…")}</p>
      ) : products.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          {t("No active products to stock yet.")}
        </div>
      ) : (
        <div className="paper-card overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">{t("Product")}</th>
                <th className="px-4 py-3 font-medium">{t("Track stock")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("Quantity")}</th>
                <th className="px-4 py-3 font-medium text-right">
                  {t("Low-stock at")}
                </th>
                <th className="px-4 py-3 font-medium">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const stock = stockRows?.[p.id];
                return (
                  <tr key={p.id} className="border-b border-paper-line last:border-0">
                    <td className="px-4 py-2 font-medium" dir="auto">
                      {p.product_name}
                    </td>
                    <td className="px-4 py-2">
                      <Toggle
                        checked={p.track_stock}
                        label={`Track stock for ${p.product_name}`}
                        onChange={(next) => updateTrackStock(p.id, next)}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      {p.track_stock ? (
                        <InlineEdit
                          type="number"
                          align="right"
                          value={stock?.stock_quantity?.toString() ?? ""}
                          onSave={(v) =>
                            updateStock(p.id, {
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
                          value={stock?.low_stock_threshold?.toString() ?? ""}
                          onSave={(v) =>
                            updateStock(p.id, {
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
                        isLow(p, stock) ? (
                          <Stamp tone="red">{t("Low stock")}</Stamp>
                        ) : (
                          <Stamp tone="green">{t("Stocked")}</Stamp>
                        )
                      ) : (
                        <span className="text-ink-faint">{t("Not tracked")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
