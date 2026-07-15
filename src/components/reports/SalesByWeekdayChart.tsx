"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartFrame } from "@/components/dashboard/ChartFrame";

export type WeekdayPoint = { label: string; total: number };

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="paper-card px-3 py-2 text-sm shadow-md">
      <p className="text-ink-soft">{label}</p>
      <p className="tabular font-semibold text-ink">
        {payload[0].value.toLocaleString()}
      </p>
    </div>
  );
}

export function SalesByWeekdayChart({ data }: { data: WeekdayPoint[] }) {
  const total = data.reduce((sum, d) => sum + d.total, 0);

  if (total === 0) {
    return (
      <ChartFrame title="Sales by day of week">
        <p className="flex h-64 items-center justify-center text-center text-sm text-ink-soft">
          No sales in this range yet.
        </p>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title="Sales by day of week">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-paper-line)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-paper-line)" }}
            />
            <YAxis
              width={48}
              tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v.toLocaleString()}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--color-paper-line)", fillOpacity: 0.4 }}
            />
            <Bar
              dataKey="total"
              fill="var(--color-brass)"
              stroke="var(--color-brass-dark)"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
