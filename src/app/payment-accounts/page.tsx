"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useStaff } from "@/lib/StaffContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { PaymentAccount } from "@/lib/types";
import { InlineEdit } from "@/components/ui/InlineEdit";

export default function PaymentAccountsPage() {
  const { sellerId } = useSeller();
  const { isStaffRole } = useStaff();
  const [accounts, setAccounts] = useState<PaymentAccount[] | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("payment_accounts")
      .select("*")
      .eq("chat_id", sellerId)
      .order("name", { ascending: true })
      .then(({ data }) => setAccounts(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "payment_accounts",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId || isStaffRole || !name.trim()) return;
    setAdding(true);
    await supabase.from("payment_accounts").insert({
      chat_id: sellerId,
      name: name.trim(),
      type: type.trim() || null,
    });
    setName("");
    setType("");
    setAdding(false);
    load();
  };

  const update = async (id: string, patch: Partial<PaymentAccount>) => {
    if (isStaffRole) return;
    setAccounts(
      (prev) => prev?.map((a) => (a.id === id ? { ...a, ...patch } : a)) ?? null
    );
    await supabase.from("payment_accounts").update(patch).eq("id", id);
  };

  const remove = async (id: string) => {
    if (isStaffRole) return;
    setAccounts((prev) => prev?.filter((a) => a.id !== id) ?? null);
    await supabase.from("payment_accounts").delete().eq("id", id);
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Payment Accounts</h1>
        <p className="text-sm text-ink-soft">
          Define the accounts you get paid into — Cash, Bank Transfer, Mobile
          Money — so Orders can record which one was used.
        </p>
      </div>

      {isStaffRole && (
        <div className="mb-4 rounded-md border border-brass/40 bg-brass-soft/60 px-4 py-2.5 text-sm text-brass-dark">
          You&apos;re signed in as Staff — this page is view-only.
        </div>
      )}

      {!accounts ? (
        <p className="text-ink-soft">Loading payment accounts…</p>
      ) : (
        <div className="paper-card mb-6 divide-y divide-paper-line">
          {accounts.length === 0 ? (
            <p className="px-6 py-10 text-center text-ink-soft">
              No payment accounts yet — add your first one below.
            </p>
          ) : (
            accounts.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="max-w-[240px] flex-1">
                  <InlineEdit
                    value={a.name}
                    onSave={(v) => update(a.id, { name: v })}
                    disabled={isStaffRole}
                  />
                </div>
                <div className="max-w-[160px] flex-1">
                  <InlineEdit
                    value={a.type ?? ""}
                    placeholder="Type"
                    onSave={(v) => update(a.id, { type: v || null })}
                    disabled={isStaffRole}
                  />
                </div>
                {!isStaffRole && (
                  <button
                    onClick={() => remove(a.id)}
                    className="shrink-0 text-xs font-medium text-stamp-red hover:opacity-70"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {!isStaffRole && (
        <form
          onSubmit={addAccount}
          className="paper-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end"
        >
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-ink-soft">Account name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Cash"
              className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 outline-none focus:border-brass"
            />
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-ink-soft">Type</span>
            <input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Bank Transfer"
              className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 outline-none focus:border-brass"
            />
          </label>
          <button
            type="submit"
            disabled={adding || !name.trim()}
            className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
          >
            Add account
          </button>
        </form>
      )}
    </div>
  );
}
