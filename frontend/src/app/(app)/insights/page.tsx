"use client";

import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { ComparisonCards } from "@/components/insights/comparison-cards";
import { DayOfWeekChart } from "@/components/insights/day-of-week-chart";
import { EvolutionChart } from "@/components/insights/evolution-chart";
import { MascotBubble } from "@/components/insights/mascot-bubble";
import { PeriodSelector } from "@/components/insights/period-selector";
import { TimeOfMonthCards } from "@/components/insights/time-of-month-cards";
import { TopCategoriesList } from "@/components/insights/top-categories-list";
import { Skeleton } from "@/components/ui/skeleton";
import { extractApiErrorMessage } from "@/lib/api";
import { getInsights } from "@/lib/insights-api";
import { useAuth } from "@/providers/auth-provider";
import type { InsightsPeriod, InsightsResponse } from "@/types/insights";

export default function InsightsPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "FCFA";

  const [period, setPeriod] = useState<InsightsPeriod>("current_month");
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (p: InsightsPeriod) => {
    setLoading(true);
    try {
      const res = await getInsights(p);
      setData(res);
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Chargement impossible"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh(period);
  }, [period, refresh]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl text-sousou-secondary inline-flex items-center gap-2">
            <Sparkles className="size-7 text-sousou-primary" />
            Analyses
          </h1>
          <p className="text-sm text-sousou-neutral mt-1">
            {data?.period.label
              ? `Période : ${data.period.label}`
              : "Tes habitudes en chiffres et en couleurs ✨"}
          </p>
        </div>
        <PeriodSelector
          value={period}
          onChange={setPeriod}
          disabled={loading}
        />
      </header>

      {loading && !data ? (
        <LoadingSkeleton />
      ) : data ? (
        <div className="space-y-6">
          <MascotBubble insights={data.insights} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <TopCategoriesList
              categories={data.topExpenseCategories}
              currency={currency}
            />
            <DayOfWeekChart
              data={data.spendingByDayOfWeek}
              currency={currency}
            />
          </div>

          <EvolutionChart data={data.monthlyEvolution} currency={currency} />

          <ComparisonCards
            comparison={data.comparisonToPrevious}
            currency={currency}
          />

          <TimeOfMonthCards
            data={data.spendingByTimeOfMonth}
            currency={currency}
          />
        </div>
      ) : null}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-32 rounded-3xl" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Skeleton className="h-64 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
      <Skeleton className="h-72 rounded-3xl" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
        <Skeleton className="h-28 rounded-2xl" />
      </div>
    </div>
  );
}
