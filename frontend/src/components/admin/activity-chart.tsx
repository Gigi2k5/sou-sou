"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";

import { useChartColors } from "@/hooks/use-chart-colors";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { formatDateShort } from "@/lib/format";

export function ActivityChart({
  data,
}: {
  data: { date: string; transactions: number; contributions: number }[];
}) {
  const c = useChartColors();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  // Le navy `#1E293B` se confond avec le fond de la card en dark.
  // En dark on bascule la série Transactions sur du gris clair pour rester lisible.
  const transactionsStroke =
    mounted && resolvedTheme === "dark" ? "#CBD5E1" : "#1E293B";

  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <h2 className="font-serif text-lg text-sousou-secondary mb-1">
        Activité quotidienne
      </h2>
      <p className="text-xs text-sousou-neutral mb-4">
        Transactions et cotisations sur 30 jours
      </p>
      <div className="h-48 sm:h-56 -mx-2 -mb-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
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
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px", color: c.axis }}
              iconType="circle"
            />
            <Line
              type="monotone"
              dataKey="transactions"
              name="Transactions"
              stroke={transactionsStroke}
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="contributions"
              name="Cotisations"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
