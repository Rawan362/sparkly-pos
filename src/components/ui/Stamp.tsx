import clsx from "clsx";
import type { ReactNode } from "react";

type StampTone = "green" | "red" | "ink" | "brass";

const toneClasses: Record<StampTone, string> = {
  green: "text-stamp-green bg-stamp-green-soft",
  red: "text-stamp-red bg-stamp-red-soft",
  ink: "text-ink-soft bg-stamp-ink-soft",
  brass: "text-brass-dark bg-brass-soft",
};

export function Stamp({
  tone = "ink",
  children,
}: {
  tone?: StampTone;
  children: ReactNode;
}) {
  return <span className={clsx("stamp", toneClasses[tone])}>{children}</span>;
}
