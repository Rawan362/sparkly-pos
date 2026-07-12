"use client";

import clsx from "clsx";

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors duration-150 disabled:opacity-50",
        checked
          ? "bg-brass border-brass-dark"
          : "bg-paper border-paper-line"
      )}
    >
      <span
        className={clsx(
          "inline-block h-[18px] w-[18px] transform rounded-full bg-paper-raised shadow transition-transform duration-150",
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}
