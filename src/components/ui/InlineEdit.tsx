"use client";

import { useState } from "react";
import clsx from "clsx";

type Props = {
  value: string;
  onSave: (next: string) => void | Promise<void>;
  type?: "text" | "number";
  align?: "left" | "right";
  placeholder?: string;
  className?: string;
};

// Click-to-edit text that renders as plain ledger text until touched, then
// becomes an input. Saves on blur/Enter, reverts on Escape.
export function InlineEdit({
  value,
  onSave,
  type = "text",
  align = "left",
  placeholder,
  className,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
        className={clsx(
          "w-full rounded px-1.5 py-1 text-left transition-colors hover:bg-brass-soft/60",
          type === "number" && "tabular",
          align === "right" && "text-right",
          !value && "text-ink-faint italic",
          className
        )}
      >
        {value || placeholder || "—"}
      </button>
    );
  }

  const commit = async () => {
    setEditing(false);
    if (draft !== value) {
      setSaving(true);
      await onSave(draft);
      setSaving(false);
    }
  };

  return (
    <input
      autoFocus
      type={type}
      inputMode={type === "number" ? "decimal" : undefined}
      value={draft}
      disabled={saving}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={clsx(
        "w-full rounded border border-brass bg-paper-raised px-1.5 py-1 outline-none",
        type === "number" && "tabular",
        align === "right" && "text-right",
        className
      )}
    />
  );
}
