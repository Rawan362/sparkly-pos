"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { Purchase, SellerProduct, Supplier } from "@/lib/types";
import { AddPurchaseModal } from "@/components/purchases/AddPurchaseModal";

export default function PurchasesPage() {
  const { sellerId } = useSeller();
  const { t, formatMoney } = useSettings();
  const [purchases, setPurchases] = useState<Purchase[] | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    if (!sellerId) return;
    const [purchasesRes, suppliersRes, productsRes] = await Promise.all([
      supabase
        .from("purchases")
        .select("*")
        .eq("chat_id", sellerId)
        .order("purchase_date", { ascending: false }),
      supabase
        .from("suppliers")
        .select("*")
        .eq("chat_id", sellerId)
        .order("name", { ascending: true }),
      supabase
        .from("seller_products")
        .select("*")
        .eq("chat_id", sellerId)
        .order("product_name", { ascending: true }),
    ]);
    setPurchases(purchasesRes.data ?? []);
    setSuppliers(suppliersRes.data ?? []);
    setProducts(productsRes.data ?? []);
  }, [sellerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  useRealtimeRefresh(
    "purchases",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  const supplierName = (id: string | null) =>
    suppliers.find((s) => s.id === id)?.name ?? "—";
  const productName = (id: string | null) =>
    products.find((p) => p.id === id)?.product_name ?? "—";

  const totalCost = (p: Purchase) =>
    p.cost_price != null ? p.cost_price * p.quantity : null;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("Purchases")}</h1>
          <p className="text-sm text-ink-soft">
            {t("Stock bought in from suppliers — recording one restocks the product automatically.")}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          disabled={products.length === 0}
          className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
        >
          {t("+ Record Purchase")}
        </button>
      </div>

      {showAdd && sellerId && (
        <AddPurchaseModal
          sellerId={sellerId}
          suppliers={suppliers}
          products={products}
          onClose={() => setShowAdd(false)}
          onCreated={load}
        />
      )}

      {!purchases ? (
        <p className="text-ink-soft">{t("Loading purchases…")}</p>
      ) : products.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          {t("Add a product on the Products page before recording a purchase.")}
        </div>
      ) : purchases.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          {t("No purchases logged yet.")}
        </div>
      ) : (
        <div className="paper-card overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">{t("Date")}</th>
                <th className="px-4 py-3 font-medium">{t("Supplier")}</th>
                <th className="px-4 py-3 font-medium">{t("Product")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("Quantity")}</th>
                <th className="px-4 py-3 font-medium text-right">
                  {t("Cost price")}
                </th>
                <th className="px-4 py-3 font-medium text-right">
                  {t("Total cost")}
                </th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-paper-line last:border-0"
                >
                  <td className="tabular px-4 py-2 text-ink-soft">
                    {p.purchase_date}
                  </td>
                  <td className="px-4 py-2" dir="auto">
                    {supplierName(p.supplier_id)}
                  </td>
                  <td className="px-4 py-2 font-medium" dir="auto">
                    {productName(p.product_id)}
                  </td>
                  <td className="tabular px-4 py-2 text-right">
                    {p.quantity}
                  </td>
                  <td className="tabular px-4 py-2 text-right">
                    {p.cost_price != null ? formatMoney(p.cost_price) : "—"}
                  </td>
                  <td className="tabular px-4 py-2 text-right font-medium">
                    {totalCost(p) != null ? formatMoney(totalCost(p)) : "—"}
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
