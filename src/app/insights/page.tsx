"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { fetchProductPlaybooks, pickField, type PlaybookFetchResult } from "@/lib/schemaProbe";
import { Stamp } from "@/components/ui/Stamp";

function asList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v)).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    // Handles either newline- or comma-separated text stored in a single column.
    const parts = value.split(/\r?\n|(?<=[.!?])\s{2,}/).map((p) => p.trim()).filter(Boolean);
    return parts.length > 1 ? parts : [value.trim()];
  }
  return [];
}

function asCloseRate(value: unknown): string | null {
  if (value == null) return null;
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return `${n <= 1 ? Math.round(n * 100) : Math.round(n)}%`;
}

export default function InsightsPage() {
  const { sellerId, seller } = useSeller();
  const [result, setResult] = useState<PlaybookFetchResult | null>(null);

  const load = useCallback(async () => {
    if (!sellerId) return;
    const { data } = await supabase
      .from("seller_products")
      .select("product_category")
      .eq("chat_id", sellerId);
    const categories = Array.from(
      new Set(
        [
          seller?.business_category,
          ...(data ?? []).map((r) => r.product_category),
        ].filter((c): c is string => Boolean(c && c.trim()))
      )
    );
    setResult(await fetchProductPlaybooks(categories));
  }, [sellerId, seller?.business_category]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const rows = result?.status === "ok" ? result.rows : [];

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Insights</h1>
        <p className="text-sm text-ink-soft">
          Here&apos;s what&apos;s working across sellers like you —
          anonymized and collective, not tied to any one seller.
        </p>
      </div>

      {!result ? (
        <p className="text-ink-soft">Loading insights…</p>
      ) : result.status === "missing_table" ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          No cross-seller insights are available yet.
        </div>
      ) : rows.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          No insights for your product category yet — check back as more
          sellers close deals.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {result.scopedByCategory && (
            <p className="text-xs text-ink-faint">
              Showing insights matched to your product categories.
            </p>
          )}
          {rows.map((row, i) => {
            const category = pickField(row, ["product_category", "category"]);
            const objections = asList(
              pickField(row, ["common_objections", "objections"])
            );
            const responses = asList(
              pickField(row, [
                "effective_responses",
                "what_worked",
                "responses_that_worked",
                "best_responses",
              ])
            );
            const openers = asList(
              pickField(row, [
                "best_opening_messages",
                "opening_messages",
                "best_openers",
              ])
            );
            const closeRate = asCloseRate(
              pickField(row, ["close_rate_percent", "close_rate", "closing_rate"])
            );
            const idVal = pickField(row, ["id"]);

            return (
              <div key={idVal != null ? String(idVal) : i} className="paper-card px-5 py-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-semibold" dir="auto">
                    {category ? String(category) : "General"}
                  </h2>
                  {closeRate && <Stamp tone="green">Close rate {closeRate}</Stamp>}
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Best opening messages
                    </p>
                    {openers.length === 0 ? (
                      <p className="text-sm text-ink-faint">—</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
                        {openers.map((o, j) => (
                          <li key={j} dir="auto">
                            {o}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Common objections
                    </p>
                    {objections.length === 0 ? (
                      <p className="text-sm text-ink-faint">—</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
                        {objections.map((o, j) => (
                          <li key={j} dir="auto">
                            {o}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-faint">
                      Responses that worked
                    </p>
                    {responses.length === 0 ? (
                      <p className="text-sm text-ink-faint">—</p>
                    ) : (
                      <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
                        {responses.map((o, j) => (
                          <li key={j} dir="auto">
                            {o}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
