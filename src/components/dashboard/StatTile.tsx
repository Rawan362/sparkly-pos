export function StatTile({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: string;
  tone?: "ink" | "brass" | "green" | "red";
}) {
  const toneClass = {
    ink: "text-ink",
    brass: "text-brass-dark",
    green: "text-stamp-green",
    red: "text-stamp-red",
  }[tone];

  return (
    <div className="paper-card px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className={`tabular mt-1 text-2xl font-semibold ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
