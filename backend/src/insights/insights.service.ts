import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { InsightsPeriod } from './dto/insights-query.dto';
import { generateInsights } from './insights-generator';
import {
  computePeriod,
  computePreviousPeriod,
  listLast6Months,
  percentDelta,
} from './period';

const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export interface InsightsTopCategory {
  categoryId: string;
  name: string;
  total: number;
  percentage: number;
  transactionCount: number;
}

export interface InsightsMonthlyEvolution {
  month: string;
  income: number;
  expense: number;
  saved: number;
  netBalance: number;
}

export interface InsightsComparisonPeriod {
  current: number;
  previous: number;
  deltaPct: number;
}

export interface InsightsComparison {
  income: InsightsComparisonPeriod;
  expense: InsightsComparisonPeriod;
  saved: InsightsComparisonPeriod;
  perCategory: {
    name: string;
    current: number;
    previous: number;
    deltaPct: number;
  }[];
}

export interface InsightsSpendingByDay {
  day: (typeof DAYS)[number];
  total: number;
  transactionCount: number;
  averagePerTransaction: number;
}

export interface InsightsSpendingByMonth {
  week1: number;
  week2: number;
  week3: number;
  week4: number;
}

export interface InsightsResponse {
  period: { start: string; end: string; label: string };
  topExpenseCategories: InsightsTopCategory[];
  monthlyEvolution: InsightsMonthlyEvolution[];
  comparisonToPrevious: InsightsComparison;
  spendingByDayOfWeek: InsightsSpendingByDay[];
  spendingByTimeOfMonth: InsightsSpendingByMonth;
  insights: string[];
}

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getInsights(
    userId: string,
    period: InsightsPeriod,
    currency: string,
  ): Promise<InsightsResponse> {
    const now = new Date();
    const range = computePeriod(period, now);
    const prevRange = computePreviousPeriod(range, period);

    const [
      topExpenseCategories,
      monthlyEvolution,
      comparison,
      dayOfWeek,
      byMonth,
    ] = await Promise.all([
      this.computeTopExpenseCategories(userId, range.start, range.end),
      this.computeMonthlyEvolution(userId, now),
      this.computeComparison(userId, range, prevRange),
      this.computeSpendingByDayOfWeek(userId, range.start, range.end),
      this.computeSpendingByTimeOfMonth(userId, range.start, range.end),
    ]);

    // Le jour avec la plus grosse moyenne par transaction.
    const topDay =
      dayOfWeek
        .filter((d) => d.transactionCount > 0)
        .sort((a, b) => b.averagePerTransaction - a.averagePerTransaction)[0] ??
      null;

    const insights = generateInsights({
      periodLabel: range.label,
      topCategories: topExpenseCategories,
      comparison,
      topDay,
      formatMoney: (amount: number) => formatMoney(amount, currency),
    });

    return {
      period: {
        start: range.start.toISOString(),
        end: range.end.toISOString(),
        label: range.label,
      },
      topExpenseCategories,
      monthlyEvolution,
      comparisonToPrevious: comparison,
      spendingByDayOfWeek: dayOfWeek,
      spendingByTimeOfMonth: byMonth,
      insights,
    };
  }

  // ---------------------------------------------------------------------------
  // Top categories
  // ---------------------------------------------------------------------------

  private async computeTopExpenseCategories(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<InsightsTopCategory[]> {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['expenseCategoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: start, lt: end },
        expenseCategoryId: { not: null },
      },
      _sum: { amount: true },
      _count: { _all: true },
    });

    const totalAll = grouped.reduce((s, g) => s + (g._sum.amount ?? 0), 0);
    const ids = grouped
      .map((g) => g.expenseCategoryId)
      .filter((id): id is string => id !== null);
    if (ids.length === 0) return [];

    const categories = await this.prisma.expenseCategory.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(categories.map((c) => [c.id, c.name]));

    return grouped
      .map((g) => {
        const total = g._sum.amount ?? 0;
        return {
          categoryId: g.expenseCategoryId!,
          name: nameMap.get(g.expenseCategoryId!) ?? '?',
          total,
          percentage: totalAll > 0 ? (total / totalAll) * 100 : 0,
          transactionCount: g._count._all,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);
  }

  // ---------------------------------------------------------------------------
  // Monthly evolution (6 derniers mois)
  // ---------------------------------------------------------------------------

  private async computeMonthlyEvolution(
    userId: string,
    now: Date,
  ): Promise<InsightsMonthlyEvolution[]> {
    const months = listLast6Months(now);
    const start = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const txs = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: start, lt: end } },
      select: {
        amount: true,
        date: true,
        type: true,
        expenseCategory: { select: { kind: true } },
      },
    });

    const buckets = new Map<
      string,
      { income: number; expense: number; saved: number }
    >();
    for (const m of months) {
      buckets.set(m, { income: 0, expense: 0, saved: 0 });
    }

    for (const tx of txs) {
      const m = `${tx.date.getFullYear()}-${String(tx.date.getMonth() + 1).padStart(2, '0')}`;
      const bucket = buckets.get(m);
      if (!bucket) continue;
      if (tx.type === 'INCOME') {
        bucket.income += tx.amount;
      } else {
        bucket.expense += tx.amount;
        if (tx.expenseCategory?.kind === 'SAVINGS') {
          bucket.saved += tx.amount;
        }
      }
    }

    return months.map((m) => {
      const b = buckets.get(m)!;
      return {
        month: m,
        income: b.income,
        expense: b.expense,
        saved: b.saved,
        netBalance: b.income - b.expense,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Comparison vs previous period
  // ---------------------------------------------------------------------------

  private async computeComparison(
    userId: string,
    current: { start: Date; end: Date },
    previous: { start: Date; end: Date },
  ): Promise<InsightsComparison> {
    const [
      curIncome,
      curExpense,
      curSaved,
      prevIncome,
      prevExpense,
      prevSaved,
    ] = await Promise.all([
      this.sumTransactions(userId, 'INCOME', current.start, current.end),
      this.sumTransactions(userId, 'EXPENSE', current.start, current.end),
      this.sumSavings(userId, current.start, current.end),
      this.sumTransactions(userId, 'INCOME', previous.start, previous.end),
      this.sumTransactions(userId, 'EXPENSE', previous.start, previous.end),
      this.sumSavings(userId, previous.start, previous.end),
    ]);

    // Per-category : top 5 catégories sur la période courante, on regarde
    // leur évolution vs la même catégorie sur la période précédente.
    const curByCat = await this.groupByCategory(
      userId,
      current.start,
      current.end,
    );
    const prevByCat = await this.groupByCategory(
      userId,
      previous.start,
      previous.end,
    );
    const prevMap = new Map(prevByCat.map((c) => [c.categoryId, c.total]));

    const top5Ids = curByCat.slice(0, 5).map((c) => c.categoryId);
    const cats = await this.prisma.expenseCategory.findMany({
      where: { id: { in: top5Ids } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(cats.map((c) => [c.id, c.name]));

    const perCategory = curByCat.slice(0, 5).map((c) => {
      const prev = prevMap.get(c.categoryId) ?? 0;
      return {
        name: nameMap.get(c.categoryId) ?? '?',
        current: c.total,
        previous: prev,
        deltaPct: percentDelta(c.total, prev),
      };
    });

    return {
      income: {
        current: curIncome,
        previous: prevIncome,
        deltaPct: percentDelta(curIncome, prevIncome),
      },
      expense: {
        current: curExpense,
        previous: prevExpense,
        deltaPct: percentDelta(curExpense, prevExpense),
      },
      saved: {
        current: curSaved,
        previous: prevSaved,
        deltaPct: percentDelta(curSaved, prevSaved),
      },
      perCategory,
    };
  }

  private async sumTransactions(
    userId: string,
    type: 'INCOME' | 'EXPENSE',
    start: Date,
    end: Date,
  ): Promise<number> {
    const agg = await this.prisma.transaction.aggregate({
      where: { userId, type, date: { gte: start, lt: end } },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }

  private async sumSavings(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<number> {
    const agg = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: start, lt: end },
        expenseCategory: { kind: 'SAVINGS' },
      },
      _sum: { amount: true },
    });
    return agg._sum.amount ?? 0;
  }

  private async groupByCategory(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<{ categoryId: string; total: number }[]> {
    const grouped = await this.prisma.transaction.groupBy({
      by: ['expenseCategoryId'],
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: start, lt: end },
        expenseCategoryId: { not: null },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });
    return grouped
      .filter((g) => g.expenseCategoryId !== null)
      .map((g) => ({
        categoryId: g.expenseCategoryId!,
        total: g._sum.amount ?? 0,
      }));
  }

  // ---------------------------------------------------------------------------
  // Spending by day of week
  // ---------------------------------------------------------------------------

  private async computeSpendingByDayOfWeek(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<InsightsSpendingByDay[]> {
    const txs = await this.prisma.transaction.findMany({
      where: { userId, type: 'EXPENSE', date: { gte: start, lt: end } },
      select: { amount: true, date: true },
    });

    const buckets: Record<string, { total: number; count: number }> = {
      Monday: { total: 0, count: 0 },
      Tuesday: { total: 0, count: 0 },
      Wednesday: { total: 0, count: 0 },
      Thursday: { total: 0, count: 0 },
      Friday: { total: 0, count: 0 },
      Saturday: { total: 0, count: 0 },
      Sunday: { total: 0, count: 0 },
    };

    for (const tx of txs) {
      const dayName = DAYS[tx.date.getDay()];
      buckets[dayName].total += tx.amount;
      buckets[dayName].count += 1;
    }

    // On retourne du lundi au dimanche pour un graphique cohérent côté FR.
    const weekOrder: (typeof DAYS)[number][] = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    return weekOrder.map((day) => {
      const b = buckets[day];
      return {
        day,
        total: b.total,
        transactionCount: b.count,
        averagePerTransaction: b.count > 0 ? b.total / b.count : 0,
      };
    });
  }

  // ---------------------------------------------------------------------------
  // Spending by week of month
  // ---------------------------------------------------------------------------

  private async computeSpendingByTimeOfMonth(
    userId: string,
    start: Date,
    end: Date,
  ): Promise<InsightsSpendingByMonth> {
    const txs = await this.prisma.transaction.findMany({
      where: { userId, type: 'EXPENSE', date: { gte: start, lt: end } },
      select: { amount: true, date: true },
    });

    const buckets = { week1: 0, week2: 0, week3: 0, week4: 0 };
    for (const tx of txs) {
      const day = tx.date.getDate();
      if (day <= 7) buckets.week1 += tx.amount;
      else if (day <= 14) buckets.week2 += tx.amount;
      else if (day <= 21) buckets.week3 += tx.amount;
      else buckets.week4 += tx.amount;
    }
    return buckets;
  }
}

function formatMoney(amount: number, currency: string): string {
  if (currency === 'FCFA' || currency === 'XOF' || currency === 'XAF') {
    return `${new Intl.NumberFormat('fr-FR', {
      maximumFractionDigits: 0,
    }).format(amount)} FCFA`;
  }
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat('fr-FR').format(amount)} ${currency}`;
  }
}

// Suppression du Prisma unused import si on touche pas le namespace.
void Prisma;
