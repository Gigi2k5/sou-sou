"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";
import type { InsightsPeriod } from "@/types/insights";

const OPTIONS: { value: InsightsPeriod; label: string; shortLabel: string }[] = [
  { value: "current_month", label: "Ce mois", shortLabel: "Ce mois" },
  { value: "last_month", label: "Mois dernier", shortLabel: "Mois -1" },
  { value: "last_3_months", label: "3 derniers mois", shortLabel: "3 mois" },
  { value: "last_6_months", label: "6 derniers mois", shortLabel: "6 mois" },
];

export function PeriodSelector({
  value,
  onChange,
  disabled,
}: {
  value: InsightsPeriod;
  onChange: (v: InsightsPeriod) => void;
  disabled?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Période d'analyse"
      className="inline-flex flex-wrap gap-1 rounded-2xl border border-border/60 bg-card p-1"
    >
      {OPTIONS.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={cn(
              "relative px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
              active
                ? "text-white"
                : "text-sousou-neutral hover:text-sousou-secondary",
              disabled && "opacity-60 cursor-not-allowed",
            )}
          >
            {active && (
              <motion.span
                layoutId="period-pill"
                className="absolute inset-0 rounded-xl bg-sousou-primary"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10 hidden sm:inline">{opt.label}</span>
            <span className="relative z-10 sm:hidden">{opt.shortLabel}</span>
          </button>
        );
      })}
    </div>
  );
}
