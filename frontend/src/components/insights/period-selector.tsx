"use client";

import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { monthLabel } from "@/components/tracker/range-tabs";
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
  monthOffset = 0,
  onMonthOffsetChange,
}: {
  value: InsightsPeriod;
  onChange: (v: InsightsPeriod) => void;
  disabled?: boolean;
  /** 0 = période courante, -1 = un mois plus tôt, etc. */
  monthOffset?: number;
  /** Fourni → les flèches de navigation apparaissent. */
  onMonthOffsetChange?: (next: number) => void;
}) {
  const navigable = onMonthOffsetChange !== undefined;
  const shifted = new Date();
  shifted.setDate(15);
  shifted.setMonth(shifted.getMonth() + monthOffset);

  return (
    <div className="flex flex-wrap items-center gap-2">
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

      {navigable && (
        <div className="flex items-center gap-0.5 rounded-2xl border border-border/60 bg-card px-1 py-1">
          <NavButton
            label="Période précédente"
            disabled={disabled}
            onClick={() => onMonthOffsetChange(monthOffset - 1)}
          >
            <ChevronLeft className="size-4" />
          </NavButton>
          <span className="min-w-[7rem] px-1 text-center text-xs font-medium capitalize text-sousou-secondary tabular-nums">
            {monthOffset === 0 ? "Actuel" : monthLabel(shifted)}
          </span>
          {/* Rien à voir dans le futur, et un bouton sans effet passe pour cassé. */}
          <NavButton
            label="Période suivante"
            disabled={disabled || monthOffset >= 0}
            onClick={() => onMonthOffsetChange(monthOffset + 1)}
          >
            <ChevronRight className="size-4" />
          </NavButton>
        </div>
      )}
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-xl transition-colors",
        "text-sousou-neutral hover:bg-muted hover:text-sousou-secondary",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
        "disabled:pointer-events-none disabled:opacity-30",
      )}
    >
      {children}
    </button>
  );
}
