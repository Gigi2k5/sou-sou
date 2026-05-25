"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useChartColors } from "@/hooks/use-chart-colors";
import { formatMoney } from "@/lib/format";
import type { InsightsMonthlyEvolutionPoint } from "@/types/insights";

const MONTH_LABELS_FR = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function formatMonthLabel(yyyymm: string): string {
  const [, mm] = yyyymm.split("-");
  const idx = Number(mm) - 1;
  return MONTH_LABELS_FR[idx] ?? yyyymm;
}

function formatCompactMoney(amount: number, currency: string): string {
  if (amount === 0) return "0";
  if (Math.abs(amount) >= 1_000_000)
    return `${(amount / 1_000_000).toFixed(1)}M`;
  if (Math.abs(amount) >= 1_000) return `${Math.round(amount / 1_000)}k`;
  return formatMoney(amount, currency);
}

export function EvolutionChart({
  data,
  currency,
}: {
  data: InsightsMonthlyEvolutionPoint[];
  currency: string;
}) {
  const c = useChartColors();
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: formatMonthLabel(d.month),
      })),
    [data],
  );

  const hasData = chartData.some(
    (d) => d.income > 0 || d.expense > 0 || d.saved > 0,
  );

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
      <h2 className="font-serif text-lg sm:text-xl text-sousou-secondary mb-1">
        Évolution sur 6 mois
      </h2>
      <p className="text-sm text-sousou-neutral mb-4">
        Revenus, dépenses et épargne mois par mois.
      </p>

      {!hasData ? (
        <div className="h-48 flex items-center justify-center text-sm text-sousou-neutral">
          Pas assez de données pour tracer l&apos;évolution.
        </div>
      ) : (
        <div className="h-56 sm:h-64 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
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
                tickFormatter={(v) => formatCompactMoney(Number(v), currency)}
                tick={{ fontSize: 11, fill: c.axis }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${c.tooltipBorder}`,
                  background: c.tooltipBg,
                  color: c.tooltipText,
                  fontSize: 12,
                }}
                labelStyle={{ color: c.tooltipText, fontWeight: 600 }}
                formatter={(value, name) => [
                  formatMoney(Number(value ?? 0), currency),
                  String(name),
                ]}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              />
              <Line
                type="monotone"
                dataKey="income"
                name="Revenus"
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="expense"
                name="Dépenses"
                stroke="#FC7C78"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="saved"
                name="Épargne"
                stroke="#FBBF24"
                strokeWidth={2.5}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
