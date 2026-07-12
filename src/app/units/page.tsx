"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useSeller } from "@/lib/SellerContext";
import { useRealtimeRefresh } from "@/lib/useRealtimeRefresh";
import type { CustomUnit } from "@/lib/types";
import { Stamp } from "@/components/ui/Stamp";

export default function UnitsPage() {
  const { sellerId } = useSeller();
  const [units, setUnits] = useState<CustomUnit[] | null>(null);
  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [allowDecimal, setAllowDecimal] = useState(false);
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    if (!sellerId) return;
    supabase
      .from("custom_units")
      .select("*")
      .eq("chat_id", sellerId)
      .order("name", { ascending: true })
      .then(({ data }) => setUnits(data ?? []));
  }, [sellerId]);

  useEffect(() => {
    load();
  }, [load]);

  useRealtimeRefresh(
    "custom_units",
    sellerId ? `chat_id=eq.${sellerId}` : undefined,
    load
  );

  const addUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sellerId || !name.trim() || !shortName.trim()) return;
    setAdding(true);
    await supabase.from("custom_units").insert({
      chat_id: sellerId,
      name: name.trim(),
      short_name: shortName.trim(),
      allow_decimal: allowDecimal,
    });
    setName("");
    setShortName("");
    setAllowDecimal(false);
    setAdding(false);
    load();
  };

  const remove = async (id: string) => {
    setUnits((prev) => prev?.filter((u) => u.id !== id) ?? null);
    await supabase.from("custom_units").delete().eq("id", id);
  };

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold">Units</h1>
        <p className="text-sm text-ink-soft">
          Custom units of measure Ahmad can attach to products — kilograms,
          boxes, meters, anything you sell by.
        </p>
      </div>

      {!units ? (
        <p className="text-ink-soft">Loading units…</p>
      ) : (
        <div className="paper-card mb-6 divide-y divide-paper-line">
          {units.length === 0 ? (
            <p className="px-6 py-10 text-center text-ink-soft">
              No custom units yet — add your first one below.
            </p>
          ) : (
            units.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium" dir="auto">
                    {u.name}{" "}
                    <span className="text-ink-faint">({u.short_name})</span>
                  </p>
                  {u.allow_decimal && (
                    <Stamp tone="ink">Allows decimals</Stamp>
                  )}
                </div>
                <button
                  onClick={() => remove(u.id)}
                  className="shrink-0 text-xs font-medium text-stamp-red hover:opacity-70"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      )}

      <form
        onSubmit={addUnit}
        className="paper-card flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-end"
      >
        <label className="flex-1 text-sm">
          <span className="mb-1 block text-ink-soft">Unit name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Kilogram"
            className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 outline-none focus:border-brass"
          />
        </label>
        <label className="text-sm sm:w-32">
          <span className="mb-1 block text-ink-soft">Short name</span>
          <input
            value={shortName}
            onChange={(e) => setShortName(e.target.value)}
            placeholder="kg"
            className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 outline-none focus:border-brass"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input
            type="checkbox"
            checked={allowDecimal}
            onChange={(e) => setAllowDecimal(e.target.checked)}
            className="h-4 w-4 accent-[var(--color-brass)]"
          />
          Allow decimals
        </label>
        <button
          type="submit"
          disabled={adding || !name.trim() || !shortName.trim()}
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold uppercase tracking-wide text-paper-raised disabled:opacity-40"
        >
          Add unit
        </button>
      </form>
    </div>
  );
}
