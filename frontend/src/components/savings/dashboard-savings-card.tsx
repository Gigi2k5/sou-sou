"use client";

import { motion } from "framer-motion";
import { ArrowRight, PiggyBank, Plus } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { ProgressRing } from "@/components/savings/progress-ring";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/format";
import { getGoal, getStats } from "@/lib/savings-api";
import type { GamificationStats, SavingsGoal } from "@/types/savings";

/**
 * Mini-card épargne pour le dashboard. Charge goal + stats indépendamment.
 * - Si pas de goal : CTA pour en créer un
 * - Sinon : progression + streak + lien vers /epargne
 */
export function DashboardSavingsCard({ currency }: { currency: string }) {
  const [goal, setGoal] = useState<SavingsGoal | null>(null);
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [g, s] = await Promise.all([getGoal(), getStats()]);
        setGoal(g);
        setStats(s);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <Skeleton className="h-40 rounded-3xl" />;
  }

  if (!goal) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="rounded-3xl bg-gradient-to-br from-sousou-primary-50 via-card to-card border border-border/60 p-5 sm:p-6 flex items-center gap-4"
      >
        <div className="size-12 rounded-2xl bg-sousou-primary text-white flex items-center justify-center shrink-0">
          <PiggyBank className="size-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-serif text-lg text-sousou-secondary leading-tight">
            Définis un objectif d&apos;épargne
          </h3>
          <p className="text-xs sm:text-sm text-sousou-neutral mt-0.5">
            Pour suivre ta progression et débloquer des badges.
          </p>
        </div>
        <Button
          size="sm"
          nativeButton={false}
          render={
            <Link href="/epargne">
              <Plus className="size-4" />
              <span className="hidden sm:inline">Créer</span>
            </Link>
          }
        />
      </motion.div>
    );
  }

  const progress = Math.max(
    0,
    Math.min(1, goal.currentAmount / goal.targetAmount),
  );
  const pct = Math.round(progress * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 }}
      className="rounded-3xl bg-card border border-border/60 p-5 sm:p-6 flex items-center gap-5 sm:gap-6"
    >
      <ProgressRing progress={progress} size={92} strokeWidth={9}>
        <span className="font-serif text-lg text-sousou-secondary leading-none">
          {pct}%
        </span>
      </ProgressRing>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <h3 className="font-serif text-lg text-sousou-secondary truncate">
            {goal.name}
          </h3>
          {goal.isCompleted && (
            <span className="text-[10px] uppercase tracking-wider font-semibold bg-sousou-primary/15 text-sousou-primary-700 px-2 py-0.5 rounded-full shrink-0">
              Atteint
            </span>
          )}
        </div>
        <p className="text-sm text-sousou-secondary tabular-nums">
          {formatMoney(goal.currentAmount, currency)}
          <span className="text-sousou-neutral">
            {" "}
            / {formatMoney(goal.targetAmount, currency)}
          </span>
        </p>
        <p className="text-xs text-sousou-neutral mt-1">
          {stats?.currentStreak ?? 0} jour{(stats?.currentStreak ?? 0) > 1 ? "s" : ""} d&apos;affilée
          {" · "}
          {stats?.totalPoints ?? 0} pts
        </p>
      </div>
      <Link
        href="/epargne"
        className="shrink-0 size-10 rounded-full bg-sousou-primary-50 text-sousou-primary-700 flex items-center justify-center hover:bg-sousou-primary hover:text-white transition-colors"
        aria-label="Aller à l'épargne"
      >
        <ArrowRight className="size-5" />
      </Link>
    </motion.div>
  );
}
