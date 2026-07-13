"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { Expense } from "@/lib/types";
import { AddExpenseModal } from "@/components/expenses/AddExpenseModal";

export default function ExpensesPage() {
  const { sellerId } = useSeller();
  const [expenses, setExpenses] = useState<Expense[] | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("expenses")
      .select("*")
      .eq("chat_id", sellerId)
      .order("expense_date", { ascending: false })
      .then(({ data }) => setExpenses(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "expenses",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  const remove = async (id: string) => {
    setExpenses((prev) => prev?.filter((e) => e.id !== id) ?? null);
    await supabase.from("expenses").delete().eq("id", id);
  };

  const total = expenses?.reduce((sum, e) => sum + e.amount, 0) ?? 0;

  return (
    <div>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Expenses</h1>
          <p className="text-sm text-ink-soft">
            What it costs to run the business — rent, supplies, delivery,
            anything that isn&apos;t a sale.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="shrink-0 rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised"
        >
          + Log Expense
        </button>
      </div>

      {showAdd && sellerId && (
        <AddExpenseModal
          sellerId={sellerId}
          onClose={() => setShowAdd(false)}
          onCreated={load}
        />
      )}

      {!expenses ? (
        <p className="text-ink-soft">Loading expenses…</p>
      ) : expenses.length === 0 ? (
        <div className="paper-card px-6 py-10 text-center text-ink-soft">
          No expenses logged yet.
        </div>
      ) : (
        <div className="paper-card overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-paper-line text-left text-xs uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium text-right">Amount</th>
                <th className="px-4 py-3 font-medium" />
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => (
                <tr
                  key={e.id}
                  className="border-b border-paper-line last:border-0"
                >
                  <td className="tabular px-4 py-2 text-ink-soft">
                    {e.expense_date}
                  </td>
                  <td className="px-4 py-2" dir="auto">
                    {e.category || <span className="text-ink-faint">—</span>}
                  </td>
                  <td className="px-4 py-2 text-ink-soft" dir="auto">
                    {e.description || <span className="text-ink-faint">—</span>}
                  </td>
                  <td className="tabular px-4 py-2 text-right font-medium">
                    {e.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => remove(e.id)}
                      className="text-xs font-medium text-stamp-red hover:opacity-70"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-paper-line">
                <td colSpan={3} className="px-4 py-3 text-sm font-medium text-ink-soft">
                  Total
                </td>
                <td className="tabular px-4 py-3 text-right text-sm font-semibold">
                  {total.toLocaleString()}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
