"use client";

import { motion } from "framer-motion";
import {
  CalendarRange,
  PiggyBank,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { MascotBubble } from "@/components/mascot/mascot-bubble";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTab } from "@/components/ui/tabs";
import { useCountUp } from "@/hooks/use-count-up";
import { useMascotMessage } from "@/hooks/use-mascot-message";
import { AVATAR_PRESETS, resolveAvatarUrl } from "@/lib/avatar";
import { formatDate, formatMoney } from "@/lib/format";
import { getLucideIcon } from "@/lib/lucide-map";
import { getRecap } from "@/lib/recap-api";
import { cn } from "@/lib/utils";
import type { RecapPeriod, RecapResult } from "@/types/recap";

const AVATAR_LABEL_BY_KEY = new Map(
  AVATAR_PRESETS.map((p) => [p.id, p.label]),
);

export function RecapCard({ currency }: { currency: string }) {
  const [period, setPeriod] = useState<RecapPeriod>("week");
  const [recap, setRecap] = useState<RecapResult | null>(null);
  const [loading, setLoading] = useState(true);
  const mascot = useMascotMessage("recap");

  const refresh = useCallback(async (p: RecapPeriod) => {
    setLoading(true);
    try {
      const data = await getRecap(p);
      setRecap(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(period);
  }, [period, refresh]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-3xl bg-card border border-border/60 p-5 sm:p-6"
    >
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-serif text-xl text-sousou-secondary inline-flex items-center gap-2">
            <CalendarRange className="size-5 text-sousou-primary" />
            Récap
          </h3>
          <p className="text-sm text-sousou-neutral">
            Ton activité sur les {period === "week" ? "7" : "30"} derniers
            jours.
          </p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as RecapPeriod)}>
          <TabsList>
            <TabsTab value="week">7 j</TabsTab>
            <TabsTab value="month">30 j</TabsTab>
          </TabsList>
        </Tabs>
      </header>

      {mascot.message && (
        <div className="mb-4">
          <MascotBubble
            mood={mascot.message.mood}
            message={mascot.message.message}
            emoji={mascot.message.emoji}
            size="sm"
            interactive
            disableConfetti
          />
        </div>
      )}

      {loading || !recap ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        </div>
      ) : (
        <RecapBody recap={recap} currency={currency} period={period} />
      )}
    </motion.section>
  );
}

function RecapBody({
  recap,
  currency,
  period,
}: {
  recap: RecapResult;
  currency: string;
  period: RecapPeriod;
}) {
  const animatedTotal = useCountUp(recap.totals.combined);
  const isEmpty = recap.totals.combined === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center text-center py-6">
        <MascotAnimated mood="sleeping" size="sm" disableConfetti className="mb-2" />
        <p className="text-sm text-sousou-neutral max-w-xs mx-auto">
          Pas encore de cotisations sur les {period === "week" ? "7" : "30"}{" "}
          derniers jours. Ajoute une contribution pour démarrer ton récap.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* TOTAL hybride : gros chiffre + breakdown en dessous */}
      <div className="rounded-2xl bg-gradient-to-br from-sousou-primary-50 via-card to-card border border-border/60 p-5">
        <div className="flex items-baseline justify-between gap-3 mb-1">
          <span className="text-xs font-semibold uppercase tracking-widest text-sousou-neutral">
            Total cotisé
          </span>
          <DeltaBadge percent={recap.delta.combined} />
        </div>
        <div className="font-serif text-3xl sm:text-4xl text-sousou-secondary tabular-nums">
          {formatMoney(animatedTotal, currency)}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-border/60">
          <BreakdownItem
            icon={PiggyBank}
            label="Épargne"
            amount={recap.totals.savings}
            currency={currency}
            tint="text-sousou-primary"
          />
          <BreakdownItem
            icon={Target}
            label="Cotisations"
            amount={recap.totals.moneyPots}
            currency={currency}
            tint="text-violet-600"
          />
        </div>
      </div>

      {/* Stats secondaires : jours actifs + plus gros jour */}
      <div className="grid grid-cols-2 gap-3">
        <StatBox
          label="Jours actifs"
          value={`${recap.activeDays} / ${period === "week" ? 7 : 30}`}
          hint={
            recap.activeDays === 0
              ? null
              : `${Math.round((recap.activeDays / (period === "week" ? 7 : 30)) * 100)}% du temps`
          }
        />
        <StatBox
          label="Plus gros jour"
          value={
            recap.biggestDay
              ? formatMoney(recap.biggestDay.amount, currency)
              : "—"
          }
          hint={
            recap.biggestDay
              ? formatDate(recap.biggestDay.date, {
                  day: "2-digit",
                  month: "short",
                })
              : null
          }
        />
      </div>

      {/* Récompenses débloquées */}
      {(recap.badges.length > 0 || recap.avatars.length > 0) && (
        <div className="rounded-2xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-200 mb-2 inline-flex items-center gap-1.5">
            <Trophy className="size-3.5" />
            Débloqués pendant la période
          </p>
          <div className="flex flex-wrap gap-2">
            {recap.badges.map((b) => {
              const Icon = getLucideIcon(b.icon);
              return (
                <span
                  key={`badge-${b.code}`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:text-amber-100"
                >
                  <Icon className="size-3.5" />
                  {b.name}
                </span>
              );
            })}
            {recap.avatars.map((a) => (
              <span
                key={`avatar-${a.key}`}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/80 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 pl-1 pr-2.5 py-0.5 text-xs font-semibold text-violet-900 dark:text-violet-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={resolveAvatarUrl(`preset:${a.key}`) ?? ""}
                  alt=""
                  className="size-5 rounded-full"
                />
                <Sparkles className="size-3 -ml-0.5" />
                {AVATAR_LABEL_BY_KEY.get(a.key) ?? a.key}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function BreakdownItem({
  icon: Icon,
  label,
  amount,
  currency,
  tint,
}: {
  icon: typeof PiggyBank;
  label: string;
  amount: number;
  currency: string;
  tint: string;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <Icon className={cn("size-4 shrink-0", tint)} />
      <div className="min-w-0">
        <div className="text-[11px] text-sousou-neutral font-semibold uppercase tracking-wider">
          {label}
        </div>
        <div className="text-sm font-semibold text-sousou-secondary tabular-nums truncate">
          {formatMoney(amount, currency)}
        </div>
      </div>
    </div>
  );
}

function StatBox({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string | null;
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-3.5">
      <div className="text-[11px] text-sousou-neutral font-semibold uppercase tracking-wider">
        {label}
      </div>
      <div className="text-lg font-semibold text-sousou-secondary tabular-nums mt-0.5">
        {value}
      </div>
      {hint && (
        <div className="text-[11px] text-sousou-neutral mt-0.5">{hint}</div>
      )}
    </div>
  );
}

function DeltaBadge({ percent }: { percent: number }) {
  if (percent === 0) {
    return (
      <span className="text-xs text-sousou-neutral">— stable</span>
    );
  }
  const positive = percent > 0;
  const Icon = positive ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
        positive
          ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200"
          : "bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-200",
      )}
    >
      <Icon className="size-3" />
      {positive ? "+" : ""}
      {percent}%
    </span>
  );
}
