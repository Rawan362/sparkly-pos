"use client";

import { useMemo, useState } from "react";
import type { Customer } from "@/lib/types";
import { useSettings } from "@/lib/SettingsContext";

export function CustomerPicker({
  customers,
  selected,
  onSelect,
}: {
  customers: Customer[];
  selected: Customer | null;
  onSelect: (customer: Customer | null) => void;
}) {
  const { t } = useSettings();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customers
      .filter(
        (c) =>
          c.phone.toLowerCase().includes(q) ||
          c.name?.toLowerCase().includes(q)
      )
      .slice(0, 6);
  }, [customers, query]);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-paper-line bg-paper px-3 py-2 text-sm">
        <div className="min-w-0">
          <p className="truncate font-medium" dir="auto">
            {selected.name || t("Unnamed")}
          </p>
          <p className="tabular text-xs text-ink-faint">{selected.phone}</p>
        </div>
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="shrink-0 text-xs font-medium text-ink-soft underline decoration-dotted underline-offset-4 hover:text-brass-dark"
        >
          {t("Change")}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={t("Search customer by name/phone, or leave blank for walk-in")}
        className="w-full rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
      />
      {open && matches.length > 0 && (
        <div className="paper-card absolute z-10 mt-1 max-h-56 w-full overflow-y-auto py-1">
          {matches.map((c) => (
            <button
              key={c.phone}
              type="button"
              onMouseDown={() => {
                onSelect(c);
                setQuery("");
              }}
              className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-paper"
            >
              <span className="truncate" dir="auto">
                {c.name || t("Unnamed")}
              </span>
              <span className="tabular shrink-0 text-xs text-ink-faint">
                {c.phone}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
