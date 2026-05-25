"use client";

import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { formatMoney } from "@/lib/format";
import type { SummaryBucket } from "@/types/tracker";

const COLORS_LIGHT = [
  "#FC7C78", // tertiary
  "#10B981", // primary
  "#1E293B", // secondary
  "#FBBF24", // jaune
  "#717973", // neutral
  "#FDA4A0", // tertiary light
  "#059669", // primary 600
  "#334155", // secondary light
];

// En dark, on éclaircit secondary/secondary-light (sinon ils se confondent
// avec le fond de la card #1E293B).
const COLORS_DARK = [
  "#F87171", // tertiary clair
  "#34D399", // primary clair
  "#CBD5E1", // navy → gris clair
  "#FCD34D", // jaune
  "#94A3B8", // neutral clair
  "#FCA5A5", // tertiary light
  "#6EE7B7", // primary 600 clair
  "#64748B", // secondary light → gris
];

export function ExpensesDonut({
  buckets,
  currency,
}: {
  buckets: SummaryBucket[];
  currency: string;
}) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const COLORS =
    mounted && resolvedTheme === "dark" ? COLORS_DARK : COLORS_LIGHT;

  const data = buckets.filter((b) => b.total > 0);
  const total = data.reduce((sum, b) => sum + b.total, 0);

  if (data.length === 0) {
    return (
      <div className="rounded-3xl bg-card border border-border/60 p-6">
        <h3 className="font-serif text-xl text-sousou-secondary mb-1">
          Dépenses par catégorie
        </h3>
        <p className="text-sm text-sousou-neutral mb-6">
          Sur la période sélectionnée.
        </p>
        <div className="flex flex-col items-center text-center py-6">
          <MascotAnimated mood="thinking" size="sm" disableConfetti className="mb-4" />
          <p className="text-sm text-sousou-neutral max-w-xs">
            Aucune dépense enregistrée. Ajoute-en une pour voir ta répartition.
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-3xl bg-card border border-border/60 p-6"
    >
      <h3 className="font-serif text-xl text-sousou-secondary mb-1">
        Dépenses par catégorie
      </h3>
      <p className="text-sm text-sousou-neutral mb-4">
        Sur la période sélectionnée.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4 items-center">
        <div className="relative w-[200px] h-[200px] mx-auto sm:mx-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="total"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={88}
                paddingAngle={2}
                stroke="none"
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  borderRadius: 12,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                  boxShadow: "0 8px 24px -12px rgba(0,0,0,0.15)",
                }}
                formatter={(value) =>
                  formatMoney(Number(value ?? 0), currency)
                }
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xs text-sousou-neutral uppercase tracking-wider">
              Total
            </span>
            <span className="font-serif text-lg text-sousou-secondary leading-none mt-1">
              {formatMoney(total, currency)}
            </span>
          </div>
        </div>

        <ul className="space-y-2 min-w-0">
          {data.map((bucket, i) => {
            const pct = total > 0 ? (bucket.total / total) * 100 : 0;
            return (
              <li
                key={bucket.id ?? i}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    className="size-2.5 rounded-full shrink-0"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate text-sousou-secondary">
                    {bucket.name}
                  </span>
                </span>
                <span className="text-sousou-neutral tabular-nums shrink-0">
                  {pct.toFixed(0)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}
