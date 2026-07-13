"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import { ChartFrame } from "./ChartFrame";
import type { OrderStatus } from "@/lib/types";

export type StatusCount = { status: OrderStatus; count: number };

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: "var(--color-brass-dark)",
  SHIPPED: "var(--color-ink-soft)",
  DELIVERED: "var(--color-stamp-green)",
  CANCELLED: "var(--color-stamp-red)",
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: StatusCount }>;
}) {
  if (!active || !payload?.length) return null;
  const { status, count } = payload[0].payload;
  return (
    <div className="paper-card px-3 py-2 text-sm shadow-md">
      <p className="text-ink-soft">{status}</p>
      <p className="tabular font-semibold text-ink">{count.toLocaleString()}</p>
    </div>
  );
}

export function OrdersStatusChart({ data }: { data: StatusCount[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <ChartFrame title="Orders by status">
        <p className="flex h-64 items-center justify-center text-center text-sm text-ink-soft">
          No orders yet — orders will appear here once Ahmad starts closing
          deals.
        </p>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame title="Orders by status">
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            barCategoryGap="30%"
            margin={{ top: 8, right: 32, left: 8, bottom: 0 }}
          >
            <CartesianGrid
              stroke="var(--color-paper-line)"
              horizontal={false}
            />
            <XAxis
              type="number"
              allowDecimals={false}
              tick={{ fill: "var(--color-ink-faint)", fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "var(--color-paper-line)" }}
            />
            <YAxis
              type="category"
              dataKey="status"
              width={84}
              tick={{ fill: "var(--color-ink-soft)", fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "var(--color-paper-line)", fillOpacity: 0.4 }}
            />
            <Bar dataKey="count" barSize={20} radius={[0, 4, 4, 0]}>
              {data.map((d) => (
                <Cell key={d.status} fill={STATUS_COLOR[d.status]} />
              ))}
              <LabelList
                dataKey="count"
                position="right"
                className="tabular"
                fill="var(--color-ink)"
                fontSize={12}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
  );
}
