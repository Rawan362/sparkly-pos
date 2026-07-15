import type { ReactNode } from "react";
import { useSettings } from "@/lib/SettingsContext";

export function ChartFrame({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { t } = useSettings();
  return (
    <div className="paper-card px-5 py-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-soft">
        {t(title)}
      </h2>
      {children}
    </div>
  );
}
