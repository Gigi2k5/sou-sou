"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartColors } from "@/hooks/use-chart-colors";
import { formatDateShort } from "@/lib/format";

export function SignupsChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  const c = useChartColors();
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <h2 className="font-serif text-lg text-sousou-secondary mb-1">
        Nouvelles inscriptions
      </h2>
      <p className="text-xs text-sousou-neutral mb-4">30 derniers jours</p>
      <div className="h-48 sm:h-56 -mx-2 -mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="signups-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
            <XAxis
              dataKey="date"
              tickFormatter={(d) => formatDateShort(d)}
              tick={{ fontSize: 11, fill: c.axis }}
              minTickGap={28}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: c.axis }}
              tickLine={false}
              axisLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{
                borderRadius: "12px",
                border: `1px solid ${c.tooltipBorder}`,
                background: c.tooltipBg,
                color: c.tooltipText,
                fontSize: "12px",
              }}
              labelStyle={{ color: c.tooltipText }}
              labelFormatter={(d) => formatDateShort(d as string)}
              formatter={(v) => [String(v), "Inscriptions"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#10B981"
              strokeWidth={2}
              fill="url(#signups-grad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
