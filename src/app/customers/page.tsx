"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useSettings } from "@/lib/SettingsContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { Customer } from "@/lib/types";
import { Stamp } from "@/components/ui/Stamp";
import { AddCustomerModal } from "@/components/customers/AddCustomerModal";

export default function CustomersPage() {
  const { sellerId } = useSeller();
  const { t, formatMoney } = useSettings();
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("customers")
      .select("*")
      .eq("seller_id", sellerId)
      .order("total_spent", { ascending: false })
      .then(({ data }) => setCustomers(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "customers",
    sellerId ? `seller_id=eq.${sellerId}` : undefined,
    load
  );

  const filtered = useMemo(() => {
    if (!customers) return null;
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.phone?.toLowerCase().includes(q) ||
        c.name?.toLowerCase().includes(q)
    );
  }, [customers, search]);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("Customers")}</h1>
          <p className="text-sm text-ink-soft">
            {t("Everyone who has bought from you through Ahmad.")}
          </p>
        </div>
        <div className="flex w-full gap-3 sm:w-auto">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("Search name or phone…")}
            className="w-full max-w-xs rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
          />
          <button
            onClick={() => setShowAdd(true)}
            className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised"
          >
            {t("+ New Customer")}
          </button>
        </div>
      </div>

      {showAdd && sellerId && (
        <AddCustomerModal
          sellerId={sellerId}
          onClose={() => setShowAdd(false)}
          onCreated={load}
        />
      )}

      {!filtered ? (
        <p className="text-ink-soft">{t("Loading customers…")}</p>
      ) : filtered.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          {search ? t("No customers match your search.") : t("No customers yet.")}
        </div>
      ) : (
        <div className="paper-card overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">{t("Customer")}</th>
                <th className="px-4 py-3 font-medium text-right">{t("Orders")}</th>
                <th className="px-4 py-3 font-medium text-right">
                  {t("Total spent")}
                </th>
                <th className="px-4 py-3 font-medium">{t("Type")}</th>
                <th className="px-4 py-3 font-medium">{t("Status")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr
                  key={c.phone}
                  className="border-b border-paper-line last:border-0"
                >
                  <td className="px-4 py-2">
                    <p className="font-medium" dir="auto">
                      {c.name || t("Unnamed")}
                    </p>
                    <p className="tabular text-xs text-ink-faint">{c.phone}</p>
                  </td>
                  <td className="px-4 py-2 text-right tabular">
                    {c.total_orders ?? 0}
                  </td>
                  <td className="px-4 py-2 text-right tabular">
                    {formatMoney(c.total_spent)}
                  </td>
                  <td className="px-4 py-2">
                    <Stamp tone={c.is_wholesale ? "brass" : "ink"}>
                      {c.is_wholesale ? t("Wholesale") : t("Retail")}
                    </Stamp>
                  </td>
                  <td className="px-4 py-2">
                    {c.is_vip && <Stamp tone="green">{t("VIP")}</Stamp>}
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
