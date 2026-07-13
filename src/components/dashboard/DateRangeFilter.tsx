export type DateRangeKey = "all" | "today" | "7d" | "30d" | "90d" | "year";

export const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "year", label: "This year" },
];

export function isWithinRange(dateStr: string, range: DateRangeKey): boolean {
  if (range === "all") return true;
  const d = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (range) {
    case "today":
      return d >= startOfToday;
    case "7d":
      return d >= new Date(startOfToday.getTime() - 6 * DAY_MS);
    case "30d":
      return d >= new Date(startOfToday.getTime() - 29 * DAY_MS);
    case "90d":
      return d >= new Date(startOfToday.getTime() - 89 * DAY_MS);
    case "year":
      return d >= new Date(now.getFullYear(), 0, 1);
    default:
      return true;
  }
}

export function DateRangeFilter({
  value,
  onChange,
}: {
  value: DateRangeKey;
  onChange: (next: DateRangeKey) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as DateRangeKey)}
      aria-label="Date range"
      className="rounded-md border border-paper-line bg-paper px-3 py-2 text-sm outline-none focus:border-brass"
    >
      {RANGE_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
