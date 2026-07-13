"use client";

import { useState } from "react";

// The visible −/+ buttons stay exactly as before; clicking the number
// itself turns it into a small input so a cashier can type an exact
// quantity directly instead of tapping + repeatedly for a big order.
export function QuantityStepper({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (next: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(quantity));

  const commit = () => {
    setEditing(false);
    const next = Math.floor(Number(draft));
    if (Number.isFinite(next)) onChange(next);
  };

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        min="0"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          } else if (e.key === "Escape") {
            setDraft(String(quantity));
            setEditing(false);
          }
        }}
        className="tabular w-12 rounded border border-brass bg-paper-raised px-1 py-0.5 text-center text-sm outline-none"
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(quantity));
        setEditing(true);
      }}
      aria-label="Edit quantity"
      className="tabular w-6 rounded text-center text-sm hover:bg-brass-soft/60"
    >
      {quantity}
    </button>
  );
}
