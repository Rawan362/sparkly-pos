"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { ChartFrame } from "./ChartFrame";
import { useSettings } from "@/lib/SettingsContext";

export type SalesPoint = { date: string; label: string; total: number };

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  const { formatMoney } = useSettings();
  if (!active || !payload?.length) return null;
  return (
    <div className="paper-card px-3 py-2 text-sm shadow-md">
      <p className="text-ink-soft">{label}</p>
      <p className="tabular font-semibold text-ink">
        {formatMoney(payload[0].value)}
      </p>
    </div>
  );
}

export function SalesChart({
  data,
  title = "Sales — last 30 days",
  emptyMessage = "No sales yet — orders will appear here once Ahmad starts closing deals.",
}: {
  data: SalesPoint[];
  title?: string;
  emptyMessage?: string;
}) {
  const { t, formatMoney } = useSettings();
  if (data.length === 0) {
    return (
      <ChartFrame title={title}>
        <p className="flex h-64 items-center justify-center text-center text-sm text-ink-soft">
          {t(emptyMessage)}
        </p>
      </ChartFrame>
    );
  }

  const everyNth = Math.max(1, Math.ceil(data.length / 6));

  return (
    <ChartFrame title={title}>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="var(--color-paper-line)" vertical={false} />
            <XAxis
              dataKey="label"
              interval={everyNth - 1}
              tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-paper-line)" }}
            />
            <YAxis
              width={48}
              tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatMoney(v)}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "var(--color-ink-faint)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="var(--color-brass-dark)"
              strokeWidth={2}
              fill="var(--color-brass)"
              fillOpacity={0.1}
              dot={false}
              activeDot={{ r: 4, fill: "var(--color-brass-dark)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
