"use client";

import { motion } from "framer-motion";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type {
  InsightsComparison,
  InsightsComparisonPeriod,
} from "@/types/insights";

type Tone = "positive" | "negative" | "neutral";

interface CardProps {
  label: string;
  data: InsightsComparisonPeriod;
  /** Pour ces métriques, "hausse = bonne nouvelle ?" */
  upIsGood: boolean;
  currency: string;
  delay: number;
}

function toneFor(deltaPct: number, upIsGood: boolean): Tone {
  if (Math.abs(deltaPct) < 1) return "neutral";
  if (deltaPct > 0) return upIsGood ? "positive" : "negative";
  return upIsGood ? "negative" : "positive";
}

const TONE_CLS: Record<Tone, string> = {
  positive: "text-sousou-primary-700 bg-sousou-primary-50 dark:bg-sousou-primary/15 dark:text-sousou-primary",
  negative: "text-sousou-tertiary bg-sousou-tertiary/10 dark:bg-sousou-tertiary/20 dark:text-sousou-tertiary",
  neutral: "text-sousou-neutral bg-muted",
};

function ComparisonCard({ label, data, upIsGood, currency, delay }: CardProps) {
  const tone = toneFor(data.deltaPct, upIsGood);
  const Icon =
    tone === "neutral"
      ? Minus
      : data.deltaPct > 0
        ? ArrowUpRight
        : ArrowDownRight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: "easeOut" }}
      className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-sousou-neutral">
        {label}
      </p>
      <p className="mt-2 font-serif text-xl sm:text-2xl text-sousou-secondary tabular-nums">
        {formatMoney(data.current, currency)}
      </p>
      <div
        className={cn(
          "mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
          TONE_CLS[tone],
        )}
      >
        <Icon className="size-3.5" />
        <span className="tabular-nums">
          {data.deltaPct > 0 ? "+" : ""}
          {data.deltaPct.toFixed(0)} %
        </span>
        <span className="opacity-70 hidden sm:inline">vs précédent</span>
      </div>
      <p className="mt-2 text-[11px] text-sousou-neutral">
        Avant&nbsp;: {formatMoney(data.previous, currency)}
      </p>
    </motion.div>
  );
}

export function ComparisonCards({
  comparison,
  currency,
}: {
  comparison: InsightsComparison;
  currency: string;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <ComparisonCard
          label="Revenus"
          data={comparison.income}
          upIsGood
          currency={currency}
          delay={0}
        />
        <ComparisonCard
          label="Dépenses"
          data={comparison.expense}
          upIsGood={false}
          currency={currency}
          delay={0.05}
        />
        <ComparisonCard
          label="Épargne"
          data={comparison.saved}
          upIsGood
          currency={currency}
          delay={0.1}
        />
      </div>

      {comparison.perCategory.length > 0 && (
        <PerCategoryList
          items={comparison.perCategory}
          currency={currency}
        />
      )}
    </div>
  );
}

function PerCategoryList({
  items,
  currency,
}: {
  items: InsightsComparison["perCategory"];
  currency: string;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
      <h3 className="font-serif text-base sm:text-lg text-sousou-secondary mb-1">
        Évolution par catégorie
      </h3>
      <p className="text-xs text-sousou-neutral mb-3">
        Top 5 sur la période courante.
      </p>
      <ul className="space-y-2">
        {items.map((item) => {
          const tone = toneFor(item.deltaPct, false);
          const TrendIcon =
            tone === "neutral"
              ? ArrowRight
              : item.deltaPct > 0
                ? ArrowUpRight
                : ArrowDownRight;
          return (
            <li
              key={item.name}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="text-sousou-secondary truncate">
                {item.name}
              </span>
              <span className="flex items-center gap-2 shrink-0">
                <span className="text-xs tabular-nums text-sousou-neutral">
                  {formatMoney(item.current, currency)}
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold tabular-nums",
                    TONE_CLS[tone],
                  )}
                >
                  <TrendIcon className="size-3" />
                  {item.deltaPct > 0 ? "+" : ""}
                  {item.deltaPct.toFixed(0)} %
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
