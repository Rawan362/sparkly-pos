"use client";

import { useMemo, useState } from "react";
import type { SellerProduct } from "@/lib/types";
import { Stamp } from "@/components/ui/Stamp";

export function ProductPicker({
  products,
  onAdd,
}: {
  products: SellerProduct[];
  onAdd: (product: SellerProduct) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.product_name.toLowerCase().includes(q) ||
        p.product_category?.toLowerCase().includes(q)
    );
  }, [products, search]);

  return (
    <div className="paper-card px-4 py-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
        className="mb-3 w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
      />

      {filtered.length === 0 ? (
        <p className="px-2 py-8 text-center text-sm text-ink-soft">
          No products match.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {filtered.map((p) => {
            const outOfStock =
              p.track_stock && (p.stock_quantity ?? 0) <= 0;
            return (
              <button
                key={p.id}
                type="button"
                disabled={outOfStock}
                onClick={() => onAdd(p)}
                className="flex flex-col items-start gap-1 rounded-md border border-paper-line bg-paper px-3 py-2.5 text-left transition-colors hover:border-brass disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="line-clamp-2 text-sm font-medium" dir="auto">
                  {p.product_name}
                </span>
                <span className="tabular text-sm text-brass-dark">
                  {(p.retail_price ?? 0).toLocaleString()}
                </span>
                {outOfStock ? (
                  <Stamp tone="red">Out of stock</Stamp>
                ) : p.track_stock ? (
                  <span className="tabular text-xs text-ink-faint">
                    {p.stock_quantity} in stock
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
