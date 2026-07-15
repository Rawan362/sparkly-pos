import Link from "next/link";
import { useSettings } from "@/lib/SettingsContext";

export function StatTile({
  label,
  value,
  tone = "ink",
  href,
}: {
  label: string;
  value: string;
  tone?: "ink" | "brass" | "green" | "red";
  href?: string;
}) {
  const toneClass = {
    ink: "text-ink",
    brass: "text-brass-dark",
    green: "text-stamp-green",
    red: "text-stamp-red",
  }[tone];
  const { t } = useSettings();

  const content = (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {t(label)}
      </p>
      <p className={`tabular mt-1 text-2xl font-semibold ${toneClass}`}>
        {value}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="paper-card block px-5 py-4 transition-colors hover:border-brass"
      >
        {content}
      </Link>
    );
  }

  return <div className="paper-card px-5 py-4">{content}</div>;
}
