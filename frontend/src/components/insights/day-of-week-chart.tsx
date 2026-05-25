"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartColors } from "@/hooks/use-chart-colors";
import { formatMoney } from "@/lib/format";
import type { DayOfWeek, InsightsSpendingByDay } from "@/types/insights";

const DAY_LABELS_FR: Record<DayOfWeek, string> = {
  Monday: "Lun",
  Tuesday: "Mar",
  Wednesday: "Mer",
  Thursday: "Jeu",
  Friday: "Ven",
  Saturday: "Sam",
  Sunday: "Dim",
};

function formatCompactMoney(amount: number): string {
  if (amount === 0) return "0";
  if (Math.abs(amount) >= 1_000_000)
    return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return String(Math.round(amount));
}

export function DayOfWeekChart({
  data,
  currency,
}: {
  data: InsightsSpendingByDay[];
  currency: string;
}) {
  const c = useChartColors();
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: DAY_LABELS_FR[d.day],
      })),
    [data],
  );

  const max = Math.max(...chartData.map((d) => d.total), 0);
  const hasData = max > 0;
  const topDayLabel =
    hasData &&
    chartData.reduce((acc, d) => (d.total > acc.total ? d : acc), chartData[0])
      .label;

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
      <h2 className="font-serif text-lg sm:text-xl text-sousou-secondary mb-1">
        Dépenses par jour de la semaine
      </h2>
      <p className="text-sm text-sousou-neutral mb-4">
        On met en surbrillance le jour le plus &quot;dépensier&quot;.
      </p>

      {!hasData ? (
        <div className="h-40 flex items-center justify-center text-sm text-sousou-neutral">
          Pas de dépenses enregistrées sur cette période.
        </div>
      ) : (
        <div className="h-48 sm:h-56 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={c.grid}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: c.axis }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCompactMoney(Number(v))}
                tick={{ fontSize: 11, fill: c.axis }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${c.tooltipBorder}`,
                  background: c.tooltipBg,
                  color: c.tooltipText,
                  fontSize: 12,
                }}
                labelStyle={{ color: c.tooltipText, fontWeight: 600 }}
                formatter={(value, _name, item) => {
                  const txCount =
                    (item?.payload as InsightsSpendingByDay | undefined)
                      ?.transactionCount ?? 0;
                  return [
                    `${formatMoney(Number(value ?? 0), currency)} · ${txCount} tx`,
                    "Total",
                  ];
                }}
              />
              <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                {chartData.map((d) => (
                  <Cell
                    key={d.day}
                    fill={d.label === topDayLabel ? "#FC7C78" : "#10B981"}
                    fillOpacity={d.label === topDayLabel ? 1 : 0.65}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
