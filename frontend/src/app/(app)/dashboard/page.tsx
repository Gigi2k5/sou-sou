"use client";

import { motion } from "framer-motion";
import { Flame, Plus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DashboardBudgetsCard } from "@/components/budgets/dashboard-budgets-card";
import { RecapCard } from "@/components/dashboard/recap-card";
import { WelcomeBanner } from "@/components/dashboard/welcome-banner";
import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { MascotBubble } from "@/components/mascot/mascot-bubble";
import { DashboardSavingsCard } from "@/components/savings/dashboard-savings-card";
import { BalanceHero } from "@/components/tracker/balance-hero";
import { ExpensesDonut } from "@/components/tracker/expenses-donut";
import {
  buildRange,
  RangeTabs,
  type RangeKey,
} from "@/components/tracker/range-tabs";
import { StatCard } from "@/components/tracker/stat-card";
import { TransactionDialog } from "@/components/tracker/transaction-dialog";
import { TransactionItem } from "@/components/tracker/transaction-item";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { listBudgets } from "@/lib/budgets-api";
import {
  getSummary,
  listExpenseCategories,
  listIncomeSources,
  listTransactions,
} from "@/lib/tracker-api";
import { useMascotMessage } from "@/hooks/use-mascot-message";
import { useAuth } from "@/providers/auth-provider";
import type { Budget } from "@/types/budget";
import type {
  ExpenseCategory,
  IncomeSource,
  Transaction,
  TransactionsSummary,
} from "@/types/tracker";

export default function DashboardPage() {
  const { user } = useAuth();
  const mascot = useMascotMessage("dashboard");
  const [rangeKey, setRangeKey] = useState<RangeKey>("month");
  const range = useMemo(() => buildRange(rangeKey), [rangeKey]);

  const [summary, setSummary] = useState<TransactionsSummary | null>(null);
  const [recent, setRecent] = useState<Transaction[]>([]);
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, list, src, cats, bs] = await Promise.all([
        getSummary(range.from, range.to),
        listTransactions({ limit: 5, page: 1 }),
        listIncomeSources(),
        listExpenseCategories(),
        listBudgets().catch(() => [] as Budget[]),
      ]);
      setSummary(s);
      setRecent(list.items);
      setSources(src);
      setCategories(cats);
      setBudgets(bs);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const currency = user?.currency ?? "FCFA";

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      {/* Mascotte + bulle contextuelle */}
      {mascot.message && (
        <MascotBubble
          mood={mascot.message.mood}
          message={mascot.message.message}
          emoji={mascot.message.emoji}
          size="md"
          interactive
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-sm text-sousou-neutral">Salut</p>
          <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary">
            {user?.name}
          </h1>
        </div>
        <RangeTabs value={rangeKey} onChange={setRangeKey} />
      </div>

      {/* Hero balance */}
      {loading || !summary ? (
        <Skeleton className="h-44 sm:h-52 rounded-3xl" />
      ) : (
        <BalanceHero
          balance={summary.balance}
          currency={currency}
          rangeLabel={range.label}
        />
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {loading || !summary ? (
          <>
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </>
        ) : (
          <>
            <StatCard
              label="Revenus"
              amount={summary.income.total}
              currency={currency}
              icon={TrendingUp}
              variant="primary"
              delay={0.05}
            />
            <StatCard
              label="Dépenses"
              amount={summary.expense.total}
              currency={currency}
              icon={TrendingDown}
              variant="tertiary"
              delay={0.1}
            />
            <StatCard
              label="Streak"
              value={user?.currentStreak ?? 0}
              suffix={
                (user?.currentStreak ?? 0) <= 1 ? "jour" : "jours"
              }
              icon={Flame}
              variant="secondary"
              delay={0.15}
            />
          </>
        )}
      </div>

      {/* Savings preview + Budgets mini-section (cette dernière n'apparaît
           que si l'user a au moins 1 budget pour ne pas polluer le dashboard) */}
      {budgets.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DashboardSavingsCard currency={currency} />
          <DashboardBudgetsCard budgets={budgets} currency={currency} />
        </div>
      ) : (
        <DashboardSavingsCard currency={currency} />
      )}

      {/* Récap activité (épargne + cotisations) */}
      <RecapCard currency={currency} />

      {/* Donut + recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading || !summary ? (
          <Skeleton className="h-72 rounded-3xl" />
        ) : (
          <ExpensesDonut
            buckets={summary.expense.byCategory}
            currency={currency}
          />
        )}

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="rounded-3xl bg-card border border-border/60 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-xl text-sousou-secondary">
                Dernières transactions
              </h3>
              <p className="text-sm text-sousou-neutral">
                Tes 5 mouvements les plus récents.
              </p>
            </div>
            <Link
              href="/transactions"
              className="text-sm text-sousou-primary hover:underline shrink-0"
            >
              Tout voir
            </Link>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
              <Skeleton className="h-14 rounded-2xl" />
            </div>
          ) : recent.length === 0 ? (
            <EmptyRecent />
          ) : (
            <ul className="space-y-1">
              {recent.map((tx, i) => (
                <motion.li
                  key={tx.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.3 }}
                >
                  <TransactionItem tx={tx} currency={currency} compact />
                </motion.li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>

      {/* Floating action button (mobile + desktop) */}
      <Button
        onClick={() => setDialogOpen(true)}
        size="lg"
        className="fixed bottom-20 right-5 lg:bottom-8 lg:right-8 z-20 h-14 px-5 rounded-full shadow-2xl shadow-sousou-primary/40"
      >
        <Plus className="size-5" />
        <span className="hidden sm:inline">Ajouter</span>
      </Button>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sources={sources}
        categories={categories}
        onSaved={refreshAll}
      />
    </div>
  );
}

function EmptyRecent() {
  return (
    <div className="flex flex-col items-center text-center py-8">
      <MascotAnimated mood="thinking" size="sm" disableConfetti className="mb-3" />
      <p className="text-sm text-sousou-neutral max-w-xs">
        Aucune transaction encore. Clique sur le bouton{" "}
        <span className="font-semibold text-sousou-secondary">+ Ajouter</span>{" "}
        pour commencer.
      </p>
    </div>
  );
}
