import type { ReactNode } from "react";

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className ?? ""}`}>
      <span className="mb-1 block text-ink-soft">{label}</span>
      {children}
    </label>
  );
}

export const fieldInputClass =
  "w-full rounded-md border border-paper-line bg-paper px-3 py-2 outline-none focus:border-brass";

export const fieldTextareaClass = `${fieldInputClass} resize-y`;
