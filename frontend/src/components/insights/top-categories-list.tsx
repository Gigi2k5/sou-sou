"use client";

import { motion } from "framer-motion";

import { formatMoney } from "@/lib/format";
import type { InsightsTopCategory } from "@/types/insights";

const RANK_COLORS = [
  { bar: "bg-sousou-primary", track: "bg-sousou-primary/15 dark:bg-sousou-primary/20" },
  { bar: "bg-sousou-tertiary", track: "bg-sousou-tertiary/15 dark:bg-sousou-tertiary/20" },
  { bar: "bg-amber-500", track: "bg-amber-200/60 dark:bg-amber-900/40" },
];

export function TopCategoriesList({
  categories,
  currency,
}: {
  categories: InsightsTopCategory[];
  currency: string;
}) {
  if (categories.length === 0) {
    return (
      <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
        <h2 className="font-serif text-lg sm:text-xl text-sousou-secondary mb-1">
          Top catégories de dépense
        </h2>
        <p className="text-sm text-sousou-neutral">
          Aucune dépense sur cette période — rien à classer.
        </p>
      </div>
    );
  }

  // Le max sert d'échelle visuelle pour que la catégorie #1 occupe ~100 % de la barre.
  const max = Math.max(...categories.map((c) => c.total), 1);

  return (
    <div className="rounded-3xl border border-border/60 bg-card p-5 sm:p-6">
      <h2 className="font-serif text-lg sm:text-xl text-sousou-secondary mb-1">
        Top catégories de dépense
      </h2>
      <p className="text-sm text-sousou-neutral mb-4">
        Les 3 catégories qui pèsent le plus sur la période.
      </p>

      <ul className="space-y-4">
        {categories.map((cat, i) => {
          const colors = RANK_COLORS[i] ?? RANK_COLORS[2];
          const widthPct = Math.min(100, (cat.total / max) * 100);
          return (
            <li key={cat.categoryId}>
              <div className="flex items-baseline justify-between gap-2 mb-1.5">
                <span className="text-sm font-semibold text-sousou-secondary truncate inline-flex items-center gap-2">
                  <span
                    className="text-xs font-mono text-sousou-neutral tabular-nums"
                    aria-hidden
                  >
                    #{i + 1}
                  </span>
                  {cat.name}
                </span>
                <span className="text-xs tabular-nums text-sousou-neutral shrink-0">
                  {formatMoney(cat.total, currency)}{" "}
                  <span className="text-sousou-neutral/70">
                    ({cat.percentage.toFixed(0)} %)
                  </span>
                </span>
              </div>
              <div
                className={`h-2 rounded-full overflow-hidden ${colors.track}`}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(widthPct)}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${widthPct}%` }}
                  transition={{ duration: 0.7, delay: 0.1 * i, ease: "easeOut" }}
                  className={`h-full rounded-full ${colors.bar}`}
                />
              </div>
              <p className="text-[11px] text-sousou-neutral mt-1">
                {cat.transactionCount} transaction
                {cat.transactionCount > 1 ? "s" : ""}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
