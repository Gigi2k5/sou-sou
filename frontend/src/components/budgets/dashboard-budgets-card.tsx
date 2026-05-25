"use client";

import { motion } from "framer-motion";
import { ArrowRight, Wallet } from "lucide-react";
import Link from "next/link";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Budget, BudgetStatus } from "@/types/budget";

const PRIORITY: Record<BudgetStatus, number> = {
  exceeded: 0,
  warning: 1,
  safe: 2,
};

const STATUS_BAR_CLS: Record<BudgetStatus, string> = {
  safe: "bg-sousou-primary",
  warning: "bg-amber-500",
  exceeded: "bg-sousou-tertiary",
};

const STATUS_TRACK_CLS: Record<BudgetStatus, string> = {
  safe: "bg-sousou-primary/15 dark:bg-sousou-primary/20",
  warning: "bg-amber-200/60 dark:bg-amber-900/40",
  exceeded: "bg-sousou-tertiary/15 dark:bg-sousou-tertiary/25",
};

/**
 * Mini-section dashboard : on affiche les 3 budgets les plus "à risque"
 * (exceeded > warning > safe), avec leur barre de progression compacte.
 * Rend `null` si aucun budget — ne pollue pas le dashboard pour les users qui
 * n'ont pas encore activé la feature.
 */
export function DashboardBudgetsCard({
  budgets,
  currency,
}: {
  budgets: Budget[];
  currency: string;
}) {
  if (budgets.length === 0) return null;

  const top = [...budgets]
    .sort((a, b) => {
      const pa = PRIORITY[a.status];
      const pb = PRIORITY[b.status];
      if (pa !== pb) return pa - pb;
      // Au sein d'un même statut, on met le plus avancé en pourcentage en premier.
      return b.percentageUsed - a.percentageUsed;
    })
    .slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-3xl border border-border/60 bg-card p-4 sm:p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-serif text-lg text-sousou-secondary inline-flex items-center gap-2">
          <Wallet className="size-5 text-sousou-primary" />
          Mes budgets
        </h2>
        <Link
          href="/budgets"
          className="text-xs font-semibold text-sousou-primary-700 hover:underline inline-flex items-center gap-1"
        >
          Tout voir
          <ArrowRight className="size-3" />
        </Link>
      </div>

      <ul className="space-y-3">
        {top.map((b) => {
          const pct = Math.min(100, b.percentageUsed);
          return (
            <li key={b.id}>
              <Link
                href="/budgets"
                className="block rounded-xl px-2 py-2 hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <span className="text-sm font-semibold text-sousou-secondary truncate">
                    {b.category.name}
                  </span>
                  <span className="text-xs tabular-nums text-sousou-neutral shrink-0">
                    {formatMoney(b.currentSpent, currency)} /{" "}
                    {formatMoney(b.monthlyLimit, currency)}
                  </span>
                </div>
                <div
                  className={cn(
                    "h-1.5 rounded-full overflow-hidden",
                    STATUS_TRACK_CLS[b.status],
                  )}
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(pct)}
                >
                  <div
                    className={cn("h-full rounded-full", STATUS_BAR_CLS[b.status])}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </motion.div>
  );
}
