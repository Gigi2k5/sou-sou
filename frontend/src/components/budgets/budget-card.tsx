"use client";

import { motion } from "framer-motion";
import { Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Budget } from "@/types/budget";

const STATUS_STYLES = {
  safe: {
    bar: "bg-sousou-primary",
    track: "bg-sousou-primary/15 dark:bg-sousou-primary/20",
    pill: "bg-sousou-primary-50 text-sousou-primary-700",
    text: "text-sousou-primary-700",
  },
  warning: {
    bar: "bg-amber-500",
    track: "bg-amber-200/60 dark:bg-amber-900/40",
    pill: "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200",
    text: "text-amber-700 dark:text-amber-300",
  },
  exceeded: {
    bar: "bg-sousou-tertiary",
    track: "bg-sousou-tertiary/15 dark:bg-sousou-tertiary/25",
    pill: "bg-sousou-tertiary/15 text-sousou-tertiary",
    text: "text-sousou-tertiary",
  },
} as const;

const STATUS_LABELS = {
  safe: "Sur la bonne voie",
  warning: "Attention",
  exceeded: "Dépassé",
} as const;

export function BudgetCard({
  budget,
  currency,
  onEdit,
  onDelete,
  delay = 0,
}: {
  budget: Budget;
  currency: string;
  onEdit: (b: Budget) => void;
  onDelete: (b: Budget) => void;
  delay?: number;
}) {
  const styles = STATUS_STYLES[budget.status];
  const pct = Math.min(100, budget.percentageUsed);
  const overspend = Math.max(0, budget.currentSpent - budget.monthlyLimit);
  const remaining = Math.max(0, budget.monthlyLimit - budget.currentSpent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-sousou-secondary truncate">
            {budget.category.name}
          </h3>
          <span
            className={cn(
              "inline-block mt-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold",
              styles.pill,
            )}
          >
            {STATUS_LABELS[budget.status]}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onEdit(budget)}
            aria-label="Modifier le budget"
          >
            <Pencil className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(budget)}
            aria-label="Supprimer le budget"
            className="hover:text-destructive"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {/* Barre de progression — animation de remplissage au montage */}
      <div
        className={cn("h-2.5 rounded-full overflow-hidden mb-2", styles.track)}
        role="progressbar"
        aria-label={`${Math.round(budget.percentageUsed)} % du budget utilisé`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <motion.div
          className={cn("h-full rounded-full", styles.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.7, ease: "easeOut", delay: delay + 0.1 }}
        />
      </div>

      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-sm tabular-nums text-sousou-secondary">
          <span className="font-semibold">
            {formatMoney(budget.currentSpent, currency)}
          </span>
          <span className="text-sousou-neutral"> / </span>
          {formatMoney(budget.monthlyLimit, currency)}
        </span>
        <span className={cn("text-sm font-semibold tabular-nums", styles.text)}>
          {Math.round(budget.percentageUsed)}%
        </span>
      </div>

      <p className="text-xs text-sousou-neutral">
        {budget.status === "exceeded" ? (
          <>
            Dépassement de{" "}
            <span className="font-semibold text-sousou-tertiary">
              {formatMoney(overspend, currency)}
            </span>
          </>
        ) : (
          <>
            Reste{" "}
            <span className="font-semibold text-sousou-secondary">
              {formatMoney(remaining, currency)}
            </span>{" "}
            pour {budget.daysLeftInMonth} jour
            {budget.daysLeftInMonth > 1 ? "s" : ""} (
            {formatMoney(budget.averagePerDayRemaining, currency)}/jour)
          </>
        )}
      </p>
    </motion.div>
  );
}
