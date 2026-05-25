import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { RecapPeriod } from './dto/recap-query.dto';

export interface RecapTotals {
  combined: number;
  savings: number;
  moneyPots: number;
}

export interface RecapBadge {
  code: string;
  name: string;
  icon: string;
  unlockedAt: Date;
}

export interface RecapAvatar {
  key: string;
  unlockedAt: Date;
}

export interface RecapBiggestDay {
  /** YYYY-MM-DD (timezone serveur, jour calendaire). */
  date: string;
  amount: number;
}

export interface RecapResult {
  period: RecapPeriod;
  range: { from: Date; to: Date };
  previousRange: { from: Date; to: Date };
  totals: RecapTotals;
  previousTotals: RecapTotals;
  delta: RecapTotals; // pourcentages signés (ex: 15 = +15%, -3.5 = -3.5%)
  activeDays: number;
  biggestDay: RecapBiggestDay | null;
  badges: RecapBadge[];
  avatars: RecapAvatar[];
}

@Injectable()
export class RecapService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Récap glissant (validé Étape 6 — option A) :
   *   - week : 7 j glissants (D-7 → maintenant)
   *   - month : 30 j glissants (D-30 → maintenant)
   *
   * On compare aux 7/30 j précédents pour le delta.
   */
  async build(userId: string, period: RecapPeriod): Promise<RecapResult> {
    const now = new Date();
    const days = period === RecapPeriod.WEEK ? 7 : 30;
    const range = {
      from: subDays(now, days),
      to: now,
    };
    const previousRange = {
      from: subDays(now, days * 2),
      to: subDays(now, days),
    };

    const [totals, previousTotals, daily, badges, avatars] = await Promise.all([
      this.computeTotals(userId, range.from, range.to),
      this.computeTotals(userId, previousRange.from, previousRange.to),
      this.computeDailyBreakdown(userId, range.from, range.to),
      this.listBadgesUnlocked(userId, range.from, range.to),
      this.listAvatarsUnlocked(userId, range.from, range.to),
    ]);

    const delta: RecapTotals = {
      combined: percentDelta(totals.combined, previousTotals.combined),
      savings: percentDelta(totals.savings, previousTotals.savings),
      moneyPots: percentDelta(totals.moneyPots, previousTotals.moneyPots),
    };

    // Active days + biggest day calcul à partir du daily breakdown.
    const activeDays = daily.filter((d) => d.amount > 0).length;
    const biggestDay = daily.reduce<RecapBiggestDay | null>((best, d) => {
      if (d.amount <= 0) return best;
      if (!best || d.amount > best.amount) return d;
      return best;
    }, null);

    return {
      period,
      range,
      previousRange,
      totals,
      previousTotals,
      delta,
      activeDays,
      biggestDay,
      badges,
      avatars,
    };
  }

  private async computeTotals(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<RecapTotals> {
    const [savings, moneyPots] = await Promise.all([
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: from, lte: to },
          expenseCategory: { kind: 'SAVINGS' },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: from, lte: to },
          expenseCategory: { kind: 'POT' },
        },
        _sum: { amount: true },
      }),
    ]);
    const s = savings._sum.amount ?? 0;
    const m = moneyPots._sum.amount ?? 0;
    return { combined: s + m, savings: s, moneyPots: m };
  }

  /**
   * Renvoie le total cumulé (épargne + cotisations) par jour calendaire
   * sur la fenêtre donnée. Les jours sans contribution sont absents
   * du résultat (filtrage `activeDays` côté caller).
   */
  private async computeDailyBreakdown(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<{ date: string; amount: number }[]> {
    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: from, lte: to },
        expenseCategory: { kind: { in: ['SAVINGS', 'POT'] } },
      },
      select: { date: true, amount: true },
    });

    const sumByDay = new Map<string, number>();
    for (const t of transactions) {
      const k = ymd(t.date);
      sumByDay.set(k, (sumByDay.get(k) ?? 0) + t.amount);
    }

    return Array.from(sumByDay.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private async listBadgesUnlocked(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<RecapBadge[]> {
    const rows = await this.prisma.userBadge.findMany({
      where: { userId, unlockedAt: { gte: from, lte: to } },
      include: {
        badge: { select: { code: true, name: true, icon: true } },
      },
      orderBy: { unlockedAt: 'asc' },
    });
    return rows.map((r) => ({
      code: r.badge.code,
      name: r.badge.name,
      icon: r.badge.icon,
      unlockedAt: r.unlockedAt,
    }));
  }

  private async listAvatarsUnlocked(
    userId: string,
    from: Date,
    to: Date,
  ): Promise<RecapAvatar[]> {
    const rows = await this.prisma.avatarUnlock.findMany({
      where: { userId, unlockedAt: { gte: from, lte: to } },
      orderBy: { unlockedAt: 'asc' },
    });
    return rows.map((r) => ({
      key: r.avatarKey,
      unlockedAt: r.unlockedAt,
    }));
  }
}

function subDays(d: Date, days: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() - days);
  return out;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Delta en pourcentage signé.
 * - Si la base précédente est 0 et qu'il y a maintenant un montant : 100% (1 baseline arbitraire — pas Infinity, c'est moche en UI)
 * - Si les deux sont 0 : 0%
 * - Sinon : (current - previous) / previous * 100, arrondi à 0.1
 */
function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
