export type DateRangeKey = "all" | "today" | "7d" | "30d" | "90d" | "year" | "custom";

export type CustomRange = { start: string; end: string };

export const DAY_MS = 24 * 60 * 60 * 1000;

const RANGE_OPTIONS: { value: DateRangeKey; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "year", label: "This year" },
  { value: "custom", label: "Custom range…" },
];

export function isWithinRange(
  dateStr: string,
  range: DateRangeKey,
  custom?: CustomRange
): boolean {
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
    case "custom": {
      if (!custom?.start || !custom?.end) return true;
      const start = new Date(`${custom.start}T00:00:00`);
      const end = new Date(`${custom.end}T23:59:59.999`);
      return d >= start && d <= end;
    }
    default:
      return true;
  }
}

const dateInputClass =
  "rounded-md border border-paper-line bg-paper px-2 py-2 text-sm tabular outline-none focus:border-brass";

export function DateRangeFilter({
  value,
  onChange,
  customRange,
  onCustomRangeChange,
}: {
  value: DateRangeKey;
  onChange: (next: DateRangeKey) => void;
  customRange: CustomRange;
  onCustomRangeChange: (next: CustomRange) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {value === "custom" && (
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            aria-label="Custom range start"
            value={customRange.start}
            max={customRange.end || undefined}
            onChange={(e) =>
              onCustomRangeChange({ ...customRange, start: e.target.value })
            }
            className={dateInputClass}
          />
          <span className="text-xs text-ink-faint">to</span>
          <input
            type="date"
            aria-label="Custom range end"
            value={customRange.end}
            min={customRange.start || undefined}
            onChange={(e) =>
              onCustomRangeChange({ ...customRange, end: e.target.value })
            }
            className={dateInputClass}
          />
        </div>
      )}
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
    </div>
  );
}
