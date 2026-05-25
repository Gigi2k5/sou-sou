"use client";

import { motion } from "framer-motion";

import { formatMoney } from "@/lib/format";
import type { InsightsSpendingByMonth } from "@/types/insights";

const WEEKS: { key: keyof InsightsSpendingByMonth; label: string; range: string }[] =
  [
    { key: "week1", label: "Semaine 1", range: "Jours 1-7" },
    { key: "week2", label: "Semaine 2", range: "Jours 8-14" },
    { key: "week3", label: "Semaine 3", range: "Jours 15-21" },
    { key: "week4", label: "Semaine 4", range: "Jours 22-fin" },
  ];

export function TimeOfMonthCards({
  data,
  currency,
}: {
  data: InsightsSpendingByMonth;
  currency: string;
}) {
  const total = data.week1 + data.week2 + data.week3 + data.week4;
  const max = Math.max(data.week1, data.week2, data.week3, data.week4, 1);
  const hasData = total > 0;

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
      <h2 className="font-serif text-lg sm:text-xl text-sousou-secondary mb-1">
        Dépenses par semaine du mois
      </h2>
      <p className="text-sm text-sousou-neutral mb-4">
        {hasData
          ? "Quand est-ce que tu dépenses le plus dans le mois ?"
          : "Pas encore assez de données pour ce découpage."}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {WEEKS.map((w, i) => {
          const value = data[w.key];
          const pct = hasData ? (value / total) * 100 : 0;
          const widthPct = hasData ? (value / max) * 100 : 0;
          const isMax = hasData && value === max && value > 0;
          return (
            <motion.div
              key={w.key}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.05 }}
              className={`rounded-2xl border p-3 sm:p-4 ${
                isMax
                  ? "border-sousou-primary/40 bg-sousou-primary-50/60 dark:bg-sousou-primary/10"
                  : "border-border/60 bg-card"
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-sousou-neutral">
                {w.label}
              </p>
              <p className="mt-1.5 font-serif text-base sm:text-lg text-sousou-secondary tabular-nums">
                {formatMoney(value, currency)}
              </p>
              <p className="text-[10px] text-sousou-neutral mt-0.5">{w.range}</p>
              <div className="mt-2 h-1 rounded-full bg-sousou-primary/15 dark:bg-sousou-primary/20 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05 + 0.1 }}
                  className="h-full bg-sousou-primary rounded-full"
                />
              </div>
              {hasData && (
                <p className="text-[11px] text-sousou-neutral mt-1.5 tabular-nums">
                  {pct.toFixed(0)} % du mois
                </p>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
