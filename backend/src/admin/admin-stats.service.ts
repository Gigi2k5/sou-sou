import { Injectable } from '@nestjs/common';
import { ReportReason, ReportStatus, ReportTarget, Role } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Décision V3 : les admins sont des observateurs, pas de "vrais" users. On les
 * exclut systématiquement des compteurs (totalUsers, actifs 7j, signups,
 * top contributeurs) pour ne pas fausser les stats publiques. Les agrégats
 * monétaires/articles ne nécessitent pas ce filtre car les admins n'en créent
 * pas dans le flow normal.
 */
const REAL_USERS: { role: Role } = { role: Role.USER };

export interface RecentReportPreview {
  id: string;
  targetType: ReportTarget;
  targetId: string;
  reason: ReportReason;
  status: ReportStatus;
  createdAt: Date;
  reporter: { id: string; name: string; avatarUrl: string | null } | null;
}

export interface AdminOverviewStats {
  totalUsers: number;
  newUsersThisWeek: number;
  /** Pourcentage signé : +15 = +15 %, -3.5 = -3.5 %. 0 si aucune donnée pré. */
  newUsersDelta: number;
  activeUsers7d: number;
  activeUsersDelta: number;
  totalTransactions: number;
  /** Somme des Transaction expense liées à une catégorie SAVINGS ou POT. */
  totalContributions: number;
  /** Somme des Transaction expense en catégorie SAVINGS uniquement. */
  totalSavingsAmount: number;
  totalArticles: number;
  /** Signalements en attente (status = PENDING). */
  pendingReports: number;
  signupsByDay: { date: string; count: number }[];
  activityByDay: {
    date: string;
    transactions: number;
    contributions: number;
  }[];
  recentArticles: {
    id: string;
    title: string;
    slug: string;
    createdAt: Date;
    author: { id: string; name: string; avatarUrl: string | null };
  }[];
  recentReports: RecentReportPreview[];
  topActiveUsers: {
    userId: string;
    name: string;
    avatarUrl: string | null;
    totalActions: number;
  }[];
}

const DAY_MS = 86_400_000;

@Injectable()
export class AdminStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<AdminOverviewStats> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
    const twoWeeksAgo = new Date(now.getTime() - 14 * DAY_MS);
    const monthAgo = new Date(now.getTime() - 30 * DAY_MS);

    const [
      totalUsers,
      newUsersThisWeek,
      newUsersPrevWeek,
      activeUsers7d,
      activeUsersPrev7d,
      totalTransactions,
      contributionsAgg,
      savingsAgg,
      totalArticles,
      pendingReports,
      recentReports,
      signupsRaw,
      transactionsRaw,
      contributionsRaw,
      recentArticles,
      topActions,
    ] = await Promise.all([
      this.prisma.user.count({ where: { ...REAL_USERS } }),
      this.prisma.user.count({
        where: { ...REAL_USERS, createdAt: { gte: weekAgo } },
      }),
      this.prisma.user.count({
        where: { ...REAL_USERS, createdAt: { gte: twoWeeksAgo, lt: weekAgo } },
      }),
      this.prisma.user.count({
        where: { ...REAL_USERS, lastLoginAt: { gte: weekAgo } },
      }),
      this.prisma.user.count({
        where: {
          ...REAL_USERS,
          lastLoginAt: { gte: twoWeeksAgo, lt: weekAgo },
        },
      }),
      this.prisma.transaction.count(),
      this.prisma.transaction.aggregate({
        where: {
          type: 'EXPENSE',
          expenseCategory: { kind: { in: ['SAVINGS', 'POT'] } },
        },
        _sum: { amount: true },
      }),
      this.prisma.transaction.aggregate({
        where: {
          type: 'EXPENSE',
          expenseCategory: { kind: 'SAVINGS' },
        },
        _sum: { amount: true },
      }),
      this.prisma.article.count(),
      this.prisma.report.count({ where: { status: ReportStatus.PENDING } }),
      this.prisma.report.findMany({
        orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          targetType: true,
          targetId: true,
          reason: true,
          status: true,
          createdAt: true,
          reporter: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { ...REAL_USERS, createdAt: { gte: monthAgo } },
        select: { createdAt: true },
      }),
      this.prisma.transaction.findMany({
        where: { date: { gte: monthAgo } },
        select: { date: true, expenseCategoryId: true },
      }),
      this.prisma.transaction.findMany({
        where: {
          date: { gte: monthAgo },
          type: 'EXPENSE',
          expenseCategory: { kind: { in: ['SAVINGS', 'POT'] } },
        },
        select: { date: true },
      }),
      this.prisma.article.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
          author: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      this.prisma.transaction.groupBy({
        by: ['userId'],
        where: { date: { gte: weekAgo }, user: { role: Role.USER } },
        _count: { _all: true },
        orderBy: { _count: { userId: 'desc' } },
        take: 5,
      }),
    ]);

    const topUsers = await this.prisma.user.findMany({
      where: { id: { in: topActions.map((t) => t.userId) } },
      select: { id: true, name: true, avatarUrl: true },
    });
    const topUsersMap = new Map(topUsers.map((u) => [u.id, u]));
    const topActiveUsers = topActions
      .map((t) => {
        const u = topUsersMap.get(t.userId);
        if (!u) return null;
        return {
          userId: u.id,
          name: u.name,
          avatarUrl: u.avatarUrl,
          totalActions: t._count._all,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const signupsByDay = bucketByDay(signupsRaw, (r) => r.createdAt, monthAgo);
    const transactionsByDay = bucketByDay(
      transactionsRaw,
      (r) => r.date,
      monthAgo,
    );
    const contributionsByDay = bucketByDay(
      contributionsRaw,
      (r) => r.date,
      monthAgo,
    );

    const activityByDay = transactionsByDay.map((row) => ({
      date: row.date,
      transactions: row.count,
      contributions:
        contributionsByDay.find((c) => c.date === row.date)?.count ?? 0,
    }));

    return {
      totalUsers,
      newUsersThisWeek,
      newUsersDelta: percentDelta(newUsersThisWeek, newUsersPrevWeek),
      activeUsers7d,
      activeUsersDelta: percentDelta(activeUsers7d, activeUsersPrev7d),
      totalTransactions,
      totalContributions: contributionsAgg._sum.amount ?? 0,
      totalSavingsAmount: savingsAgg._sum.amount ?? 0,
      totalArticles,
      pendingReports,
      signupsByDay,
      activityByDay,
      recentArticles,
      recentReports,
      topActiveUsers,
    };
  }
}

/** Regroupe les rows par jour calendaire YYYY-MM-DD sur 30 jours glissants.
 *  Inclut tous les jours (count=0 pour ceux sans data) pour un graphe continu. */
function bucketByDay<T>(
  rows: T[],
  getDate: (row: T) => Date,
  from: Date,
): { date: string; count: number }[] {
  const counts = new Map<string, number>();
  for (let i = 0; i <= 30; i++) {
    const d = new Date(from.getTime() + i * DAY_MS);
    counts.set(ymd(d), 0);
  }
  for (const row of rows) {
    const k = ymd(getDate(row));
    if (counts.has(k)) {
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function percentDelta(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}
